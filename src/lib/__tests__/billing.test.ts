import { billingState, canRecord, TRIAL_DAYS } from "../billing";

const DAY = 86400000, now = Date.UTC(2026, 8, 26, 12);

describe("billingState", () => {
  it("is off (free) until subscriptions are switched on", () => {
    expect(billingState({ id: "p", trialStartedAt: now - 99 * DAY }, now, false)).toEqual({ kind: "off" });
  });
  it("counts the trial down in whole days, from the server-stamped start", () => {
    expect(billingState({ id: "p", trialStartedAt: now - 3 * DAY }, now, true)).toMatchObject({ kind: "trial", daysLeft: TRIAL_DAYS - 3 });
    expect(billingState({ id: "p", trialStartedAt: now - (TRIAL_DAYS * DAY - 60000) }, now, true)).toMatchObject({ kind: "trial", daysLeft: 1 });
  });
  it("accepts Firestore timestamps as well as milliseconds", () => {
    const ts = { toMillis: () => now - DAY };
    expect(billingState({ id: "p", trialStartedAt: ts }, now, true).kind).toBe("trial");
  });
  it("a paid subscription wins over an ended trial, and says whether it renews", () => {
    const b = billingState({ id: "p", trialStartedAt: now - 60 * DAY, billing: { until: now + 10 * DAY, willRenew: false } }, now, true);
    expect(b).toEqual({ kind: "active", until: now + 10 * DAY, willRenew: false });
  });
  it("lapses when both the trial and the subscription are over; a log with no trial start counts as ended", () => {
    const lapsed = billingState({ id: "p", trialStartedAt: now - 30 * DAY, billing: { until: now - DAY } }, now, true);
    expect(lapsed.kind).toBe("lapsed");
    expect(canRecord(lapsed)).toBe(false);
    expect(billingState({ id: "p" }, now, true).kind).toBe("lapsed");
  });
});
