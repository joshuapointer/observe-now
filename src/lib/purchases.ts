// Buying, restoring and checking a care log's subscription through RevenueCat (App Store, Google Play). Each log is
// its own RevenueCat customer ("log_<patient id>"), so the subscription belongs to the log, not to the phone that
// paid, and every caregiver device for that log sees it. The app asks RevenueCat directly (there's no server step).
import { Platform } from "react-native";
import type { CustomerInfo, PurchasesPackage } from "react-native-purchases";

import { DEMO, SCREENSHOTS } from "./config";

const KEY = Platform.OS === "ios" ? process.env.EXPO_PUBLIC_RC_APPLE_KEY : process.env.EXPO_PUBLIC_RC_GOOGLE_KEY;
// The screenshot build shows the paywall with sample prices (for the App Store review screenshot); nothing is sold.
export const PURCHASES_AVAILABLE = SCREENSHOTS || (!DEMO && !!KEY);

const ENTITLEMENT = "care_log";
export type Entitlement = { active: boolean; until: number; willRenew: boolean };

const toEntitlement = (info: CustomerInfo): Entitlement => {
  const e = info.entitlements.active[ENTITLEMENT];
  return e
    ? { active: true, until: e.expirationDate ? Date.parse(e.expirationDate) : Date.UTC(9999, 0, 1), willRenew: e.willRenew }
    : { active: false, until: 0, willRenew: false };
};

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

const SAMPLE_PLANS: Plan[] = [
  { id: "annual", title: "Yearly", price: "$299.00", perMonth: "$24.92", period: "year", pkg: { product: { price: 299 } } as unknown as PurchasesPackage },
  { id: "monthly", title: "Monthly", price: "$29.99", perMonth: null, period: "month", pkg: { product: { price: 29.99 } } as unknown as PurchasesPackage },
];

export async function loadPlans(pid: string): Promise<Plan[]> {
  if (SCREENSHOTS) return SAMPLE_PLANS;
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

// Whether this log is subscribed right now (RevenueCat caches it, so this is quick and works briefly offline).
export async function checkEntitlement(pid: string): Promise<Entitlement> {
  if (SCREENSHOTS) return { active: false, until: 0, willRenew: false };
  const Purchases = await asLog(pid);
  return toEntitlement(await Purchases.getCustomerInfo());
}

// The log's entitlement after buying; null if the person cancelled the store sheet. Throws on real errors.
export async function buy(pid: string, plan: Plan): Promise<Entitlement | null> {
  const Purchases = await asLog(pid);
  try {
    return toEntitlement((await Purchases.purchasePackage(plan.pkg)).customerInfo);
  } catch (e) {
    if ((e as { userCancelled?: boolean })?.userCancelled) return null;
    throw e;
  }
}

export async function restore(pid: string): Promise<Entitlement> {
  const Purchases = await asLog(pid);
  return toEntitlement(await Purchases.restorePurchases());
}

// Where the person manages (or cancels) the subscription: the App Store or Play subscriptions page.
export async function manageUrl(pid: string): Promise<string | null> {
  const Purchases = await asLog(pid);
  return (await Purchases.getCustomerInfo()).managementURL;
}
