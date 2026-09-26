// Push notifications, device side: permission, this device's Expo push token, the Android channels, and sending
// through Expo's push service. There is no server: the phone that saves a message or an entry sends the
// notification itself (src/state/notify.ts decides who to). A send that fails offline waits in an outbox and goes
// once the phone is back online.
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { DEMO } from "./config";
import { kv } from "./kv";

export const PUSH_AVAILABLE = !DEMO && Platform.OS !== "web";

// Android shows alerts on their own channel, so people can give them a louder sound than messages.
export const CHANNELS = { messages: "messages", alerts: "alerts", updates: "updates" } as const;
export type Channel = keyof typeof CHANNELS;

export async function setUpChannels() {
  if (Platform.OS !== "android") return;
  await Promise.all([
    Notifications.setNotificationChannelAsync(CHANNELS.messages, { name: "Messages", importance: Notifications.AndroidImportance.HIGH }),
    Notifications.setNotificationChannelAsync(CHANNELS.alerts, { name: "Red alerts", importance: Notifications.AndroidImportance.MAX, vibrationPattern: [0, 400, 200, 400] }),
    Notifications.setNotificationChannelAsync(CHANNELS.updates, { name: "Updates and notes", importance: Notifications.AndroidImportance.DEFAULT }),
  ]);
}

export type PushPermission = "granted" | "denied" | "undetermined";
export async function permission(): Promise<PushPermission> {
  const p = await Notifications.getPermissionsAsync();
  return p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ? "granted" : p.canAskAgain ? "undetermined" : "denied";
}

// Asks once (the system only ever shows its prompt once); after that it just reports.
export async function askPermission(): Promise<PushPermission> {
  if (!PUSH_AVAILABLE) return "denied";
  await setUpChannels(); // Android 13+ only prompts once a channel exists
  const now = await permission();
  if (now !== "undetermined") return now;
  const r = await Notifications.requestPermissionsAsync();
  return r.granted ? "granted" : "denied";
}

export async function pushToken(): Promise<string | null> {
  if (!PUSH_AVAILABLE || (await permission()) !== "granted") return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  const t = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  return t.data;
}

// One id per install, so each device has its own entry on a log even when a login is shared.
export function installId(): string {
  let id = kv.get<string>("gl:installId", "");
  if (!id) {
    id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    kv.set("gl:installId", id);
  }
  return id;
}

export type PushMessage = { to: string; title: string; body: string; data: Record<string, unknown>; channelId: string; sound?: "default"; priority?: "high" };

const OUTBOX = "gl:pushOutbox";
const MAX_AGE = 6 * 3600000; // a notification more than six hours late is noise, not news

async function post(messages: PushMessage[]) {
  for (let i = 0; i < messages.length; i += 100) {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(messages.slice(i, i + 100)),
    });
    if (!res.ok) throw new Error(`push ${res.status}`);
  }
}

export async function sendPush(messages: PushMessage[]) {
  if (!messages.length) return;
  try { await post(messages); }
  catch (e) {
    if (__DEV__) console.warn("[push]", e);
    kv.set(OUTBOX, [...kv.get<{ at: number; messages: PushMessage[] }[]>(OUTBOX, []), { at: Date.now(), messages }]);
  }
}

let flushing = false;
export async function flushOutbox() {
  const queued = kv.get<{ at: number; messages: PushMessage[] }[]>(OUTBOX, []);
  if (flushing || !queued.length) return;
  flushing = true;
  kv.set(OUTBOX, []);
  const fresh = queued.filter(q => Date.now() - q.at < MAX_AGE);
  for (const q of fresh) await sendPush(q.messages); // failures go back in the outbox
  flushing = false;
}
