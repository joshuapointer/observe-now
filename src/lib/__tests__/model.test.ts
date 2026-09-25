import { buildRegistry, alertKind, activeCodes, BUILTIN_CODES } from "../codes";
import * as M from "../model";
import type { Ctx, Entry } from "../types";

const ctx = (codes?: Parameters<typeof buildRegistry>[0]): Ctx => ({ name: "Garth", caregiver: "Dana", pronouns: M.PRONOUNS, reg: buildRegistry(codes) });

const entry = (p: Partial<Entry>): Entry => ({ id: "0000", sid: "2026-09-24", slot: 0, slotStart: 0, markedAt: 0, ...p });

describe("days and boxes", () => {
  it("has 96 fifteen-minute boxes from local midnight", () => {
    const info = M.dayInfo("2026-09-24");
    expect(info.slots).toBe(96);
    expect(new Date(info.start).getHours()).toBe(0);
    expect(M.slotKey(info, 0)).toBe("0000");
    expect(M.slotKey(info, 95)).toBe("2345");
  });
  it("steps between days", () => {
    expect(M.prevSid("2026-03-01")).toBe("2026-02-28");
    expect(M.nextSid("2026-12-31")).toBe("2027-01-01");
  });
  it("derives the current box", () => {
    const info = M.dayInfo("2026-09-24");
    const d = M.derive(info, [], info.start + 61 * 60000);
    expect(d.cur).toBe(4);
    expect(d.curKey).toBe("0100");
    expect(d.inToday).toBe(true);
  });
});

describe("clock", () => {
  afterEach(() => { M.clock.h12 = false; });
  it("formats 24h by default and 12h on request", () => {
    const t = new Date(2026, 8, 24, 23, 30).getTime();
    expect(M.hhmm(t)).toBe("23:30");
    M.clock.h12 = true;
    expect(M.hhmm(t)).toBe("11:30 pm");
    expect(M.hhmmShort(t)).toBe("11:30");
  });
});

describe("plain language", () => {
  it("fills pronouns and caregiver", () => {
    expect(M.codeText("VA", ctx())).toBe("Calling out, repeating himself");
    expect(M.codeText("SH", ctx())).toBe("Staying close to Dana");
    expect(M.codeText("VA", { ...ctx(), pronouns: { he: "she", him: "her", his: "her", himself: "herself" } })).toBe("Calling out, repeating herself");
  });
  it("uses the long text when plain is off, and the abbreviation as the label", () => {
    expect(M.codeText("AS", ctx(), false)).toBe("Asleep — eyes closed, not easily roused");
    expect(M.codeLabel("AS", ctx())).toBe("AS");
  });
  it("labels a code with no abbreviation by its short text", () => {
    const c = ctx([...BUILTIN_CODES, { id: "c_x", short: "Asking for a drink", section: "care" }]);
    expect(M.codeLabel("c_x", c)).toBe("Asking for a drink");
  });
  it("reads single-code entries from before multi-code boxes", () => {
    expect(M.entryCodes(entry({ code: "AS" }))).toEqual(["AS"]);
    expect(M.entryCodes(entry({ codes: ["AS", "PN"] }))).toEqual(["AS", "PN"]);
    expect(M.entryCodes(null)).toEqual([]);
  });
  it("writes an entry line", () => {
    expect(M.entryLine(entry({ codes: ["AX", "PA"], note: "asked the time.", pain: "4" }), ctx())).toBe("Anxious, Restless, pacing — asked the time. Pain 4 of 10.");
  });
});

describe("codes registry", () => {
  it("keeps built-ins missing from a saved list resolvable but not offered", () => {
    const reg = buildRegistry([{ id: "AS", abbr: "AS", short: "Asleep", section: "sleep" }]);
    expect(reg.CODE.FL.archived).toBe(true);
    expect(activeCodes(reg).map(c => c.id)).toEqual(["AS"]);
    expect(reg.CAT.FL).toBe("danger");
  });
  it("raises alerts for falls, grabbing and pain 7+", () => {
    expect(alertKind("FL", "—")).toBe("fall");
    expect(alertKind("PH", "—")).toBe("physical");
    expect(alertKind("PN", "7")).toBe("pain");
    expect(alertKind("PN", "6")).toBe(null);
  });
});

describe("trends", () => {
  it("summarises nights", async () => {
    const now = new Date(2026, 8, 24, 12).getTime();
    const night = M.dayInfo("2026-09-23").start + 18 * 3600000;
    const entries: Record<string, Entry[]> = {
      "p/shifts/2026-09-23/entries": [
        entry({ id: "1900", slotStart: night + 3600000, markedAt: night + 3600000, codes: ["SD"] }),
        entry({ id: "2200", slotStart: night + 4 * 3600000, markedAt: night + 4 * 3600000, codes: ["AS"] }),
        entry({ id: "2215", slotStart: night + 4.25 * 3600000, markedAt: night + 4.25 * 3600000, codes: ["AS"] }),
      ],
    };
    const store = { getCol: async <T,>(p: string) => (entries[p] || []) as T[] };
    const nights = await M.loadNights(store, "p", now);
    expect(nights).toHaveLength(7);
    const live = nights.filter(n => !n.empty);
    expect(live).toHaveLength(1);
    const { stats } = M.trendSummary(nights, ctx());
    expect(stats[0].value).toBe("19:00");
    expect(stats[2].value).toBe("0h 30m");
  });
});

describe("joinPhrases", () => {
  it("merges phrases that share a word instead of repeating it", () => {
    expect(M.joinPhrases(["Awake and calm", "Calm and occupied"])).toBe("Awake, calm and occupied");
  });
  it("leaves unrelated phrases exactly as written", () => {
    expect(M.joinPhrases(["Sleeping", "Believing something untrue"])).toBe("Sleeping, Believing something untrue");
    expect(M.joinPhrases(["Refused food, drink and medicine"])).toBe("Refused food, drink and medicine");
  });
  it("merges with any earlier phrase that overlaps, whatever order the codes were picked in", () => {
    expect(M.joinPhrases(["Awake and calm", "Eating", "Calm and occupied"])).toBe("Awake, calm and occupied, Eating");
  });
  it("handles one or none", () => {
    expect(M.joinPhrases(["Sleeping"])).toBe("Sleeping");
    expect(M.joinPhrases([])).toBe("");
  });
});
