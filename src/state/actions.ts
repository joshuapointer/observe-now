// Every user action from the PWA's `acts` and `forms`, as plain functions the screens call.
import { getLocales } from "expo-localization";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";

import { canRecord } from "@/lib/billing";
import { SECTIONS, SYSTEM_CODES, alertKind, FALL_QUESTIONS, type Code } from "@/lib/codes";
import { kv } from "@/lib/kv";
import * as M from "@/lib/model";
import { looksLikeEmail, toE164 } from "@/lib/phone";
import { pinHash } from "@/lib/pin";
import type { Caregiver, Entry, Invite } from "@/lib/types";
import { actingAs, get, set, useNow, type Acting, type AppState, type Drafts, type ModalId, type Settings } from "./app";
import { ask, clearToast, run, toast } from "./feedback";
import { PP, dayPath, dropAll, loadPendingInvites, selectPatient, store, sync, uid, viewDay, welcomeKey } from "./session";
import { compute, type Thread } from "./view";

const V = () => compute(get(), Date.now());
const tap = () => Haptics.selectionAsync().catch(() => {});
const done = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

// ---- drafts (kept per patient, so a half-typed note survives the app closing) ----
// Keyed by login as well as patient, so another account on a shared device never gets someone else's half-typed text.
export const draftsKey = (uid: string, pid: string) => `gl:drafts:${uid}:${pid}`;
const saveDrafts = () => { const S = get(); if (S.pid && S.user) kv.set(draftsKey(S.user.uid, S.pid), S.drafts); };
export function setDraft(k: keyof Drafts, v: string) { set({ drafts: { ...get().drafts, [k]: v } }); saveDrafts(); }
function clearDrafts(...ks: (keyof Drafts)[]) {
  const drafts = { ...get().drafts };
  ks.forEach(k => delete drafts[k]);
  set({ drafts }); saveDrafts();
}

const isCaregiver = () => get().member?.role === "caregiver";
const onShift = () => get().patient?.onShift || null;
// `by` is the signed-in (shared device) account; byName/cid say which caregiver was actually on shift.
const byFields = () => { const s = onShift(); return s ? { by: uid(), byName: s.name, cid: s.cid, shiftId: s.id } : { by: uid() }; };
const entryPath = (sid: string, key: string) => `${dayPath(sid)}/entries/${key}`;
const strip = ({ id: _id, sid: _sid, ...rest }: Entry) => rest;

// safety: a fall (and its report) is always allowed, even when the log's subscription has lapsed.
function guard(safety = false) {
  if (!isCaregiver() || !onShift()) return false;
  if (get().sid !== M.sidAt(Date.now())) { toast("Go back to today to record."); return false; }
  if (!safety && !canRecord(V().billing)) { set({ modal: "paywall" }); return false; }
  return true;
}

// ---- settings ----
export function setSetting<K extends keyof Settings>(k: K, v: Settings[K]) {
  const settings = { ...get().settings, [k]: v };
  set({ settings });
  kv.set("gl:settings", settings);
}

export const openModal = (modal: ModalId) => set({ modal });
export function closeModal() {
  const S = get();
  if (S.modal === "welcome") kv.set(welcomeKey(), true);
  if (S.modal === "record") return closeRecord();
  set({ modal: null, medForm: null, cgForm: S.modal === "caregivers" ? null : S.cgForm, edit: null, replyTo: S.modal === "compose" ? null : S.replyTo });
}

// ---- the day being viewed ----
export const viewYesterday = () => viewDay(M.prevSid(M.sidAt(Date.now())), false);
export const viewToday = () => viewDay(M.sidAt(Date.now()), true);

// ---- Record screen ----
export function tapSlot(key: string) {
  if (!guard()) return;
  const v = V(), idx = Array.from({ length: v.info.slots }, (_, i) => M.slotKey(v.info, i)).indexOf(key);
  if (v.info.start + idx * M.SLOT_MS > Date.now()) return toast("That time hasn't come yet.");
  set({ target: key === v.d.curKey ? null : key, modal: "record" });
  tap();
}

// The record sheet: what's happening, for the current box (or the one chosen from the timeline).
export function openRecord() {
  if (!guard()) return;
  set({ modal: "record" });
}
// Closing the sheet keeps anything already chosen, so a stray swipe doesn't lose it; Cancel clears it.
export function closeRecord() {
  set({ modal: null, ...(get().pendingCodes.length ? {} : { target: null, details: false }) });
}
// One tap on a "used lately" code saves it straight into the current box (with Undo).
export function quickRecord(code: string) {
  if (code === "FL") { if (guard(true)) confirmFall(); return; }
  if (!guard()) return;
  set({ pendingCodes: [code], target: null });
  commit();
}

export function pick(code: string) {
  if (code === "FL") { if (guard(true)) confirmFall(); return; }
  if (!guard()) return;
  const cur = get().pendingCodes;
  set({ pendingCodes: cur.includes(code) ? cur.filter(c => c !== code) : [...cur, code] });
  tap();
}
export const unpick = (code: string) => set({ pendingCodes: get().pendingCodes.filter(c => c !== code) });
export const toggleDetails = () => set({ details: !get().details });
export const setPlace = (v: string) => set({ place: get().place === v ? "" : v });
export const setPain = (v: string) => set({ pain: get().pain === v ? "—" : v });
export function cancelPending() {
  set({ pendingCodes: [], target: null, place: "", pain: "—", details: false, modal: null });
  clearDrafts("note");
}
export function backfillNext() {
  const v = V();
  if (v.missed.length) set({ target: v.missed[0], pendingCodes: [], modal: "record" });
}

// FL asks first, so a stray tap can't alarm everyone.
async function confirmFall() {
  const v = V();
  if (!(await ask({ title: "Send a fall alert to family now?", body: "Everyone who is watching gets a red alert straight away. You'll finish the fall report on the next screen.", yes: `Yes — ${v.ctx.name} had a fall`, no: "No, cancel", destructive: true }))) return;
  markFall();
}

async function markFall() {
  if (!guard(true)) return;
  const v = V(), now = Date.now(), S = get();
  if (v.info.start + v.targetIdx * M.SLOT_MS > now) return toast("That time hasn't come yet.");
  const existing = v.d.byKey[v.key], alertId = store().newId(`${dayPath(S.sid)}/alerts`);
  // Union with whatever was already selected or already saved for this box — a fall never discards other codes.
  const codes = Array.from(new Set([...M.entryCodes(existing), ...S.pendingCodes, "FL"]));
  const data = { slot: v.targetIdx, slotStart: v.info.start + v.targetIdx * M.SLOT_MS, codes, place: existing?.place || S.place || "", pain: existing?.pain || "—", note: existing?.note || "", markedAt: now, ...byFields(), ...(existing?.med ? { med: true } : {}) };
  const answers = Object.fromEntries(FALL_QUESTIONS.map(([q]) => [q, null]));
  set({ pendingCodes: [], target: null, place: "", pain: "—", details: false, modal: null });
  clearDrafts("fallNarr", "note");
  router.navigate("/fall");
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  run(store().batch([
    { path: entryPath(S.sid, v.key), data, merge: true },
    { path: `${dayPath(S.sid)}/alerts/${alertId}`, data: { kind: "fall", code: "FL", text: M.alertText("fall", v.ctx), at: now, entryKey: v.key, acks: {} }, merge: false },
    { path: dayPath(S.sid), data: { fall: { at: now, slotKey: v.key, alertId, answers, narrative: "", filedAt: null } } },
  ]));
}

export async function commit() {
  const S = get();
  if (!guard() || !S.pendingCodes.length) return;
  const v = V(), now = Date.now();
  if (v.info.start + v.targetIdx * M.SLOT_MS > now) return toast("That time hasn't come yet.");
  const existing = v.d.byKey[v.key], kind = v.pendingAlertKind;
  // Add the newly-picked codes to anything already saved for this box; only overwrite place/pain/note if this
  // pass set them, so re-opening a box to add a second code doesn't wipe out the first one's details.
  const codes = Array.from(new Set([...M.entryCodes(existing), ...S.pendingCodes]));
  const place = S.place || existing?.place || "";
  const pain = S.pain !== "—" ? S.pain : existing?.pain || "—";
  const typed = (S.drafts.note || "").trim();
  const note = typed ? (existing?.note ? M.sentence(existing.note) + " " + typed : typed) : existing?.note || "";
  const data = { slot: v.targetIdx, slotStart: v.info.start + v.targetIdx * M.SLOT_MS, codes, place, pain, note, markedAt: now, ...byFields(), ...(existing?.med ? { med: true } : {}) };
  const ops = [{ path: entryPath(S.sid, v.key), data, merge: true }];
  if (kind) {
    const triggerCode = S.pendingCodes.find(c => alertKind(c, S.pain) === kind) || S.pendingCodes[0];
    ops.push({ path: `${dayPath(S.sid)}/alerts/${store().newId(`${dayPath(S.sid)}/alerts`)}`, data: { kind, code: triggerCode, text: M.alertText(kind, v.ctx, { pain: S.pain }), at: now, entryKey: v.key, acks: {} } as never, merge: false });
  }
  set({ pendingCodes: [], target: null, place: "", pain: "—", details: false, modal: get().modal === "record" ? null : get().modal });
  clearDrafts("note");
  done();
  const path = entryPath(S.sid, v.key), prev = existing && strip(existing);
  run(store().batch(ops));
  // Marks that raised an alert can't be quietly taken back; everything else can — undo restores exactly what was there.
  toast(kind ? "Saved — red alert sent to family" : `Saved ${M.hhmm(data.slotStart)}`,
    kind ? null : () => (prev ? store().setDoc(path, prev, false) : store().remove(path)));
}

export function undo() {
  const fn = get().undo;
  clearToast();
  if (fn) { run(fn()); toast("Undone"); }
}

// ---- changing or removing an entry from your own shift ----
// FL and PH already sent a red alert (and FL started a fall report), so they can't be quietly taken back.
export const LOCKED_CODES = ["FL", "PH"];
const findEntry = (sid: string, id: string) => (get().data[sid]?.entries || []).find(e => e.id === id);
const editable = (e: Entry | undefined) => !!e && isCaregiver() && !!onShift() && e.shiftId === onShift()!.id;

export function editEntry(sid: string, id: string) {
  const e = findEntry(sid, id);
  if (!e || !editable(e)) return toast("You can only change entries from your own shift.");
  set({ edit: { sid: e.sid, id: e.id, codes: M.entryCodes(e), med: !!e.med, place: e.place || "", pain: e.pain || "—", note: e.note || "" }, modal: "edit-entry", pendingCodes: [], target: null });
}
export function editUncode(c: string) {
  const ed = get().edit;
  if (!ed || LOCKED_CODES.includes(c)) return;
  set({ edit: { ...ed, codes: ed.codes.filter(x => x !== c), med: c === "MD" ? false : ed.med } }); // a medicine can be flagged without its MD code
}
export const editField = (k: "place" | "pain" | "note", v: string) => {
  const ed = get().edit;
  if (!ed) return;
  const next = k === "note" ? v : ed[k] === v ? (k === "pain" ? "—" : "") : v;
  set({ edit: { ...ed, [k]: next } });
};

export async function saveEdit(del: boolean) {
  const ed = get().edit, e = ed && findEntry(ed.sid, ed.id);
  if (!ed || !e || !editable(e)) { set({ edit: null, modal: null }); return toast("That entry can't be changed any more."); }
  const note = ed.note.trim();
  let codes = ed.codes;
  if (!del && !codes.length && !note) {
    if (ed.med) codes = ["MD"]; else del = true;
  }
  if (del && M.entryCodes(e).some(c => LOCKED_CODES.includes(c))) return toast("This entry sent a red alert to family, so it can't be deleted.");
  const when = M.hhmm(e.slotStart);
  if (del && !(await ask({ title: `Delete the ${when} entry?`, body: "It disappears from the log and from what family see.", yes: "Yes, delete it", destructive: true }))) return;
  const path = entryPath(ed.sid, ed.id), prev = strip(e);
  // A medicine given in this box is un-recorded along with its MD entry, so the list shows it as not given.
  const dropMed = !!e.med && (del || !ed.med);
  const meds = dropMed ? Object.entries(get().data[ed.sid]?.day?.meds || {}).filter(([, t]) => typeof t === "number" && t >= e.slotStart && t < e.slotStart + M.SLOT_MS) : [];
  const medOps = (vals: boolean) => (meds.length ? [{ path: dayPath(ed.sid), data: { meds: Object.fromEntries(meds.map(([n, t]) => [n, vals ? t : null])) } }] : []);
  set({ edit: null, modal: null });
  if (del) {
    run(Promise.all([store().remove(path), medOps(false).length ? store().batch(medOps(false)) : null]));
  } else {
    const { med: _med, ...rest } = prev;
    const data = { ...(dropMed ? rest : prev), codes, place: ed.place, pain: ed.pain, note, editedAt: Date.now(), editedBy: onShift()!.name };
    run(store().batch([{ path, data, merge: false }, ...medOps(false)]));
  }
  toast(del ? `${when} entry deleted` : `${when} entry changed`, () => store().batch([{ path, data: prev, merge: false }, ...medOps(true)]));
}

// ---- medicines and notes ----
export async function giveMed(name: string) {
  if (!guard()) return;
  const v = V(), now = Date.now(), key = v.d.curKey, i = v.d.cur, existing = v.d.byKey[key], S = get();
  const data = M.entryCodes(existing).length
    ? { med: true }
    : { slot: i, slotStart: v.info.start + i * M.SLOT_MS, codes: ["MD"], place: "", pain: "—", note: "", markedAt: now, ...byFields(), med: true };
  done();
  run(store().batch([
    { path: dayPath(S.sid), data: { meds: { [name]: now } } },
    { path: entryPath(S.sid, key), data },
  ]));
  toast(`${name} recorded at ${M.hhmm(now)}`);
}

export function addPhrase(text: string) {
  setDraft("noteScreen", ((get().drafts.noteScreen || "").trim() + " " + text + ". ").trimStart());
}

export async function saveNote(privateOnly: boolean) {
  if (!guard()) return;
  const text = (get().drafts.noteScreen || "").trim();
  if (!text) return toast("Type a note first.");
  const v = V(), key = v.d.curKey, existing = v.d.byKey[key], S = get();
  const join = (old?: string) => (old ? M.sentence(old) + " " : "") + text;
  clearDrafts("noteScreen");
  if (privateOnly) {
    run(store().setDoc(`${dayPath(S.sid)}/privateNotes/${key}`, { note: join(v.D.priv.find(p => p.id === key)?.note), at: Date.now(), ...byFields() }));
    toast("Note saved — family can't see it");
  } else if (existing) {
    run(store().setDoc(entryPath(S.sid, key), { note: join(existing.note) }));
    toast("Note saved — family can see it");
  } else {
    run(store().setDoc(entryPath(S.sid, key), { slot: v.d.cur, slotStart: v.info.start + v.d.cur * M.SLOT_MS, codes: [], place: "", pain: "—", note: text, markedAt: Date.now(), ...byFields() }));
    toast("Note saved — family can see it");
  }
}

export function editMeds() { set({ modal: "meds", medForm: null }); }
export function medNew() { set({ medForm: { idx: -1, name: "", dose: "", sched: "", dueAt: "", asNeeded: false } }); }
export function medEdit(i: number) {
  const m = V().meds[i];
  if (m) set({ medForm: { idx: i, name: m.name, dose: m.dose || "", sched: m.sched || "", dueAt: m.dueAt || "", asNeeded: !!m.asNeeded } });
}
export const medField = (k: "name" | "dose" | "sched" | "dueAt", v: string) => { const f = get().medForm; if (f) set({ medForm: { ...f, [k]: v } }); };
export const medToggleNeeded = () => { const f = get().medForm; if (f) set({ medForm: { ...f, asNeeded: !f.asNeeded } }); };
export const medCancel = () => set({ medForm: null });
export async function medRemove(i: number) {
  const meds = V().meds, m = meds[i];
  if (!m) return;
  if (!(await ask({ title: `Remove ${m.name}?`, body: "It will no longer appear on the medicines list. Anything already recorded is kept.", yes: "Yes, remove it", destructive: true }))) return;
  set({ medForm: null });
  run(store().setDoc(PP(), { meds: meds.filter((_, j) => j !== i) }));
  toast(`${m.name} removed`);
}
export function medSave() {
  const m = get().medForm;
  if (!m) return;
  const name = m.name.trim();
  if (!name) return toast("Type the medicine's name first.");
  const meds = [...V().meds];
  if (meds.some((x, i) => i !== m.idx && x.name.toLowerCase() === name.toLowerCase())) return toast(`${name} is already on the list.`);
  const med = { name, dose: m.dose.trim(), sched: m.sched.trim() || m.dueAt || (m.asNeeded ? "if needed" : ""), ...(m.asNeeded ? { asNeeded: true } : {}), ...(m.dueAt && !m.asNeeded ? { dueAt: m.dueAt } : {}) };
  if (m.idx >= 0) meds[m.idx] = med; else meds.push(med);
  set({ medForm: null });
  run(store().setDoc(PP(), { meds }));
  toast(m.idx >= 0 ? `${name} updated` : `${name} added`);
}

// ---- fall report ----
export function fallAnswer(q: string, a: string) {
  if (!isCaregiver()) return;
  const cur = V().day?.fall?.answers?.[q];
  run(store().setDoc(dayPath(get().sid), { fall: { answers: { [q]: cur === a ? null : a } } }));
}
let fallTimer: ReturnType<typeof setTimeout> | undefined;
// The fall note is the record: saved as it is typed.
export function setFallNarrative(text: string) {
  setDraft("fallNarr", text);
  clearTimeout(fallTimer);
  const path = dayPath(get().sid); // resolved now, so a patient switch within the delay can't redirect it
  fallTimer = setTimeout(() => run(store().setDoc(path, { fall: { narrative: text } })), 600);
}
export async function fileFall() {
  const v = V(), f = v.day?.fall;
  clearTimeout(fallTimer); // the narrative is saved with the report below
  if (!f || f.filedAt) return;
  if (!(await ask({ title: "Send the fall report to family?", body: "Everyone on the log will get it straight away.", yes: "Yes, send it" }))) return;
  const now = Date.now(), sid = get().sid;
  run(store().batch([
    { path: `${dayPath(sid)}/alerts/${store().newId(`${dayPath(sid)}/alerts`)}`, data: { kind: "fall-note", code: "FL", text: M.fallSummary(f, v.ctx), at: now, acks: {} }, merge: false },
    { path: dayPath(sid), data: { fall: { filedAt: now, narrative: get().drafts.fallNarr ?? f.narrative ?? "" } } },
  ]));
  toast("Fall report sent to family");
}

// ---- trends ----
export async function loadTrends() {
  // Offline, the memory cache has at most today and yesterday: an honest message beats a week of empty nights.
  if (!get().status.online && !store().demo) {
    set({ trends: { nights: [], summary: { stats: [], insights: ["Couldn't load the last seven nights. Check the internet connection and try again."] } } });
    return;
  }
  set({ trends: { loading: true } });
  try {
    const nights = await M.loadNights(store(), PP(), Date.now());
    set({ trends: { nights, summary: M.trendSummary(nights, V().ctx) } });
  } catch (e) {
    console.error(e);
    set({ trends: { nights: [], summary: { stats: [], insights: ["Couldn't load the last seven nights."] } } });
  }
}

// ---- shifts: the shared device stays signed in; whoever is on duty picks their name and enters their PIN ----
function clearWorkInProgress() {
  set({ pendingCodes: [], target: null, place: "", pain: "—", details: false, edit: null });
  // Everything half-typed goes with the caregiver who typed it, so the next one can't send it under their name.
  clearDrafts("note", "noteScreen", "reply", "newmsg");
}

export const pickCaregiver = (id: string) => set({ pinFor: id, pin: "", pinError: "", cgForm: null });
export const pinCancel = () => set({ pinFor: null, pin: "", pinError: "" });
export const pinBack = () => set({ pin: get().pin.slice(0, -1) });
export function pinKey(k: string) {
  const S = get();
  if (S.pin.length >= 4) return;
  set({ pin: S.pin + k, pinError: "" });
  tap();
  if (S.pin.length + 1 === 4) checkPin();
}

async function checkPin() {
  const S = get(), cg = S.roster?.find(c => c.id === S.pinFor);
  if (!cg) return;
  if (cg.pin && (await pinHash(cg.id, S.pin)) !== cg.pin) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    set({ pin: "", pinError: "That PIN isn't right. Try again." });
    return;
  }
  startShift(cg);
}

function startShift(cg: Caregiver) {
  const id = store().newId(`${PP()}/shiftLog`), since = Date.now();
  set({ pinFor: null, pin: "", pinError: "", cgForm: null });
  clearWorkInProgress();
  run(store().batch([
    { path: `${PP()}/shiftLog/${id}`, data: { cid: cg.id, name: cg.name, startedAt: since, endedAt: null }, merge: false },
    { path: PP(), data: { onShift: { id, cid: cg.id, name: cg.name, since } } },
  ]));
  if (!kv.get(`gl:welcomed:cg:${cg.id}`, false)) set({ modal: "welcome" });
  toast(`Shift started. Hello, ${M.firstName(cg.name)}.`);
}

export async function endShift() {
  const s = onShift();
  if (!s) return;
  if (!(await ask({ title: `End ${M.firstName(s.name)}'s shift?`, body: "The next caregiver will pick their name to start theirs. Everything recorded is kept.", yes: "Yes, end the shift" }))) return;
  set({ modal: null });
  closeShift(s);
}

function closeShift(s: NonNullable<ReturnType<typeof onShift>>) {
  clearWorkInProgress();
  run(store().batch([
    { path: `${PP()}/shiftLog/${s.id}`, data: { endedAt: Date.now() } },
    { path: PP(), data: { onShift: null } },
  ]));
  toast(`${M.firstName(s.name)}'s shift has ended.`);
}

export const cgNew = () => set({ cgForm: { id: null, name: "" }, pinFor: null });
export const cgEdit = (id: string) => { const c = get().roster?.find(x => x.id === id); if (c) set({ cgForm: { id: c.id, name: c.name } }); };
export const cgCancel = () => set({ cgForm: null });
export async function cgRemove(id: string) {
  const c = get().roster?.find(x => x.id === id);
  if (!c) return;
  if (onShift()?.cid === c.id) return toast(`${M.firstName(c.name)} is on shift now. End the shift first.`);
  if (!(await ask({ title: `Remove ${c.name}?`, body: "They won't be able to start a shift on this device. Everything they recorded is kept.", yes: "Yes, remove", destructive: true }))) return;
  set({ cgForm: null });
  run(store().remove(`${PP()}/caregivers/${c.id}`));
  toast(`${c.name} removed`);
}
export async function cgSave(nameIn: string, pinIn: string) {
  const S = get(), form = S.cgForm || { id: null };
  const name = nameIn.trim(), pin = pinIn.trim();
  if (!name) return toast("Type their name first.");
  if ((S.roster || []).some(c => c.id !== form.id && c.name.toLowerCase() === name.toLowerCase())) return toast(`${name} is already on the list.`);
  if (!form.id && !/^\d{4}$/.test(pin)) return toast("Choose a 4-digit PIN.");
  if (pin && !/^\d{4}$/.test(pin)) return toast("The PIN needs to be 4 digits.");
  const id = form.id || store().newId(`${PP()}/caregivers`);
  const data = { name, ...(pin ? { pin: await pinHash(id, pin) } : {}), ...(form.id ? {} : { createdAt: Date.now() }) };
  set({ cgForm: null });
  run(store().setDoc(`${PP()}/caregivers/${id}`, data));
  toast(form.id ? `${name} updated` : S.modal === "caregivers" ? `${name} added` : `${name} added. Tap your name to start your shift.`);
}

// ---- codes ----
// The whole list is saved on the patient each time, so family phones always get the same wording.
const saveCodes = (list: Code[]) => run(store().setDoc(PP(), { codes: list }));
export const codeNew = () => set({ codeForm: { id: null, short: "", abbr: "", long: "", section: SECTIONS[0].id } });
export function codeEdit(id: string) {
  const c = get().reg.CODE[id];
  if (c) set({ codeForm: { id: c.id, short: c.short || "", abbr: c.abbr || "", long: c.long || "", section: c.section } });
}
export const codeCancel = () => set({ codeForm: null });
export async function codeRemove(id: string) {
  const reg = get().reg, c = reg.CODE[id];
  if (!c || SYSTEM_CODES[c.id]) return;
  const label = M.codeText(c.id, V().ctx);
  if (!(await ask({ title: `Remove “${label}”?`, body: "It won't be offered on the Record screen any more. Past entries keep it, and you can put it back.", yes: "Yes, remove it", destructive: true }))) return;
  set({ codeForm: null });
  await saveCodes(reg.LIST.map(x => (x.id === c.id ? { ...x, archived: true } : x)));
  toast(`“${label}” removed`);
}
export async function codeRestore(id: string) {
  const reg = get().reg, c = reg.CODE[id];
  if (!c) return;
  if (c.abbr && reg.LIST.some(x => !x.archived && x.id !== c.id && x.abbr?.toLowerCase() === c.abbr!.toLowerCase())) return toast(`Another code already uses ${c.abbr}. Change that one first.`);
  const restored = { ...c };
  delete restored.archived;
  // A built-in that was never on the saved list comes back by being added to it.
  const list = reg.LIST.some(x => x.id === c.id) ? reg.LIST.map(x => (x.id === c.id ? restored : x)) : [...reg.LIST, restored];
  await saveCodes(list);
  toast(`“${M.codeText(c.id, V().ctx)}” is back`);
}
export async function codeSave(v: { short: string; abbr: string; long: string; section: string }) {
  const form = get().codeForm, reg = get().reg;
  if (!form) return;
  const short = v.short.trim(), abbr = v.abbr.trim(), long = v.long.trim();
  const section = (SECTIONS.some(x => x.id === v.section) ? v.section : SECTIONS[0].id) as Code["section"];
  if (!short) return toast("Type a short description first.");
  if (abbr && reg.LIST.some(x => !x.archived && x.id !== form.id && x.abbr?.toLowerCase() === abbr.toLowerCase())) return toast(`${abbr} is already used by another code.`);
  const next = { short, abbr, long, section };
  const list = form.id
    ? reg.LIST.map(x => (x.id === form.id ? { ...x, ...next } : x))
    : [...reg.LIST, { id: `c_${store().newId(`${PP()}/codes`)}`, ...next }];
  set({ codeForm: null });
  await saveCodes(list);
  toast(form.id ? `“${short}” updated` : `“${short}” added`);
}

// ---- patient details and family ----
export function saveDetails(v: { name: string; careSetting: string; onCallPhone: string }) {
  const name = v.name.trim(), S = get();
  if (!name) return toast("Their name can't be empty.");
  run(store().batch([
    { path: PP(), data: { name, careSetting: v.careSetting.trim() || "Home, 24-hour care", onCallPhone: v.onCallPhone.replace(/[^\d+ ()-]/g, "").trim() } },
    ...(S.links?.some(l => l.id === S.pid) ? [{ path: `users/${uid()}/patients/${S.pid}`, data: { name } }] : []),
  ]));
  set({ modal: null });
  toast("Details saved");
}

const region = () => getLocales()[0]?.regionCode ?? null;

// Filed by whichever the invitee will sign in with: invitesByEmail/{email} or invitesByPhone/{+E.164}.
export function invite(v: { contact: string; name: string; relation: string; detail: string }) {
  const S = get(), raw = v.contact.trim();
  let path: string, shown: string;
  if (looksLikeEmail(raw)) {
    const email = raw.toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast("That doesn't look like an email address. Check it for typos."); return false; }
    path = `invitesByEmail/${email}`; shown = `${email}. They sign up with that email address.`;
  } else {
    const phone = toE164(raw, region());
    if (!phone) { toast("Type their email address, or their mobile number with its country code (like +44 7700 900123)."); return false; }
    path = `invitesByPhone/${phone}`; shown = `${phone}. They sign in with that mobile number.`;
  }
  if (!v.name.trim()) { toast("Type their name first."); return false; }
  const invitePath = `${path}/for/${S.pid}`;
  run(store().batch([
    { path: invitePath, data: { role: "family", digestOnly: false, name: v.name.trim(), relation: v.relation.trim(), detail: v.detail.trim(), patientName: S.patient?.name || "", invitedBy: uid(), at: Date.now() }, merge: false },
    // Kept on the patient too, so deleting the log can withdraw it.
    { path: `${PP()}/invitations/${store().newId(`${PP()}/invitations`)}`, data: { path: invitePath, at: Date.now() }, merge: false },
  ]));
  toast(`Invited ${shown}`);
  return true;
}

export const ackAlert = (sid: string, id: string) =>
  run(store().setDoc(`${dayPath(sid)}/alerts/${id}`, { acks: { [uid()]: { at: Date.now(), name: get().member!.name } } }));
export const reveal = (id: string) => set({ revealed: { ...get().revealed, [id]: !get().revealed[id] } });

// ---- messages ----
// Messages are stored in each day's "familyNotes" (the name predates replies). Returns the new id.
function sendMessage(sid: string, data: Record<string, unknown>) {
  const col = `${dayPath(sid)}/familyNotes`, id = store().newId(col);
  run(store().setDoc(`${col}/${id}`, { ...data, uid: uid(), at: Date.now() }, false));
  return id;
}

export const openThreadId = () => {
  const S = get();
  if (S.thread === "new") return null;
  const threads = V().threads;
  return (threads.find(t => t.root.id === S.thread) || threads[0])?.root.id || null;
};
export function markThreadRead(id: string | null) {
  const t = id ? V().threads.find(x => x.root.id === id) : null;
  if (!t) return;
  // max() with the newest message guards against another device's clock running ahead of this one
  const threadRead = { ...get().threadRead, [t.root.id]: Math.max(Date.now(), ...[t.root, ...t.replies].map(n => n.at || 0)) };
  set({ threadRead });
  kv.set(`gl:threadRead:${uid()}`, threadRead);
}
export function openThread(id: string | "new" | null) {
  set({ thread: id });
  if (id && id !== "new") markThreadRead(id);
}

// Who a message is from: the caregiver on shift in caregiver mode, this family member in family mode.
function messageFrom(): Record<string, unknown> | null {
  const S = get();
  if (actingAs(S) === "family") return S.member ? { who: M.firstName(S.member.name), relation: S.member.relation || "", role: "family" } : null;
  const s = onShift();
  return s ? { who: M.firstName(s.name), role: "caregiver", cid: s.cid } : null;
}
export function sendReply() {
  const text = (get().drafts.reply || "").trim(), from = messageFrom(), tid = openThreadId();
  const t = tid ? V().threads.find(x => x.root.id === tid) : null;
  if (!text || !from || !t) return;
  clearDrafts("reply");
  sendMessage(t.root.sid, { ...from, text, parentId: t.root.id });
  markThreadRead(t.root.id);
}
export function sendNew() {
  const text = (get().drafts.newmsg || "").trim(), from = messageFrom();
  if (!text || !from) return;
  clearDrafts("newmsg");
  // Always today's log, even while looking at yesterday, so it's at the top of everyone's list.
  const id = sendMessage(M.sidAt(Date.now()), { ...from, text });
  set({ thread: id });
  markThreadRead(id); // a no-op until its snapshot arrives; the Messages screen marks it again then
  toast(from.role === "family" ? "Sent" : "Sent to family");
}
export const replyTo = (id: string | null) => set({ replyTo: id });
// Family: the message sheet, for a new message or (with a thread id) a reply.
export const compose = (threadId: string | null = null) => set({ replyTo: threadId, modal: "compose" });
export function sendFamilyNote() {
  const S = get(), text = (S.drafts.familyNote || "").trim();
  if (!text || !S.member) return;
  const t: Thread | undefined = S.replyTo ? V().threads.find(x => x.root.id === S.replyTo) : undefined;
  clearDrafts("familyNote");
  set({ replyTo: null, modal: get().modal === "compose" ? null : get().modal });
  sendMessage(t ? t.root.sid : S.sid, { who: M.firstName(S.member.name), relation: S.member.relation || "", role: "family", text, ...(t ? { parentId: t.root.id } : {}) });
  toast(t ? "Reply sent" : "Sent");
}

// ---- auth ----
// In development, log what Firebase actually said: several of its codes share one friendly message here.
const authMessage = (e: { code?: string; message?: string }) => {
  if (__DEV__) console.warn("[auth]", e?.code, e?.message);
  return authMessages[e?.code || ""] || "Something went wrong. Please try again.";
};
const authMessages: Record<string, string> = {
  "auth/invalid-credential": "That email and password don't match. Check them and try again.",
  "auth/wrong-password": "That email and password don't match. Check them and try again.",
  "auth/user-not-found": "That email and password don't match. Check them and try again.",
  "auth/email-already-in-use": "There's already an account with that email. Try signing in instead.",
  "auth/weak-password": "Please choose a password with at least 6 characters.",
  "auth/invalid-email": "That doesn't look like an email address. Check it for typos.",
  "auth/missing-password": "Type your password first.",
  "auth/network-request-failed": "There's no internet connection right now. Try again when you're back online.",
  "auth/too-many-requests": "Too many tries. Please wait a minute, then try again.",
  "auth/invalid-phone-number": "That doesn't look like a mobile number. Include the country code, like +44 7700 900123.",
  "auth/missing-phone-number": "Type your mobile number first.",
  "auth/quota-exceeded": "We can't send more text codes right now. Please try again later, or sign in with email.",
  "auth/invalid-verification-code": "That code isn't right. Check the text and try again.",
  "auth/missing-verification-code": "Type the 6-digit code from the text first.",
  "auth/session-expired": "That code has expired. Send a new one.",
  "auth/code-expired": "That code has expired. Send a new one.",
  "auth/missing-verification-id": "Send yourself a code first.",
  "auth/account-exists-with-different-credential": "There's already an account with that email address. Sign in with your email and password instead.",
  "auth/operation-not-allowed": "That way of signing in isn't switched on yet. Use email and password for now.",
};

export const toggleAuthMode = () => set({ authMode: get().authMode === "signup" ? "signin" : "signup", authError: "" });
export const setAuthMethod = (authMethod: "email" | "phone") => set({ authMethod, phoneSentTo: "", authError: "" });

// Phone sign-in: one step for new and returning people alike. Firebase creates the account on first sign-in.
export async function sendPhoneCode(input: string) {
  const phone = toE164(input, region());
  if (!phone) return set({ authError: authMessage({ code: input.trim() ? "auth/invalid-phone-number" : "auth/missing-phone-number" }) });
  set({ authBusy: true, authError: "" });
  try { await store().sendPhoneCode(phone); set({ phoneSentTo: phone }); } catch (e) { set({ authError: authMessage(e as { code?: string }) }); }
  set({ authBusy: false });
}
export async function confirmPhoneCode(code: string) {
  if (!/^\d{6}$/.test(code.trim())) return set({ authError: authMessage({ code: "auth/missing-verification-code" }) });
  set({ authBusy: true, authError: "" });
  try { await store().confirmPhoneCode(code.trim()); set({ phoneSentTo: "" }); } catch (e) { set({ authError: authMessage(e as { code?: string }) }); }
  set({ authBusy: false });
}
export async function signInWithApple() {
  set({ authBusy: true, authError: "" });
  try { await store().signInWithApple(); } catch (e) {
    // Closing the Apple sheet isn't an error worth showing.
    if ((e as { code?: string })?.code !== "ERR_REQUEST_CANCELED") set({ authError: authMessage(e as { code?: string }) });
  }
  set({ authBusy: false });
}

export async function submitAuth(email: string, password: string) {
  set({ authBusy: true, authError: "" });
  try {
    await (get().authMode === "signup" ? store().signUp(email.trim(), password) : store().signIn(email.trim(), password));
  } catch (e) { set({ authError: authMessage(e as { code?: string }) }); }
  set({ authBusy: false });
}
export async function resetPassword(email: string) {
  if (!email.trim()) return toast("Type your email address above first.");
  try { await store().resetPassword(email.trim()); toast("We've emailed you a link to choose a new password."); } catch (e) { toast(authMessage(e as { code?: string })); }
}
export async function resendVerification() {
  try { await store().sendVerification(); toast("We've sent the email again."); } catch (e) { toast(authMessage(e as { code?: string })); }
}
export async function refreshVerification() {
  try {
    const user = await store().refreshUser();
    set({ user, authError: user?.verified ? "" : "That didn't work yet. Open the email, tap the link, then try again." });
    sync();
  } catch (e) { set({ authError: authMessage(e as { code?: string }) }); }
}
export const demoSignIn = (role: "caregiver" | "family") => store().signIn(role);

export async function signOut() {
  if (isCaregiver() && !(await ask({ title: "Sign this device out?", body: "Someone will need the account's sign-in details (email and password, Apple ID, or its phone for a texted code) to sign it back in. To hand over to the next caregiver, use End shift instead.", yes: "Yes, sign out", destructive: true }))) return;
  clearTimeout(fallTimer);
  const S = get();
  if (S.pid && S.user) kv.del(draftsKey(S.user.uid, S.pid)); // nothing half-typed stays on a shared device
  dropAll();
  set({ drafts: {}, toast: "", undo: null, modal: null });
  await store().signOut();
}

// ---- deleting an account ----
// Everything under a log this account owns: every day (walking each date since the log began, since a family
// message can sit under a day no caregiver opened), the roster, members, presence, shift history, and the
// invitations it sent. Children first, the patient last, so the rules can still see who the owner is.
async function ownedLogPaths(pid: string, createdAt: number) {
  const st = store(), base = `patients/${pid}`, paths: string[] = [];
  const days = await st.getCol<{ id: string }>(`${base}/shifts`);
  const sids = new Set(days.map(d => d.id));
  const first = Math.min(createdAt || Date.now(), ...days.map(d => M.dayInfo(d.id).start).filter(Number.isFinite));
  for (let t = M.dayInfo(M.sidAt(first)).start; t <= Date.now(); t = M.dayInfo(M.nextSid(M.sidAt(t))).start) sids.add(M.sidAt(t));
  const list = Array.from(sids);
  for (let i = 0; i < list.length; i += 20) {
    const chunk = await Promise.all(list.slice(i, i + 20).flatMap(sid =>
      ["entries", "privateNotes", "familyNotes", "alerts"].map(c => st.getCol<{ id: string }>(`${base}/shifts/${sid}/${c}`).then(l => l.map(d => `${base}/shifts/${sid}/${c}/${d.id}`)))));
    paths.push(...chunk.flat());
  }
  paths.push(...days.map(d => `${base}/shifts/${d.id}`));
  for (const c of ["caregivers", "shiftLog", "presence"]) paths.push(...(await st.getCol<{ id: string }>(`${base}/${c}`)).map(d => `${base}/${c}/${d.id}`));
  const invites = await st.getCol<{ id: string; path?: string }>(`${base}/invitations`);
  paths.push(...invites.flatMap(i => [i.path, `${base}/invitations/${i.id}`].filter(Boolean) as string[]));
  // Members last but the owner's own, which the rules need until the very end; then the owner, then the patient.
  const members = await st.getCol<{ id: string }>(`${base}/members`);
  paths.push(...members.filter(m => m.id !== uid()).map(m => `${base}/members/${m.id}`));
  paths.push(`${base}/members/${uid()}`, base);
  return paths;
}

export async function deleteAccount() {
  const S = get(), me = uid();
  if (!S.user) return;
  const links = S.links || [];
  const owned: { id: string; name: string; createdAt: number }[] = [];
  for (const l of links) {
    const p = await store().getDoc<{ ownerUid?: string; name?: string; createdAt?: number }>(`patients/${l.id}`).catch(() => null);
    if (p?.ownerUid === me) owned.push({ id: l.id, name: p.name || l.name, createdAt: p.createdAt || 0 });
  }
  const logs = owned.length ? ` This also deletes ${owned.map(o => `${o.name}'s log`).join(" and ")}, with everything recorded in it, for everyone on it.` : "";
  if (!(await ask({ title: "Delete your account?", body: `Your sign-in and your place on every log are removed.${logs} This can't be undone.`, yes: "Delete my account", no: "Keep it", destructive: true }))) return;
  try {
    set({ modal: null });
    toast("Deleting your account…");
    for (const o of owned) await store().removeMany(await ownedLogPaths(o.id, o.createdAt));
    // Logs you follow (or care for, without owning): take yourself off them.
    const followed = links.filter(l => !owned.some(o => o.id === l.id));
    await store().removeMany(followed.flatMap(l => [`patients/${l.id}/presence/${me}`, `patients/${l.id}/members/${me}`]));
    await store().removeMany(links.map(l => `users/${me}/patients/${l.id}`));
    dropAll();
    if (S.pid) kv.del(draftsKey(me, S.pid));
    set({ drafts: {}, undo: null });
    await store().deleteUser();
    toast("Your account has been deleted");
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === "auth/requires-recent-login") {
      // Everything is already gone except the sign-in itself, which Firebase only deletes just after a sign-in.
      await store().signOut();
      toast("Your information is deleted. To finish, sign in once more and choose Delete my account again.");
      return;
    }
    if (__DEV__) console.warn("[deleteAccount]", e);
    toast("Couldn't delete everything. Check the internet connection and try again.");
  }
}

// ---- patients ----
export async function acceptInvite(id: string) {
  const i: Invite | undefined = get().pendingInvites?.find(x => x.id === id);
  if (!i) return;
  try {
    await store().batch([
      { path: `patients/${i.id}/members/${uid()}`, data: { role: i.role, name: i.name, relation: i.relation || "", detail: i.detail || "", digestOnly: !!i.digestOnly, family: i.role === "family" }, merge: false },
      { path: `users/${uid()}/patients/${i.id}`, data: { name: i.patientName || "Patient", role: i.role, at: Date.now() }, merge: false },
    ]);
    set({ pendingInvites: (get().pendingInvites || []).filter(x => x.id !== i.id) });
    selectPatient(i.id);
  } catch (e) { console.error(e); toast("That invitation didn't work. Ask for a new one."); }
}
export const openPatient = (id: string) => selectPatient(id);
// forMode narrows the list to the people you can open that way (family: the ones you were invited to).
export function openPicker(forMode: Acting | null = null) { set({ pickerOpen: true, pickerFor: forMode, modal: null }); loadPendingInvites(); }
export function startAddPatient() { set({ pickerOpen: true, pickerFor: null, addingPatient: true, modal: null }); loadPendingInvites(); }
export const closePicker = () => set({ pickerOpen: false, pickerFor: null, addingPatient: false });

// Switch between caregiver and family mode for the open person (only offered to the caregiver role). Kept per
// device and person, so a shared care device and someone's own phone can differ.
export async function setViewAs(viewAs: Acting) {
  const S = get();
  if (!S.pid || S.member?.role !== "caregiver") return;
  // Someone who joined as family starts their own shift in caregiver mode, so whatever they record carries their
  // name. Whoever is on shift now (usually the care device's caregiver) has to come off it first.
  const s = onShift();
  if (viewAs === "care" && S.member.family && s) {
    const who = M.firstName(s.name), name = S.patient?.name || "them";
    if (!(await ask({
      title: `End ${who}'s shift?`,
      body: `${who} is on shift for ${name} now. In caregiver mode you start your own shift, so everything you record is under your name, which means ${who}'s shift ends. Everything recorded so far is kept.`,
      yes: `End ${who}'s shift`,
      no: "Not now",
    }))) return;
    closeShift(s);
  }
  kv.set(`gl:view:${uid()}:${S.pid}`, viewAs);
  set({ viewAs, modal: null });
  sync();
}

// The owner lets a family member also act as a caregiver for this person, or takes that back. They stay family.
export function setCanCare(memberId: string, on: boolean) {
  const S = get();
  if (!S.pid || S.patient?.ownerUid !== uid()) return;
  run(store().setDoc(`${PP()}/members/${memberId}`, { role: on ? "caregiver" : "family", family: true }));
}
export const toggleAddPerson = () => set({ addingPatient: !get().addingPatient });

export async function addPatient(nameIn: string) {
  const pname = nameIn.trim();
  if (!pname) return toast("Type their name first.");
  set({ authError: "" });
  const pid = store().newId("patients");
  try {
    // This account becomes the shared caregiver login for the patient; caregivers are added by name next.
    await store().batch([
      { path: `patients/${pid}`, data: { name: pname, careSetting: "Home, 24-hour care", pronouns: M.PRONOUNS, meds: [], ownerUid: uid(), createdAt: Date.now(), trialStartedAt: store().serverTime() }, merge: false },
      { path: `patients/${pid}/members/${uid()}`, data: { role: "caregiver", name: "Care device", relation: "", detail: "", digestOnly: false, owner: true }, merge: false },
      { path: `users/${uid()}/patients/${pid}`, data: { name: pname, role: "caregiver", at: Date.now() }, merge: false },
    ]);
    set({ links: [...(get().links || []), { id: pid, name: pname, role: "caregiver" }] });
    selectPatient(pid);
    toast(`${pname} added. Now add the caregivers who look after them.`);
  } catch (e) { console.error(e); set({ authError: "That didn't work. Check your connection and try again." }); }
}

// Keep the clock fresh when an action depends on it.
export const touchNow = () => useNow.setState({ now: Date.now() });

export type { AppState };
