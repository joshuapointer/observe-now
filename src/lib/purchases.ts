// Buying and restoring a care log's subscription through RevenueCat (App Store, Google Play). Each log is its own
// RevenueCat customer ("log_<patient id>"), so the subscription belongs to the log, not to the phone that paid, and
// every caregiver device for that log sees it. After a purchase or restore the server is asked to check RevenueCat
// and update the log (the webhook would get there too, a little later).
import { Platform } from "react-native";
import type { PurchasesPackage } from "react-native-purchases";

import { DEMO } from "./config";
import { getStore as store } from "./store";

const KEY = Platform.OS === "ios" ? process.env.EXPO_PUBLIC_RC_APPLE_KEY : process.env.EXPO_PUBLIC_RC_GOOGLE_KEY;
export const PURCHASES_AVAILABLE = !DEMO && !!KEY;

export type Plan = { id: string; title: string; price: string; perMonth: string | null; period: "month" | "year" | "other"; pkg: PurchasesPackage };

// Loaded on first use, so a build without the native module still starts (it only fails when you try to buy).
let configured = false;
async function asLog(pid: string) {
  if (!KEY) throw new Error("Subscriptions aren't set up in this build.");
  const Purchases = (await import("react-native-purchases")).default;
  const appUserID = `log_${pid}`;
  if (!configured) { Purchases.configure({ apiKey: KEY, appUserID }); configured = true; return Purchases; }
  if ((await Purchases.getAppUserID()) !== appUserID) await Purchases.logIn(appUserID);
  return Purchases;
}

export async function loadPlans(pid: string): Promise<Plan[]> {
  const Purchases = await asLog(pid);
  const offering = (await Purchases.getOfferings()).current;
  return (offering?.availablePackages || []).map(pkg => {
    const t = pkg.packageType;
    const period: Plan["period"] = t === "MONTHLY" ? "month" : t === "ANNUAL" ? "year" : "other";
    return {
      id: pkg.identifier,
      title: period === "month" ? "Monthly" : period === "year" ? "Yearly" : pkg.product.title,
      price: pkg.product.priceString,
      perMonth: period === "year" && pkg.product.pricePerMonthString ? pkg.product.pricePerMonthString : null,
      period,
      pkg,
    };
  }).sort((a, b) => (a.period === "year" ? -1 : b.period === "year" ? 1 : 0));
}

// Ask the server to check RevenueCat for this log and update it. Returns whether it's now paid up.
export async function syncBilling(pid: string): Promise<boolean> {
  const st = store(), token = await st.idToken();
  if (!st.projectId || !token) return false;
  const res = await fetch(`https://us-central1-${st.projectId}.cloudfunctions.net/syncBilling`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ pid }),
  });
  const out = await res.json().catch(() => ({}));
  return res.ok && (out.status === "active" || out.status === "grace");
}

// Resolves true once paid; false if the person cancelled the store sheet. Throws on real errors.
export async function buy(pid: string, plan: Plan): Promise<boolean> {
  const Purchases = await asLog(pid);
  try {
    await Purchases.purchasePackage(plan.pkg);
  } catch (e) {
    if ((e as { userCancelled?: boolean })?.userCancelled) return false;
    throw e;
  }
  return syncBilling(pid);
}

export async function restore(pid: string): Promise<boolean> {
  const Purchases = await asLog(pid);
  await Purchases.restorePurchases();
  return syncBilling(pid);
}

// Where the person manages (or cancels) the subscription: the App Store or Play subscriptions page.
export async function manageUrl(pid: string): Promise<string | null> {
  const Purchases = await asLog(pid);
  return (await Purchases.getCustomerInfo()).managementURL;
}
