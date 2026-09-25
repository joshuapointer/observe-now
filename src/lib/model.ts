import { SLOT_MIN } from "./config";
import { AGITATED_CODES, SLEEP_CODES } from "./codes";
import type { Ctx, Entry, Fall, Pronouns } from "./types";

export const SLOT_MS = SLOT_MIN * 60000;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const pad = (n: number) => String(n).padStart(2, "0");
// Display clock: 24-hour by default, or 12-hour ("11:30 pm") when the user or their device prefers it.
export const clock = { h12: false };
export const hm24 = (ms: number) => { const d = new Date(ms); return pad(d.getHours()) + ":" + pad(d.getMinutes()); }; // for keys and comparisons only
const h12 = (d: Date) => d.getHours() % 12 || 12;
export const hhmm = (ms: number) => {
  if (!clock.h12) return hm24(ms);
  const d = new Date(ms);
  return `${h12(d)}:${pad(d.getMinutes())} ${d.getHours() < 12 ? "am" : "pm"}`;
};
export const hhmmShort = (ms: number) => (clock.h12 ? `${h12(new Date(ms))}:${pad(new Date(ms).getMinutes())}` : hm24(ms)); // no am/pm, for small tiles
export const hourLabel = (h: number) => (clock.h12 ? `${h % 12 || 12} ${h % 24 < 12 ? "am" : "pm"}` : `${pad(h % 24)}:00`);
export const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const dayShort = (ms: number) => { const d = new Date(ms); return `${DAYS[d.getDay()]} ${d.getDate()}`; };
export const dayLong = (ms: number) => { const d = new Date(ms); return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; };
export const ago = (ms: number, now = Date.now()) => {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 60) return s + "s";
  if (s < 3600) return Math.round(s / 60) + " min";
  return Math.floor(s / 3600) + "h " + (Math.round(s / 60) % 60) + "m";
};
// "just now", "5 min ago", "1h 20m ago": friendlier than counting seconds.
export const agoText = (ms: number, now = Date.now()) => {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 45) return "just now";
  return ago(ms, now) + " ago";
};
export const dur = (min: number) => `${Math.floor(min / 60)}h ${pad(min % 60)}m`;

// ---- the log is organised by calendar day, midnight to midnight ------
export const sidAt = (ms: number) => dateKey(new Date(ms));

export type DayInfo = { sid: string; date: string; start: number; end: number; slots: number };

export function dayInfo(sid: string): DayInfo {
  const [y, m, d] = sid.split("-").map(Number);
  const start = new Date(y, m - 1, d, 0).getTime();
  const slots = (24 * 60) / SLOT_MIN; // 96 fifteen-minute boxes
  return { sid, date: sid, start, end: start + slots * SLOT_MS, slots };
}

export const prevSid = (sid: string) => sidAt(dayInfo(sid).start - 1);
export const nextSid = (sid: string) => sidAt(dayInfo(sid).end);
export const slotKey = (info: DayInfo, i: number) => hm24(info.start + i * SLOT_MS).replace(":", "");
export const slotIndexAt = (info: DayInfo, now: number) => Math.floor((now - info.start) / SLOT_MS);

// ---- plain language -----------------------------------------------------------------------
export const PRONOUNS: Pronouns = { he: "he", him: "him", his: "his", himself: "himself" };

export function fill(text: string, ctx: Pick<Ctx, "caregiver" | "pronouns">) {
  const p = ctx.pronouns || PRONOUNS;
  return text
    .replace(/\{caregiver\}/g, ctx.caregiver || "the caregiver")
    .replace(/\{himself\}/g, p.himself).replace(/\{him\}/g, p.him)
    .replace(/\{his\}/g, p.his).replace(/\{he\}/g, p.he);
}

// plain → the short description; otherwise the long one (falling back to short when there isn't one).
export const codeText = (code: string, ctx: Ctx, plain = true) => {
  const c = ctx.reg.CODE[code];
  return c ? fill(plain ? c.short : c.long || c.short, ctx) : "";
};
// What the chart and tiles show: the abbreviation, or the short description when a code has none.
export const codeLabel = (code: string, ctx: Ctx) => ctx.reg.CODE[code]?.abbr || codeText(code, ctx, true);

// An interval can carry more than one code. Entries from before this existed have a single `code` string.
export const entryCodes = (e: Partial<Entry> | null | undefined): string[] => (e ? e.codes || (e.code ? [e.code] : []) : []);

const painPart = (e: Partial<Entry>) => (e.pain && e.pain !== "—" ? ` Pain ${e.pain} of 10.` : "");

export function entryLine(e: Partial<Entry>, ctx: Ctx, plain = true) {
  const codes = entryCodes(e);
  const base = codes.length ? codes.map(c => codeText(c, ctx, plain)).join(", ") : "";
  const note = e.note ? (base ? " — " : "") + e.note : "";
  const text = base + note;
  return text ? text.replace(/[.\s]+$/, "") + "." + painPart(e) : painPart(e).trim();
}

export const sentence = (s?: string) => { const t = (s || "").trim(); return t && !/[.!?]$/.test(t) ? t + "." : t; };

export function alertText(kind: string, ctx: Ctx, extra: { pain?: string } = {}) {
  const { name, caregiver } = ctx, him = (ctx.pronouns || PRONOUNS).him;
  if (kind === "fall") return `${name} had a fall. ${caregiver} is with ${him}. A full note is coming in a few minutes.`;
  if (kind === "physical") return `${name} was physically agitated — grabbing or pushing. ${caregiver} is with ${him}.`;
  if (kind === "pain") return `${name} is in a lot of pain (${extra.pain} out of 10). ${caregiver} is with ${him}.`;
  return "";
}

export function fallSummary(fall: Fall, ctx: Ctx) {
  const a = fall.answers || {}, lc = (v: string) => v.toLowerCase();
  const parts = [`${ctx.name} had a fall${a["Found where"] ? " — found " + lc(a["Found where"]) : ""}.`];
  if (a["Head impact?"]) parts.push(`Head impact: ${lc(a["Head impact?"])}.`);
  if (a["Weight-bearing?"]) parts.push(`Weight-bearing: ${lc(a["Weight-bearing?"])}.`);
  if (a["Pain now"] && a["Pain now"] !== "—") parts.push(`Pain now: ${a["Pain now"]} of 10.`);
  if (a["Skin / marks"]) parts.push(`Skin / marks: ${lc(a["Skin / marks"])}.`);
  return parts.join(" ");
}

// ---- derived state for one day -------------------------------------------------------------
export function derive(info: DayInfo, entries: Entry[], now: number) {
  const marked = entries.filter(e => entryCodes(e).length);
  const byKey: Record<string, Entry> = Object.fromEntries(entries.map(e => [e.id, e]));
  const latest = marked.reduce<Entry | null>((a, e) => (!a || e.markedAt > a.markedAt ? e : a), null);
  const feed = entries.filter(e => entryCodes(e).length || e.note).sort((a, b) => b.markedAt - a.markedAt);
  const cur = Math.min(Math.max(slotIndexAt(info, now), 0), info.slots - 1);
  const elapsed = Math.min(Math.max(slotIndexAt(info, now) + 1, 0), info.slots);
  const inToday = now >= info.start && now < info.end;
  return { entries, byKey, marked, latest, feed, cur, elapsed, inToday, curKey: slotKey(info, cur) };
}
export type Derived = ReturnType<typeof derive>;

type Pred = (e: Entry) => boolean;
const first = (list: Entry[], pred: Pred) => list.filter(pred).sort((a, b) => a.slotStart - b.slotStart)[0];
const last = (list: Entry[], pred: Pred) => list.filter(pred).sort((a, b) => b.slotStart - a.slotStart)[0];
const has = (e: Entry, code: string) => entryCodes(e).includes(code);

// ---- trends -------------------------------------------------------------------------------
export type CellKind = "fall" | "sleep" | "agit" | "awake" | "none";
const kindOf = (code: string | null): CellKind =>
  code === "FL" ? "fall" : code && SLEEP_CODES.includes(code) ? "sleep" : code && AGITATED_CODES.includes(code) ? "agit" : code ? "awake" : "none";
// When an interval has several codes, pick the one most worth showing as that box's colour.
const pickRepresentative = (codes: string[]) =>
  codes.find(c => c === "FL") || codes.find(c => AGITATED_CODES.includes(c)) || codes.find(c => SLEEP_CODES.includes(c)) || codes[0] || null;

export type Night = {
  label: string;
  start?: number;
  entries: Entry[];
  cells: CellKind[];
  empty: boolean;
  note?: string;
  sd?: number;
  falls?: number;
  near?: number;
  wakes?: number;
  agit?: number;
  longest?: number;
};

type ColReader = { getCol<T = Record<string, unknown>>(path: string): Promise<T[]> };

// One "night" = 18:00 on a date to 06:00 the next — pulled from that date's log and the next date's.
export async function loadNights(store: ColReader, patientPath: string, now: number, n = 7): Promise<Night[]> {
  const nights: Night[] = [];
  for (let i = 0; i < n; i++) {
    const day = new Date(now); day.setDate(day.getDate() - i);
    const sid = dateKey(day), tomorrowSid = nextSid(sid);
    const [a, b] = await Promise.all([sid, tomorrowSid].map(s => store.getCol<Entry>(`${patientPath}/shifts/${s}/entries`).catch(() => [] as Entry[])));
    const nightStart = dayInfo(sid).start + 18 * 3600000, nightEnd = nightStart + 12 * 3600000;
    const entries = [...a, ...b].filter(e => entryCodes(e).length && e.slotStart >= nightStart && e.slotStart < nightEnd);
    if (!entries.length) { nights.push({ label: dayShort(nightStart), entries: [], cells: [], empty: true }); continue; }
    const byStart = new Map(entries.map(e => [e.slotStart, e]));
    const cells = Array.from({ length: 48 }, (_, k) => kindOf(pickRepresentative(entryCodes(byStart.get(nightStart + k * SLOT_MS)))));
    nights.push({ label: dayShort(nightStart), start: nightStart, entries, cells, empty: false });
  }
  return nights;
}

export type TrendStat = { label: string; value: string; detail: string };

export function trendSummary(nights: Night[], _ctx: Ctx) {
  const live = nights.filter(n => !n.empty);
  for (const n of live) {
    const E = n.entries, fl = last(E, e => has(e, "FL"));
    const sd = first(E, e => has(e, "SD")), sleep = first(E, e => has(e, "AS"));
    const ups = E.filter(e => has(e, "UP") || has(e, "WK")).length;
    n.note = fl ? `fall ${hhmm(fl.markedAt)}` : ups >= 2 ? `up ${ups} times` : sleep ? `settled ${hhmm(sleep.slotStart)}` : "—";
    n.sd = sd?.slotStart; n.falls = E.filter(e => has(e, "FL")).length; n.near = E.filter(e => has(e, "US")).length;
    n.wakes = E.filter(e => has(e, "WK")).length; n.agit = E.filter(e => entryCodes(e).some(c => AGITATED_CODES.includes(c))).length;
    let run = 0, best = 0; // longest run of consecutive sleeping cells
    for (const c of n.cells) { run = c === "sleep" ? run + 1 : 0; best = Math.max(best, run); }
    n.longest = best * SLOT_MIN;
  }
  const withSd = live.filter(n => n.sd);
  const avgSd = withSd.length ? withSd.reduce((s, n) => { const d = new Date(n.sd!); return s + d.getHours() * 60 + d.getMinutes(); }, 0) / withSd.length : null;
  const longest = live.reduce<Night | null>((a, n) => (!a || n.longest! > a.longest! ? n : a), null);
  const stats: TrendStat[] = [
    { label: "Evening restlessness starts", value: avgSd == null ? "—" : `${pad(Math.floor(avgSd / 60))}:${pad(Math.round(avgSd % 60))}`, detail: withSd.length ? `average across ${withSd.length} nights` : "not marked yet" },
    { label: "Night awakenings", value: live.length ? (live.reduce((s, n) => s + n.wakes!, 0) / live.length).toFixed(1) : "—", detail: "per night" },
    { label: "Longest sleep block", value: longest && longest.longest ? dur(longest.longest) : "—", detail: longest && longest.longest ? longest.label : "no sleep marked" },
    { label: "Falls / near-falls", value: `${live.reduce((s, n) => s + n.falls!, 0)} / ${live.reduce((s, n) => s + n.near!, 0)}`, detail: `${live.length} nights logged` },
  ];

  const insights: string[] = [];
  if (withSd.length >= 2) {
    const chrono = [...withSd].sort((a, b) => a.start! - b.start!), a = chrono[0], b = chrono[chrono.length - 1];
    const mins = (ms: number) => { const d = new Date(ms); return d.getHours() * 60 + d.getMinutes(); };
    const dir = mins(b.sd!) < mins(a.sd!) ? "earlier" : mins(b.sd!) > mins(a.sd!) ? "later" : null;
    insights.push(dir ? `Evening restlessness started ${dir}: ${hhmm(b.sd!)} on ${b.label}, against ${hhmm(a.sd!)} on ${a.label}.` : `Evening restlessness has started at about the same time each night, ${hhmm(a.sd!)}.`);
  }
  const incidents = live.flatMap(n => n.entries.filter(e => has(e, "FL") || has(e, "US")));
  if (incidents.length) {
    // minutes after 18:00, so a night that runs past midnight sorts correctly
    const rel = (ms: number) => { const d = new Date(ms); return (d.getHours() * 60 + d.getMinutes() - 18 * 60 + 1440) % 1440; };
    const t = incidents.map(e => e.markedAt || e.slotStart).sort((x, y) => rel(x) - rel(y));
    insights.push(`${incidents.length} fall${incidents.length === 1 ? "" : "s"} and near-fall${incidents.length === 1 ? "" : "s"} this week, all between ${hhmm(t[0])} and ${hhmm(t[t.length - 1])}.`);
  }
  if (live.length >= 2) {
    const calm = [...live].sort((a, b) => a.agit! - b.agit!)[0];
    insights.push(`Calmest night: ${calm.label}, with ${calm.agit} agitated interval${calm.agit === 1 ? "" : "s"}.`);
  }
  if (!insights.length) insights.push("Not enough nights logged yet — this fills in as more days are logged.");
  return { stats, insights };
}

export const firstName = (s?: string | null) => String(s || "").trim().split(/\s+/)[0] || "";
