// Subscriptions: RevenueCat is the source of truth for purchases on the App Store, Google Play and the web; these
// functions copy each care log's status onto patients/{id}.billing, which only the server can write and which the
// Firestore rules read. Each log is its own RevenueCat customer, "log_<patient id>".
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";

initializeApp();
const db = getFirestore();

const RC_SECRET = defineSecret("REVENUECAT_SECRET_KEY"); // RevenueCat project → API keys → secret key (sk_…)
const RC_WEBHOOK_AUTH = defineSecret("REVENUECAT_WEBHOOK_AUTH"); // the Authorization value set on the RevenueCat webhook
const ENTITLEMENT = "care_log";
const FOREVER = Date.UTC(9999, 0, 1);

const patientOf = appUserId => (typeof appUserId === "string" && appUserId.startsWith("log_") ? appUserId.slice(4) : null);

// Ask RevenueCat about one log and write what it says.
async function syncLog(pid, secret) {
  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(`log_${pid}`)}`, {
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`RevenueCat ${res.status}`);
  const { subscriber } = await res.json();
  const ent = subscriber?.entitlements?.[ENTITLEMENT];
  const product = ent?.product_identifier;
  const sub = product ? subscriber.subscriptions?.[product] : undefined;
  // Paid up to: the entitlement's expiry, or the end of Apple's/Google's billing grace period if that's later.
  const expires = ent ? (ent.expires_date ? Date.parse(ent.expires_date) : FOREVER) : 0;
  const grace = sub?.grace_period_expires_date ? Date.parse(sub.grace_period_expires_date) : 0;
  const until = Math.max(expires, grace);
  const now = Date.now();
  const status = until > now ? (grace > expires ? "grace" : "active") : ent ? "expired" : "none";
  const billing = {
    status,
    until: until ? Timestamp.fromMillis(until) : null,
    willRenew: !!sub && !sub.unsubscribe_detected_at && !sub.billing_issues_detected_at,
    store: sub?.store || null,
    productId: product || null,
    updatedAt: FieldValue.serverTimestamp(),
  };
  const ref = db.doc(`patients/${pid}`);
  if (!(await ref.get()).exists) return null; // a deleted log: nothing to update
  await ref.set({ billing }, { merge: true });
  return { status, until };
}

// RevenueCat → here, on every purchase, renewal, cancellation, billing issue, refund and expiry.
export const revenuecatWebhook = onRequest({ secrets: [RC_SECRET, RC_WEBHOOK_AUTH], cors: false }, async (req, res) => {
  if (req.method !== "POST" || req.get("Authorization") !== RC_WEBHOOK_AUTH.value()) { res.status(401).send("no"); return; }
  const ev = req.body?.event || {};
  const ids = new Set([ev.app_user_id, ev.original_app_user_id, ...(ev.aliases || []), ...(ev.transferred_to || []), ...(ev.transferred_from || [])]);
  const pids = [...ids].map(patientOf).filter(Boolean);
  try {
    for (const pid of new Set(pids)) await syncLog(pid, RC_SECRET.value());
    res.status(200).send("ok");
  } catch (e) {
    logger.error("webhook sync failed", { type: ev.type, pids, error: String(e) });
    res.status(500).send("retry"); // RevenueCat retries
  }
});

// The app → here, straight after a purchase or restore, so recording unlocks without waiting for the webhook.
// Only a caregiver on that log may ask.
export const syncBilling = onRequest({ secrets: [RC_SECRET], cors: true }, async (req, res) => {
  try {
    const token = (req.get("Authorization") || "").replace(/^Bearer /, "");
    const { uid } = await getAuth().verifyIdToken(token);
    const pid = String(req.body?.pid || "");
    const member = pid && (await db.doc(`patients/${pid}/members/${uid}`).get());
    if (!member?.exists || member.get("role") !== "caregiver") { res.status(403).json({ error: "not a caregiver on this log" }); return; }
    const out = await syncLog(pid, RC_SECRET.value());
    res.json({ ok: true, status: out?.status || "none", until: out?.until || 0 });
  } catch (e) {
    logger.warn("syncBilling failed", { error: String(e) });
    res.status(400).json({ error: "couldn't check the subscription" });
  }
});

// Logs created by app versions that don't stamp the trial start get it here, from the server's clock.
export const stampTrial = onDocumentCreated("patients/{pid}", async event => {
  const snap = event.data;
  if (!snap || snap.get("trialStartedAt")) return;
  await snap.ref.set({ trialStartedAt: snap.createTime }, { merge: true });
});
