import { AppState as RNAppState } from "react-native";

import { PATIENT_ID } from "@/lib/config";
import { buildRegistry } from "@/lib/codes";
import { kv } from "@/lib/kv";
import * as M from "@/lib/model";
import { getStore, type DataStore, type Unsub } from "@/lib/store";
import type { AlertDoc, Caregiver, Day, DayData, Entry, Invite, Link, Member, Message, Patient, Presence, PrivateNote } from "@/lib/types";
import { actingAs, get, initialSession, set, useNow } from "./app";
import { toast, run } from "./feedback";

export const store = (): DataStore => getStore();

// patients/{id} of the person being viewed. The Firestore collection is still literally named "shifts" (it
// predates one log per calendar day); everywhere outside this helper a day's log is just "day".
export const PP = () => (get().pid ? `patients/${get().pid}` : "");
export const dayPath = (sid: string) => `${PP()}/shifts/${sid}`;
export const uid = () => get().user!.uid;

const subs = new Map<string, Unsub>();
const ensuring = new Set<string>();
const notesSeen = new Map<string, Set<string>>(); // `${pid}:${sid}` -> ids already seen, so only new messages toast

const emptyDay = (): DayData => ({ day: null, entries: [], priv: [], notes: [], alerts: [], loaded: false });
function patchDay(sid: string, patch: Partial<DayData>) {
  const data = get().data;
  set({ data: { ...data, [sid]: { ...(data[sid] || emptyDay()), ...patch } } });
}

export function dropAll() { subs.forEach(u => u()); subs.clear(); }

// Start the watchers the current state needs and stop the rest (port of the PWA's sync()).
export function sync() {
  const S = get(), st = store();
  const want = new Set<string>();
  const add = (key: string, start: () => Unsub) => { want.add(key); if (!subs.has(key)) subs.set(key, start()); };
  const ready = S.user && (st.demo || S.user.verified);
  if (ready) {
    // Which people does this user look after? An empty list straight from the cache (offline cold start)
    // isn't an answer yet: it would send them to "Let's get started".
    add("links", () => st.watchCol<Link>(`users/${uid()}/patients`, (l, meta) => {
      if (meta.fromCache && !l.length && get().links === undefined) return;
      set({ links: l });
      // A link this device just wrote (adding a patient, joining one) arrives before the server has the matching
      // membership. Opening it then would start reads the rules still refuse, and a refused listener never
      // recovers. The confirmed snapshot follows moments later; act on that one.
      if (!meta.pending) onLinks();
    }, () => { set({ links: [] }); onLinks(); }));
    if (S.pid) {
      const pid = S.pid, pp = PP();
      add(`member:${pid}`, () => st.watchDoc<Member>(`${pp}/members/${uid()}`, (m, meta) => {
        if (pid !== get().pid) return;
        // Only the server can say they've lost access; a cache miss while offline must never unlink them.
        if (!m) { if (!meta.fromCache) lostAccess(); return; }
        const prev = get().member;
        set({ member: m });
        if (!prev) onMember();
        else if (prev.role !== m.role) sync(); // role changed: start or stop the caregiver-only watchers
      }, () => lostAccess()));
      if (S.member) {
        const caregiver = S.member.role === "caregiver";
        add(`patient:${pid}`, () => st.watchDoc<Patient>(pp, (p, meta) => {
          if (!p && meta.fromCache) return;
          set({ patient: p, reg: buildRegistry(p?.codes) });
        }));
        add(`members:${pid}`, () => st.watchCol<Member>(`${pp}/members`, l => set({ members: l })));
        add(`presence:${pid}`, () => st.watchCol<Presence>(`${pp}/presence`, l => set({ presence: l })));
        if (caregiver) add(`roster:${pid}`, () => st.watchCol<Caregiver>(`${pp}/caregivers`, (l, meta) => {
          if (meta.fromCache && !l.length && get().roster === undefined) return;
          set({ roster: [...l].sort((a, b) => a.name.localeCompare(b.name)) });
        }, () => set({ roster: [] })));
        for (const sid of [S.sid, M.prevSid(S.sid)]) { // today + yesterday
          const base = dayPath(sid);
          add(`day:${pid}:${sid}`, () => st.watchDoc<Day>(base, (s, meta) => {
            // "No log for today" only counts once the server has said so.
            patchDay(sid, { day: s, loaded: get().data[sid]?.loaded || !!s || !meta.fromCache });
            afterDay();
          }));
          add(`entries:${pid}:${sid}`, () => st.watchCol<Entry>(`${base}/entries`, l => patchDay(sid, { entries: l.map(e => ({ ...e, sid })) })));
          add(`notes:${pid}:${sid}`, () => st.watchCol<Message>(`${base}/familyNotes`, l => {
            const mapKey = `${pid}:${sid}`, seen = notesSeen.get(mapKey), withSid = l.map(e => ({ ...e, sid }));
            if (seen) { // new messages from anyone but this login: family on the care devices, caregiver replies on family devices
              withSid.filter(n => !seen.has(n.id) && n.uid !== uid()).forEach(n => toast(`💬 ${M.firstName(n.who)}: ${n.text}`.slice(0, 160)));
            }
            notesSeen.set(mapKey, new Set(withSid.map(n => n.id)));
            patchDay(sid, { notes: withSid });
            onNotes?.();
          }));
          add(`alerts:${pid}:${sid}`, () => st.watchCol<AlertDoc>(`${base}/alerts`, l => patchDay(sid, { alerts: l.map(e => ({ ...e, sid })) })));
          if (caregiver) add(`priv:${pid}:${sid}`, () => st.watchCol<PrivateNote>(`${base}/privateNotes`, l => patchDay(sid, { priv: l })));
        }
      }
    }
  }
  for (const [k, unsub] of subs) if (!want.has(k)) { unsub(); subs.delete(k); }
}

// The Messages screen registers this so a message arriving in the open conversation counts as read.
let onNotes: (() => void) | null = null;
export const setOnNotes = (f: (() => void) | null) => { onNotes = f; };

// ---- which people does this person look after, and which one is open ----
async function onLinks() {
  const S = get();
  if (S.links === undefined || !S.user) return;
  if (!S.links.length && !S.legacyChecked) {
    // Logs made before multi-patient support live at patients/garth: link them in automatically.
    set({ legacyChecked: true });
    try {
      const m = await store().getDoc<Member>(`patients/${PATIENT_ID}/members/${uid()}`);
      if (m) {
        const pat = await store().getDoc<Patient>(`patients/${PATIENT_ID}`);
        const link = { name: pat?.name || "Patient", role: m.role, at: Date.now() };
        try { await store().setDoc(`users/${uid()}/patients/${PATIENT_ID}`, link); return; } // the links watcher fires again
        catch { // security rules not updated yet: still open the existing log rather than stranding it
          set({ links: [{ id: PATIENT_ID, ...link }] });
          selectPatient(PATIENT_ID);
          return;
        }
      }
    } catch { /* not a member there: carry on */ }
  }
  if (get().pendingInvites === undefined) loadPendingInvites();
  if (!get().pid) {
    const links = get().links || [];
    const saved = kv.get<string | null>(`gl:pid:${uid()}`, null);
    const pick = links.find(l => l.id === saved) || (links.length === 1 ? links[0] : null);
    if (pick) selectPatient(pick.id);
  }
}

export async function loadPendingInvites() {
  set({ pendingInvites: [] });
  const { email, phone } = get().user || {};
  // Each lookup fails on its own (rules deny a list for a claim the account doesn't have), so one can't sink the other.
  const load = (path: string) => store().getCol<Invite>(path).catch(() => [] as Invite[]);
  const [byEmail, byPhone] = await Promise.all([
    email ? load(`invitesByEmail/${email}/for`) : [],
    phone ? load(`invitesByPhone/${phone}/for`) : [],
  ]);
  const seen = new Set<string>();
  set({ pendingInvites: [...byEmail, ...byPhone].filter(i => !seen.has(i.id) && !!seen.add(i.id)) });
}

export function selectPatient(pid: string | null) {
  set({
    pid, member: undefined, patient: undefined, roster: undefined, members: [], presence: [], data: {},
    pinFor: null, pin: "", pinError: "", cgForm: null, edit: null, codeForm: null, thread: null, replyTo: null,
    reg: buildRegistry(), // until this patient's own list arrives
    target: null, pendingCodes: [], trends: null, follow: true, sid: M.sidAt(Date.now()),
    place: "", pain: "—", details: false, // half-filled entries belong to the patient they were started for
    pickerOpen: false, addingPatient: false, modal: null, medForm: null,
    drafts: pid && get().user ? kv.get(`gl:drafts:${get().user!.uid}:${pid}`, {}) : {},
    viewAs: pid && get().user ? kv.get(`gl:view:${get().user!.uid}:${pid}`, null) : null,
  });
  ensuring.clear();
  if (get().user) {
    if (pid) kv.set(`gl:pid:${uid()}`, pid); else kv.del(`gl:pid:${uid()}`);
  }
  sync();
}

// The membership doc vanished (owner removed them, or the patient was never theirs): back to the list.
function lostAccess() {
  const pid = get().pid;
  if (!pid) return;
  const name = get().links?.find(l => l.id === pid)?.name;
  run(store().remove(`users/${uid()}/patients/${pid}`));
  selectPatient(null);
  toast(`You no longer have access${name ? " to " + name : ""}.`);
}

export const welcomeKey = () => {
  const S = get();
  return actingAs(S) === "care" ? `gl:welcomed:cg:${S.patient?.onShift?.cid}` : `gl:welcomed:${uid()}`;
};

function onMember() {
  const S = get();
  // One short tour, first time only (caregivers get theirs on their first shift).
  if (actingAs(S) === "family" && !kv.get(welcomeKey(), false) && !S.modal) set({ modal: "welcome" });
  sync();
  lastBeat = 0;
  beat();
}

function afterDay() {
  const S = get(), D = S.data[S.sid];
  if (!D?.loaded || S.member?.role !== "caregiver") return;
  if (!D.day && !ensuring.has(S.sid)) { // the first caregiver to open today creates its log
    ensuring.add(S.sid);
    const info = M.dayInfo(S.sid);
    run(store().setDoc(dayPath(S.sid), { sid: S.sid, date: info.date, start: info.start, meds: {}, createdAt: Date.now() }));
  }
}

// ---- presence: "N family watching" -------------------------------------------------------
let lastBeat = 0;
export function beat() {
  const S = get();
  if (!S.member || !S.pid || RNAppState.currentState !== "active" || Date.now() - lastBeat < 5000) return;
  lastBeat = Date.now();
  store().setDoc(`${PP()}/presence/${uid()}`, { name: actingAs(S) === "care" ? S.patient?.onShift?.name || S.member.name : S.member.name, role: actingAs(S) === "care" ? "caregiver" : "family", lastSeen: Date.now() }).catch(() => {});
}

// ---- viewing a day ----
export function viewDay(sid: string, follow: boolean) {
  set({ follow, sid, target: null, pendingCodes: [] });
  sync();
}

// ---- boot and lifecycle ---------------------------------------------------------------------
let booted = false;
export function boot() {
  if (booted) return;
  booted = true;
  const st = store();
  st.onAuth(u => {
    if (u) {
      set({ authReady: true, user: u, msgReadAt: kv.get(`gl:msgRead:${u.uid}`, {}), threadRead: kv.get(`gl:threadRead:${u.uid}`, {}) });
    } else {
      dropAll();
      ensuring.clear();
      set({ authReady: true, user: null, ...initialSession() });
    }
    sync();
  });
  st.onStatus(s => set({ status: s }));

  // Ten-second clock: countdowns, "5 min ago", and flipping to the new day at midnight.
  setInterval(() => {
    const now = Date.now();
    useNow.setState({ now });
    const S = get();
    if (S.follow) {
      const cur = M.sidAt(now);
      if (cur !== S.sid) viewDay(cur, true);
    }
  }, 10000);
  // …and exactly on each 15-minute boundary, so the highlighted box never lags the box a save goes into.
  const atBoundary = () => setTimeout(() => { useNow.setState({ now: Date.now() }); atBoundary(); }, M.SLOT_MS - (Date.now() % M.SLOT_MS) + 50);
  atBoundary();
  setInterval(beat, 30000);

  let hiddenAt = 0;
  RNAppState.addEventListener("change", state => {
    if (state === "background" || state === "inactive") {
      if (!hiddenAt) { hiddenAt = Date.now(); kv.set("gl:lastVisit", hiddenAt); }
      return;
    }
    if (state === "active") {
      if (hiddenAt) set({ lastVisit: hiddenAt }); // things that arrived while you were away are "new"
      hiddenAt = 0;
      useNow.setState({ now: Date.now() });
      const S = get();
      if (S.follow && M.sidAt(Date.now()) !== S.sid) viewDay(M.sidAt(Date.now()), true);
      lastBeat = 0;
      beat();
    }
  });
}
