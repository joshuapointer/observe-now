import AsyncStorage from "@react-native-async-storage/async-storage";

// A synchronous key-value API (like the PWA's localStorage helper) over AsyncStorage: everything is read into
// memory once at boot, before auth callbacks run, and writes go through to disk in the background.
const cache = new Map<string, string>();
let loaded = false;

export async function loadKv() {
  if (loaded) return;
  try {
    const keys = await AsyncStorage.getAllKeys();
    const pairs = await AsyncStorage.multiGet(keys.filter(k => k.startsWith("gl:") || k.startsWith("garthlog:")));
    for (const [k, v] of pairs) if (v != null) cache.set(k, v);
  } catch {
    /* start empty */
  }
  loaded = true;
}

export const kv = {
  get<T>(k: string, d: T): T {
    const v = cache.get(k);
    if (v == null) return d;
    try { return (JSON.parse(v) ?? d) as T; } catch { return d; }
  },
  set(k: string, v: unknown) {
    const s = JSON.stringify(v);
    cache.set(k, s);
    AsyncStorage.setItem(k, s).catch(() => {});
  },
  del(k: string) {
    cache.delete(k);
    AsyncStorage.removeItem(k).catch(() => {});
  },
};
