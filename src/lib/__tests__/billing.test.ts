import { billingState, canRecord, TRIAL_DAYS } from "../billing";

const DAY = 86400000, now = Date.UTC(2026, 8, 26, 12);
const none = { active: false, until: 0, willRenew: false };

describe("billingState", () => {
  it("is off (free) until subscriptions are switched on", () => {
    expect(billingState({ id: "p", trialStartedAt: now - 99 * DAY }, now, false, none)).toEqual({ kind: "off" });
  });
  it("counts the trial down in whole days, from the server-stamped start", () => {
    expect(billingState({ id: "p", trialStartedAt: now - 3 * DAY }, now, true, none)).toMatchObject({ kind: "trial", daysLeft: TRIAL_DAYS - 3 });
    expect(billingState({ id: "p", trialStartedAt: now - (TRIAL_DAYS * DAY - 60000) }, now, true, none)).toMatchObject({ kind: "trial", daysLeft: 1 });
  });
  it("accepts Firestore timestamps, and falls back to createdAt for older logs", () => {
    expect(billingState({ id: "p", trialStartedAt: { toMillis: () => now - DAY } }, now, true, none).kind).toBe("trial");
    expect(billingState({ id: "p", createdAt: now - 2 * DAY }, now, true, none).kind).toBe("trial");
  });
  it("an active RevenueCat entitlement wins over an ended trial, and says whether it renews", () => {
    const b = billingState({ id: "p", trialStartedAt: now - 60 * DAY }, now, true, { active: true, until: now + 10 * DAY, willRenew: false });
    expect(b).toEqual({ kind: "active", until: now + 10 * DAY, willRenew: false });
  });
  it("lapses once the trial is over and RevenueCat says there's no subscription", () => {
    const lapsed = billingState({ id: "p", trialStartedAt: now - 30 * DAY }, now, true, none);
    expect(lapsed.kind).toBe("lapsed");
    expect(canRecord(lapsed)).toBe(false);
  });
  it("doesn't pause a log before RevenueCat has answered", () => {
    expect(billingState({ id: "p", trialStartedAt: now - 30 * DAY }, now, true, null)).toEqual({ kind: "off" });
  });
});
