// A believable recent history for practice mode's screenshot build (EXPO_PUBLIC_SCREENSHOTS=1): the last day and a
// half of 15-minute boxes, a week of nights for the trends, a few notes, medicines given and a conversation with
// family. Only ever written into the practice store on the device.
import { dateKey, dayInfo, sidAt, slotIndexAt, slotKey, SLOT_MS } from "../model";

type Doc = Record<string, unknown>;

// What Garth is typically doing at each hour, with a little variety between boxes.
const BY_HOUR: Record<number, string[][]> = {
  0: [["AS"], ["AS"], ["AS"], ["AS"]], 1: [["AS"], ["AS"], ["WK"], ["RE"]], 2: [["DZ"], ["AS"], ["AS"], ["AS"]],
  3: [["AS"], ["TO"], ["AS"], ["AS"]], 4: [["AS"], ["AS"], ["AS"], ["AS"]], 5: [["AS"], ["AS"], ["DZ"], ["AB"]],
  6: [["AB"], ["AW"], ["TO"], ["AW"]], 7: [["EA"], ["EA", "SO"], ["AW"], ["CA"]], 8: [["MD", "EA"], ["CA"], ["SO"], ["CA"]],
  9: [["CA"], ["CA"], ["SO"], ["AW"]], 10: [["CA"], ["SH"], ["CA"], ["AW"]], 11: [["CA"], ["HU"], ["EA"], ["EA"]],
  12: [["EA"], ["RE"], ["DZ"], ["AS"]], 13: [["AS"], ["DZ"], ["AW"], ["CA"]], 14: [["CA"], ["SO"], ["CA"], ["TO"]],
  15: [["CA"], ["CA"], ["AW"], ["CN"]], 16: [["SD"], ["AX"], ["SD", "VA"], ["PA"]], 17: [["EX"], ["PA", "EX"], ["RD"], ["CA"]],
  18: [["EA"], ["EA", "SO"], ["CA"], ["AW"]], 19: [["CA"], ["TO"], ["CA"], ["AW"]], 20: [["AB"], ["AW"], ["NS"], ["AB"]],
  21: [["MD", "AB"], ["DZ"], ["AB"], ["DZ"]], 22: [["AS"], ["AS"], ["NS"], ["AS"]], 23: [["AS"], ["AS"], ["AS"], ["AS"]],
};
const NOTES: Record<string, string> = {
  "0730": "Ate most of his porridge.",
  "1645": "Asked the time twice.",
  "1730": "Settled with the radio on.",
  "2030": "Walked the hall, then back to bed.",
};
const CAREGIVERS = [{ cid: "cg-dana", name: "Dana R." }, { cid: "cg-sam", name: "Sam K." }];

export function seedSample(data: Record<string, Doc>, pid: string, now = Date.now()) {
  const PP = `patients/${pid}`;
  const put = (sid: string, info: ReturnType<typeof dayInfo>, i: number, codes: string[], cg: { cid: string; name: string }) => {
    const key = slotKey(info, i), start = info.start + i * SLOT_MS;
    data[`${PP}/shifts/${sid}/entries/${key}`] = {
      slot: i, slotStart: start, codes, place: codes.includes("AS") || codes.includes("AB") ? "Bed" : "", pain: "—",
      note: NOTES[key] || "", markedAt: start + 4 * 60000, by: "demo-caregiver", byName: cg.name, cid: cg.cid, shiftId: "sample",
    };
  };
  const pick = (t: number) => { const d = new Date(t); return BY_HOUR[d.getHours()][Math.floor(d.getMinutes() / 15)]; };

  // Today and yesterday: every box for the last 30 hours, up to and including the current one.
  for (let t = now - 30 * 3600000; t <= now; t += SLOT_MS) {
    const sid = sidAt(t), info = dayInfo(sid), i = slotIndexAt(info, t);
    data[`${PP}/shifts/${sid}`] ??= { sid, date: info.date, start: info.start, meds: {}, createdAt: info.start, startedAt: info.start };
    put(sid, info, i, pick(t), new Date(t).getHours() >= 14 && new Date(t).getHours() < 22 ? CAREGIVERS[1] : CAREGIVERS[0]);
  }
  // The week before: nights only (18:00 to 06:00), which is what the trends show.
  for (let n = 2; n <= 7; n++) {
    const eve = new Date(now); eve.setDate(eve.getDate() - n); eve.setHours(18, 0, 0, 0);
    for (let k = 0; k < 48; k++) {
      const t = eve.getTime() + k * SLOT_MS, sid = sidAt(t), info = dayInfo(sid);
      if (k % 5 === 3 && n % 2) continue; // a few gaps, like real nights
      let codes = pick(t);
      if (n === 4 && k === 30) codes = ["WK"];
      if (n === 5 && k >= 26 && k < 30) codes = ["NS"];
      put(sid, info, slotIndexAt(info, t), codes, CAREGIVERS[k % 2]);
    }
  }
  // Medicines given today, a caregivers-only note, and a conversation with family.
  const today = sidAt(now), todayInfo = dayInfo(today);
  data[`${PP}/shifts/${today}`] = { ...(data[`${PP}/shifts/${today}`] || {}), meds: { Donepezil: todayInfo.start + 8 * 3600000 + 10 * 60000 } };
  const priv = slotKey(todayInfo, Math.max(0, slotIndexAt(todayInfo, now) - 3));
  data[`${PP}/shifts/${today}/privateNotes/${priv}`] = { note: "Right shoulder seemed stiff getting up. Keep an eye on it.", at: now - 40 * 60000, byName: "Dana R." };
  const msg = (id: string, at: number, m: Doc) => { const sid = sidAt(at); data[`${PP}/shifts/${sid}/familyNotes/${id}`] = { ...m, at }; };
  msg("m1", now - 5 * 3600000, { who: "Ellen", relation: "daughter", role: "family", uid: "demo-family", text: "How was this afternoon? Any sundowning?" });
  msg("m2", now - 5 * 3600000 + 12 * 60000, { who: "Sam", role: "caregiver", uid: "demo-caregiver", cid: "cg-sam", parentId: "m1", text: "A little around 5. He settled with the radio on and ate a good dinner." });
  msg("m3", now - 5 * 3600000 + 20 * 60000, { who: "Ellen", relation: "daughter", role: "family", uid: "demo-family", parentId: "m1", text: "Thank you Sam, that's lovely to hear." });
  msg("m4", now - 50 * 60000, { who: "Ray", relation: "son", role: "family", uid: "demo-family-2", text: "Give Dad a hug from me when he wakes up." });
  data[`${PP}/presence/demo-family`] = { lastSeen: now, role: "family", name: "Ellen" };
  return dateKey(new Date(now));
}
