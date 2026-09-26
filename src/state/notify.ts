// Push notifications, app side: registering this device on the open log, deciding who hears about what, and
// opening the right screen when a notification is tapped.
//   Messages from family      → the caregiver devices
//   Messages from a caregiver → family
//   Red alerts, fall reports, notes shared with family → family
//   Every entry → family who switched on "Every update" (per person, in Settings)
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { AppState as RNAppState, Platform } from "react-native";
import { create } from "zustand";

import { recipients, type Audience, type DeviceDoc } from "@/lib/audience";
import { kv } from "@/lib/kv";
import { askPermission, CHANNELS, flushOutbox, installId, permission, PUSH_AVAILABLE, pushToken, sendPush, type Channel, type PushPermission } from "@/lib/push";
import { getStore } from "@/lib/store";
import { actingAs, get, useApp } from "./app";

type PushState = { perm: PushPermission | null; every: boolean };
export const usePush = create<PushState>(() => ({ perm: null, every: false }));

const everyKey = (uid: string, pid: string) => `gl:every:${uid}:${pid}`;
const devicePath = (pid: string) => `patients/${pid}/devices/${installId()}`;

// Called when a log opens and whenever this device's side of the app changes: asks for permission the first
// time, then keeps this device's entry on the log current.
export async function registerDevice() {
  const S = get(), mode = actingAs(S), user = S.user, pid = S.pid;
  if (!PUSH_AVAILABLE || !user || !pid || !mode || getStore().demo) return;
  const every = kv.get(everyKey(user.uid, pid), false);
  usePush.setState({ every });
  try {
    const perm = await askPermission();
    usePush.setState({ perm });
    const token = perm === "granted" ? await pushToken() : null;
    if (!token || get().pid !== pid) return;
    const doc: Omit<DeviceDoc, "id"> = { uid: user.uid, token, platform: Platform.OS, mode, every: mode === "family" && every, at: Date.now() };
    await getStore().setDoc(devicePath(pid), doc, false);
  } catch (e) { if (__DEV__) console.warn("[push] register", e); }
}

export async function refreshPermission() {
  if (PUSH_AVAILABLE) usePush.setState({ perm: await permission().catch(() => null) });
}

export function setEvery(on: boolean) {
  const S = get();
  if (!S.user || !S.pid) return;
  kv.set(everyKey(S.user.uid, S.pid), on);
  usePush.setState({ every: on });
  registerDevice();
}

// Signing out: this device stops getting notifications for every log this login follows.
export async function unregisterDevice(pids: string[]) {
  if (!PUSH_AVAILABLE || getStore().demo) return;
  await Promise.all(pids.map(p => getStore().remove(devicePath(p)).catch(() => {})));
}

type Note = { title: string; body: string; kind: "message" | "alert" | "note" | "update"; channel: Channel; thread?: string };

// Sends from this phone. Never throws and never holds up the save it follows.
export async function notify(audience: Audience, n: Note) {
  const S = get(), pid = S.pid;
  if (!PUSH_AVAILABLE || !pid || getStore().demo) return;
  try {
    const devices = await getStore().getCol<DeviceDoc>(`patients/${pid}/devices`);
    const to = recipients(devices, S.members.map(m => m.id), audience, installId());
    await sendPush(to.map(t => ({
      to: t,
      title: n.title,
      body: n.body.length > 240 ? n.body.slice(0, 237) + "…" : n.body,
      data: { pid, kind: n.kind, ...(n.thread ? { thread: n.thread } : {}) },
      channelId: CHANNELS[n.channel],
      sound: "default",
      ...(n.kind === "alert" ? { priority: "high" as const } : {}),
    })));
  } catch (e) { if (__DEV__) console.warn("[push] send", e); }
}

// ---- tapping a notification ----
type Opened = { pid: string; kind: string; thread?: string };
let opened: Opened | null = null;

function onOpen(data: Record<string, unknown> | undefined) {
  const pid = typeof data?.pid === "string" ? data.pid : null;
  if (!pid) return;
  opened = { pid, kind: String(data?.kind || ""), thread: typeof data?.thread === "string" ? data.thread : undefined };
  goIfReady();
}

// Opens the notification's log once this login's list of logs has loaded (a cold start gets there a moment after
// the tap), then, once it's open (and on a care device someone is on shift), shows the screen.
export function goIfReady() {
  const S = get(), o = opened, mode = actingAs(S);
  if (!o || !S.user || !S.links) return;
  if (S.pid !== o.pid) {
    if (S.links.some(l => l.id === o.pid)) selectFn(o.pid);
    else opened = null; // not on that log any more
    return;
  }
  if (!mode || (mode === "care" && !S.patient?.onShift)) return;
  opened = null;
  if (o.thread) openThreadFn(o.thread);
  setTimeout(() => {
    try {
      if (o.kind === "message") router.navigate(mode === "care" ? "/messages" : "/family-messages");
      else if (mode === "family") router.navigate("/family");
    } catch { /* navigator not mounted yet: stay put */ }
  }, 50);
}
let openThreadFn: (id: string) => void = () => {};
let selectFn: (pid: string) => void = () => {};

// Once, at boot. select opens a log; thread opens a conversation.
export function setUpNotifications(select: (pid: string) => void, thread: (id: string) => void) {
  if (!PUSH_AVAILABLE) return;
  openThreadFn = thread;
  selectFn = select;
  // In the app already, looking at this person: the screen shows it, so only alerts still get a banner.
  Notifications.setNotificationHandler({
    handleNotification: async n => {
      const d = n.request.content.data as Record<string, unknown> | undefined;
      const here = RNAppState.currentState === "active" && d?.pid === get().pid && d?.kind !== "alert";
      return { shouldShowBanner: !here, shouldShowList: !here, shouldPlaySound: !here, shouldSetBadge: false };
    },
  });
  const last = Notifications.getLastNotificationResponse();
  if (last) { onOpen(last.notification.request.content.data as Record<string, unknown>); Notifications.clearLastNotificationResponse(); }
  Notifications.addNotificationResponseReceivedListener(r => onOpen(r.notification.request.content.data as Record<string, unknown>));
  flushOutbox();
  // A tapped notification waits here for its log to open; a send queued offline goes when the connection returns.
  let online = get().status.online;
  useApp.subscribe(S => {
    if (opened) goIfReady();
    if (S.status.online && !online) flushOutbox();
    online = S.status.online;
  });
  RNAppState.addEventListener("change", s => { if (s === "active") { flushOutbox(); refreshPermission(); } });
}
