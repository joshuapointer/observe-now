// Practice store: same interface as the Firebase one, kept on the device (AsyncStorage via kv).
// Lets the app be tried out with nothing sent anywhere. Seed data matches the PWA's demo.
import { PATIENT_ID, SCREENSHOTS } from "../config";
import { DEFAULT_MEDS } from "../codes";
import { kv } from "../kv";
import { seedSample } from "./sample";
import type { DataStore, SyncStatus, User } from "./types";

const KEY = "garthlog:demo-db";
const USER_KEY = "garthlog:demo-user";

type Doc = Record<string, unknown>;
const isObj = (v: unknown): v is Doc => !!v && typeof v === "object" && !Array.isArray(v);
const merge = (a: Doc | undefined, b: Doc): Doc => {
  const out: Doc = { ...a };
  for (const k of Object.keys(b)) out[k] = isObj(b[k]) && isObj(a?.[k]) ? merge(a![k] as Doc, b[k] as Doc) : b[k];
  return out;
};
const parentOf = (p: string) => p.slice(0, p.lastIndexOf("/"));
const idOf = (p: string) => p.slice(p.lastIndexOf("/") + 1);

export const DEMO_USERS: Record<"caregiver" | "family", User> = {
  caregiver: { uid: "demo-caregiver", email: "garth@demo.local", phone: "", verified: true },
  family: { uid: "demo-family", email: "ellen@demo.local", phone: "", verified: true },
};

function seed(data: Record<string, Doc>) {
  const PP = `patients/${PATIENT_ID}`;
  if (!data[PP]) {
    data[PP] = { name: "Garth", careSetting: "Home, 24-hour care", pronouns: { he: "he", him: "him", his: "his", himself: "himself" }, meds: DEFAULT_MEDS, ownerUid: "demo-caregiver" };
    data[`${PP}/members/demo-caregiver`] = { role: "caregiver", name: "Care device", relation: "", detail: "", owner: true };
    data[`${PP}/members/demo-family`] = { role: "family", name: "Ellen", relation: "daughter", detail: "Phone, 40 miles away · alerts on" };
    data[`${PP}/members/demo-family-2`] = { role: "family", name: "Ray", relation: "son", detail: "Phone, overseas · alerts on" };
    data[`${PP}/members/demo-family-3`] = { role: "family", name: "Nina", relation: "niece", detail: "Phone · alerts on" };
    data[`users/demo-caregiver/patients/${PATIENT_ID}`] = { name: "Garth", role: "caregiver" };
    data[`users/demo-family/patients/${PATIENT_ID}`] = { name: "Garth", role: "family" };
  }
  if (SCREENSHOTS && !data[`${PP}/sampled`]) { seedSample(data, PATIENT_ID); data[`${PP}/sampled`] = { at: Date.now() }; }
  // Demo roster; both PINs are 1234.
  if (!Object.keys(data).some(p => p.startsWith(`${PP}/caregivers/`))) {
    data[`${PP}/caregivers/cg-dana`] = { name: "Dana R.", pin: "353ec585d7394d12063000aca56789dfd4eea70b1b759ea31906bf78b83e6bbd", createdAt: 0 };
    data[`${PP}/caregivers/cg-sam`] = { name: "Sam K.", pin: "17d41215a749a6f38a7faf031b9144fab02b12a4777ef7bdfebb8d306a5675af", createdAt: 0 };
  }
}

// kv must already be loaded (it is, before the store is created), so the seed never overwrites saved data.
export function createLocalStore(): DataStore {
  const data: Record<string, Doc> = kv.get(KEY, {});
  seed(data);

  let persistTimer: ReturnType<typeof setTimeout> | undefined;
  const persist = () => { clearTimeout(persistTimer); persistTimer = setTimeout(() => kv.set(KEY, data), 150); };
  persist();

  const watchers = new Set<() => void>();
  // Asynchronous, like a real snapshot listener, so a write never re-enters the code that made it.
  const notify = () => setTimeout(() => watchers.forEach(w => w()), 0);
  const listCol = (path: string) => Object.keys(data).filter(p => parentOf(p) === path).map(p => ({ id: idOf(p), ...data[p] }));

  let user: User | null = DEMO_USERS[kv.get<string>(USER_KEY, "") as "caregiver" | "family"] || null;
  const authListeners = new Set<(u: User | null) => void>();

  const status: SyncStatus = { online: true, pending: 0, lastSync: Date.now() };
  let idCounter = 0;
  const write = (path: string, v: Doc, m: boolean) => { data[path] = m && data[path] ? merge(data[path], v) : v; };

  return {
    demo: true,

    onAuth(cb) { authListeners.add(cb); setTimeout(() => cb(user), 0); return () => { authListeners.delete(cb); }; },
    async signIn(role) {
      user = DEMO_USERS[role as "caregiver" | "family"] || null;
      kv.set(USER_KEY, role);
      authListeners.forEach(f => f(user));
    },
    signUp: async () => {},
    sendPhoneCode: async () => {},
    confirmPhoneCode: async () => {},
    signInWithApple: async () => {},
    async signOut() {
      user = null;
      kv.del(USER_KEY);
      authListeners.forEach(f => f(null));
    },
    sendVerification: async () => {},
    resetPassword: async () => {},
    refreshUser: async () => user,

    onStatus(cb) { cb({ ...status }); return () => {}; },

    watchDoc(path, cb) {
      const w = () => cb(data[path] ? ({ id: idOf(path), ...data[path] } as never) : null, { fromCache: false, pending: false });
      watchers.add(w); setTimeout(w, 0);
      return () => { watchers.delete(w); };
    },
    watchCol(path, cb) {
      const w = () => cb(listCol(path) as never, { fromCache: false, pending: false });
      watchers.add(w); setTimeout(w, 0);
      return () => { watchers.delete(w); };
    },
    getDoc: async path => (data[path] ? ({ id: idOf(path), ...data[path] } as never) : null),
    getCol: async path => listCol(path) as never,

    async setDoc(path, value, doMerge = true) { write(path, value, doMerge); persist(); notify(); },
    async remove(path) { delete data[path]; persist(); notify(); },
    newId: () => "d" + Date.now().toString(36) + (idCounter++).toString(36),
    async batch(ops) {
      for (const { path, data: v, merge: m = true } of ops) write(path, v, m);
      persist(); notify();
    },
    async removeMany(paths) { for (const p of paths) delete data[p]; persist(); notify(); },
    // Practice mode has no real accounts: "deleting" one starts the practice data over.
    async deleteUser() {
      for (const k of Object.keys(data)) delete data[k];
      kv.del(KEY);
      seed(data);
      user = null;
      kv.del(USER_KEY);
      authListeners.forEach(f => f(null));
    },
  };
}
