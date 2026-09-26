// Subscriptions, one per care log. A log gets a free trial from when it was created, then needs a subscription to
// keep recording. The server decides (the Firestore rules and config/billing); this only mirrors it for the screens.
import type { Patient, TimeValue } from "./types";

export const TRIAL_DAYS = 14;
const DAY = 86400000;

export const toMs = (v?: TimeValue): number => (v == null ? 0 : typeof v === "number" ? v : v.toMillis());

export type BillingState =
  | { kind: "off" } // subscriptions aren't switched on yet: everything is free
  | { kind: "trial"; ends: number; daysLeft: number }
  | { kind: "active"; until: number; willRenew: boolean }
  | { kind: "lapsed"; since: number };

export function billingState(p: Patient | null | undefined, now: number, enforced: boolean): BillingState {
  if (!enforced || !p) return { kind: "off" };
  const until = toMs(p.billing?.until);
  if (until > now) return { kind: "active", until, willRenew: p.billing?.willRenew !== false };
  const started = toMs(p.trialStartedAt);
  const ends = started ? started + TRIAL_DAYS * DAY : 0;
  if (ends > now) return { kind: "trial", ends, daysLeft: Math.max(1, Math.ceil((ends - now) / DAY)) };
  return { kind: "lapsed", since: Math.max(until, ends) };
}

export const canRecord = (b: BillingState) => b.kind !== "lapsed";
