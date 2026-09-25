import { Alert } from "react-native";

import { set } from "./app";

let toastTimer: ReturnType<typeof setTimeout> | undefined;

// A short message at the bottom of the screen; with `undo`, it offers Undo for 7 seconds.
export function toast(msg: string, undo: (() => Promise<unknown>) | null = null) {
  set({ toast: msg, undo });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => set({ toast: "", undo: null }), undo ? 7000 : 2800);
}

export function clearToast() {
  clearTimeout(toastTimer);
  set({ toast: "", undo: null });
}

// Firestore applies a write on this device at once and queues it while offline, but the promise only settles
// when the server answers — which can be hours away. So callers confirm straight away and never await this;
// it only speaks up if the server refuses (permissions, etc.). Resolves to whether the write went through.
export function run<T>(p: Promise<T> | T): Promise<boolean> {
  return Promise.resolve(p).then(() => true, (e: { code?: string }) => {
    console.error(e);
    toast(e?.code === "permission-denied"
      ? "That didn't save — you don't have permission to do that."
      : "That didn't save yet. It will be tried again automatically.");
    return false;
  });
}

// "Are you sure?" in plain words, as a native dialog.
export function ask(o: { title: string; body: string; yes: string; no?: string; destructive?: boolean }) {
  return new Promise<boolean>(resolve => {
    Alert.alert(o.title, o.body, [
      { text: o.no || "Not yet", style: "cancel", onPress: () => resolve(false) },
      { text: o.yes, style: o.destructive ? "destructive" : "default", onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}
