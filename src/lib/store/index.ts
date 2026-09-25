import { DEMO } from "../config";
import type { DataStore } from "./types";

export type { DataStore, Op, SnapMeta, SyncStatus, Unsub, User } from "./types";

let instance: DataStore | null = null;

// Created after kv is loaded (see the root layout). Firebase is only required when it's actually used, so
// practice mode has no network dependency and still runs in Expo Go (which has no native Firebase).
export function getStore(): DataStore {
  if (!instance) {
    /* eslint-disable @typescript-eslint/no-require-imports -- lazy, so practice mode never loads Firebase */
    instance = DEMO
      ? require("./local").createLocalStore()
      : require("./firebase").createFirebaseStore();
    /* eslint-enable @typescript-eslint/no-require-imports */
  }
  return instance!;
}
