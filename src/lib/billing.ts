// Subscriptions, one per care log. A log gets a free trial from when it was created, then needs a subscription to
// keep recording. The app decides from RevenueCat (the log's entitlement) and the trial start; nothing is enforced
// until config/billing says so.
import type { Entitlement } from "./purchases";
import type { Patient, TimeValue } from "./types";

export const TRIAL_DAYS = 14;
const DAY = 86400000;

export const toMs = (v?: TimeValue): number => (v == null ? 0 : typeof v === "number" ? v : v.toMillis());

export type BillingState =
  | { kind: "off" } // subscriptions aren't switched on yet: everything is free
  | { kind: "trial"; ends: number; daysLeft: number }
  | { kind: "active"; until: number; willRenew: boolean }
  | { kind: "lapsed"; since: number };

// ent: what RevenueCat says about this log (null until it has answered). The trial runs from the server-stamped
// start, or from when the log was created for logs made before that was recorded.
export function billingState(p: Patient | null | undefined, now: number, enforced: boolean, ent: Entitlement | null): BillingState {
  if (!enforced || !p) return { kind: "off" };
  if (ent?.active && ent.until > now) return { kind: "active", until: ent.until, willRenew: ent.willRenew };
  const started = toMs(p.trialStartedAt) || p.createdAt || 0;
  const ends = started ? started + TRIAL_DAYS * DAY : 0;
  if (ends > now) return { kind: "trial", ends, daysLeft: Math.max(1, Math.ceil((ends - now) / DAY)) };
  // Not heard from RevenueCat yet: don't show a paused log to someone who may well be subscribed.
  if (!ent) return { kind: "off" };
  return { kind: "lapsed", since: Math.max(ent.until, ends) };
}

export const canRecord = (b: BillingState) => b.kind !== "lapsed";
