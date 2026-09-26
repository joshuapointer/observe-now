import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import { alertKind, type AlertKind } from "@/lib/codes";
import * as M from "@/lib/model";
import type { Ctx, DayData, Entry, Message } from "@/lib/types";
import { actingAs, useApp, useNow, type AppState } from "./app";

const EMPTY: DayData = { day: null, entries: [], priv: [], notes: [], alerts: [], loaded: false };

export type Thread = { root: Message; replies: Message[]; last: number };

export const fromCaregiver = (n: Message) => n.role === "caregiver";

// Everything the screens need, computed once per state change (port of the PWA's compute()).
// The fields compute() reads. useView subscribes to just these, so typing a note, a toast or a PIN key doesn't
// recompute and re-render every screen that shows the log.
type ViewInput = Pick<AppState, "sid" | "data" | "patient" | "members" | "presence" | "reg" | "target" | "pain" | "pendingCodes" | "msgReadAt" | "pid" | "threadRead" | "roster" | "settings" | "user" | "member" | "viewAs">;
const pickInput = (S: AppState): ViewInput => ({
  sid: S.sid, data: S.data, patient: S.patient, members: S.members, presence: S.presence, reg: S.reg, target: S.target, pain: S.pain,
  pendingCodes: S.pendingCodes, msgReadAt: S.msgReadAt, pid: S.pid, threadRead: S.threadRead, roster: S.roster, settings: S.settings, user: S.user,
  member: S.member, viewAs: S.viewAs,
});

export function compute(S: ViewInput, now: number) {
  const info = M.dayInfo(S.sid);
  const D = S.data[S.sid] || EMPTY, PD = S.data[M.prevSid(S.sid)] || EMPTY;
  const p = S.patient || ({} as NonNullable<AppState["patient"]>), day = D.day;
  const members = S.members;
  const isToday = S.sid === M.sidAt(now);
  const d = M.derive(info, D.entries, now);
  const key = S.target || d.curKey;
  const targetIdx = Math.max(0, Array.from({ length: info.slots }, (_, i) => M.slotKey(info, i)).indexOf(key));
  const all = [...D.entries, ...PD.entries];
  // The latest *interval* with something in it. Going back to fill in an earlier box doesn't make it "right now".
  const latest = all.filter(e => M.entryCodes(e).length).sort((a, b) => b.slotStart - a.slotStart || b.markedAt - a.markedAt)[0] || null;
  const alerts = [...D.alerts, ...PD.alerts].sort((a, b) => b.at - a.at);
  // The caregiver is whoever is on shift; between shifts, whoever recorded last.
  const onShift = p.onShift || null;
  const lastBy = latest?.byName || members.find(m => m.id === latest?.by && m.role === "caregiver")?.name;
  const ctx: Ctx = { name: p.name || "Garth", caregiver: M.firstName(onShift?.name || lastBy) || "the caregiver", pronouns: p.pronouns || M.PRONOUNS, reg: S.reg };
  // Family: joined as family, whether or not the owner has also let them act as a caregiver. "Watching now" means
  // on the family side right now; the same person using caregiver mode isn't watching as family.
  const family = members.filter(m => m.role === "family" || m.family);
  const live = family.filter(m => {
    const p = S.presence.find(x => x.id === m.id);
    return !!p && (p.lastSeen || 0) > now - 90000 && p.role !== "caregiver";
  });
  // When the care side was last open (any device in caregiver mode): what family see as "active now".
  const careSeen = Math.max(0, ...S.presence.filter(x => x.role === "caregiver").map(x => x.lastSeen || 0));
  const careActive = careSeen > now - 90000;
  const meds = p.meds || [];
  // Finished boxes since today's log was created that nobody filled in (only meaningful on today's own log).
  const started = day?.startedAt || day?.createdAt || 0;
  const missedIdx = isToday && started
    ? Array.from({ length: d.cur }, (_, i) => i).filter(i => info.start + (i + 1) * M.SLOT_MS > started && !M.entryCodes(d.byKey[M.slotKey(info, i)]).length && !d.byKey[M.slotKey(info, i)]?.note)
    : [];
  const missed = missedIdx.map(i => M.slotKey(info, i));
  const missedTimes = missedIdx.map(i => M.hhmm(info.start + i * M.SLOT_MS));
  const recents: string[] = [];
  recentLoop:
  for (const e of all.filter(x => M.entryCodes(x).length).sort((a, b) => b.markedAt - a.markedAt)) {
    for (const c of M.entryCodes(e)) {
      if (c === "FL" || c === "PH" || !S.reg.CODE[c] || S.reg.CODE[c].archived) continue;
      if (!recents.includes(c)) recents.push(c);
      if (recents.length === 4) break recentLoop;
    }
  }
  // What the currently-selected codes (not yet saved) would send to family, so the app and the display agree.
  const kinds = S.pendingCodes.map(c => alertKind(c, S.pain)).filter(Boolean) as AlertKind[];
  const pendingAlertKind: AlertKind | null = kinds.includes("physical") ? "physical" : kinds[0] || null;
  // Messages go both ways; each side counts the other side's as unread (below).
  const messages = [...D.notes, ...PD.notes].sort((a, b) => b.at - a.at);
  const msgReadAt = (S.pid && S.msgReadAt[S.pid]) || 0;
  // Threads: a reply carries parentId (the first message of its thread). Replies whose first message is outside
  // the two days being watched stand on their own.
  const known = new Set(messages.map(n => n.id));
  const threads: Thread[] = messages.filter(n => !n.parentId || !known.has(n.parentId)).map(root => {
    const replies = messages.filter(n => n.parentId === root.id).sort((a, b) => a.at - b.at);
    return { root, replies, last: replies.length ? replies[replies.length - 1].at : root.at };
  }).sort((a, b) => b.last - a.last);
  const readAt = (t: Thread) => Math.max(msgReadAt, S.threadRead[t.root.id] || 0);
  // Unread: what the other side wrote. Caregiver mode counts family's messages, family mode the caregivers'.
  const fromOtherSide = (n: Message) => (actingAs(S) === "family" ? fromCaregiver(n) : !fromCaregiver(n)) && n.uid !== S.user?.uid;
  const unreadIds = new Set(threads.flatMap(t => [t.root, ...t.replies].filter(n => fromOtherSide(n) && n.at > readAt(t)).map(n => n.id)));
  // The current 15-minute box: how far through it we are, for the countdown ring on Now.
  const boxEnd = info.start + (d.cur + 1) * M.SLOT_MS;
  const boxLeftMs = d.inToday ? Math.max(0, boxEnd - now) : 0;
  const boxProgress = d.inToday ? 1 - boxLeftMs / M.SLOT_MS : 0;
  const feed = all.filter(e => M.entryCodes(e).length || e.note).sort((a, b) => b.markedAt - a.markedAt).slice(0, 40);
  return {
    missed, missedTimes, recents, pendingAlertKind, messages, threads, unreadIds, unreadMsgs: unreadIds.size, msgReadAt,
    now, info, D, PD, day, ctx, d, key, targetIdx, latest, alerts, members, family, live, careSeen, careActive, meds, onShift, roster: S.roster || [],
    feed, plain: S.settings.plain, isToday, boxLeftMs, boxProgress,
    isOwner: !!S.patient && S.patient.ownerUid === S.user?.uid,
    familyCount: family.length,
  };
}

export type View = ReturnType<typeof compute>;

export function useView(): View {
  const S = useApp(useShallow(pickInput));
  const now = useNow(s => s.now);
  return useMemo(() => compute(S, now), [S, now]);
}

// Who recorded an entry: the caregiver on shift, or (entries from before shifts) the member who wrote it.
export const whoBy = (e: Entry | null | undefined, V: View) =>
  M.firstName(e?.byName || V.members.find(m => m.id === e?.by && m.role === "caregiver")?.name);
export const msgWho = (n: Message) => `${n.who}${fromCaregiver(n) ? " · caregiver" : n.relation ? " · " + n.relation : ""}`;
export const msgWhen = (n: Message, V: View) =>
  `${M.dateKey(new Date(n.at)) === M.dateKey(new Date(V.now)) ? "" : M.dayShort(n.at) + " · "}${M.hhmm(n.at)}`;

// Caregivers can change or remove what they recorded during their own current shift.
export const canEdit = (S: AppState, V: View, e: Entry | null | undefined) =>
  !!e && S.member?.role === "caregiver" && !!V.onShift && e.shiftId === V.onShift.id;

export const nowText = (e: Entry | null, V: View, plain: boolean) => {
  const codes = M.entryCodes(e);
  return codes.length ? M.codesText(codes, V.ctx, plain) : "Nothing recorded yet";
};
export const nowDetail = (e: Entry | null) =>
  e ? [M.sentence(e.note), e.pain && e.pain !== "—" ? `Pain ${e.pain} out of 10.` : ""].filter(Boolean).join(" ") || `Recorded at ${M.hhmm(e.markedAt)}.` : "";
export const notAsked = (v: string) => (v === "—" ? "Not asked" : v);
