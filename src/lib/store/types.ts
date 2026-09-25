export type User = { uid: string; email: string; emailVerified: boolean };
export type SyncStatus = { online: boolean; pending: number; lastSync: number };

// fromCache: the snapshot came from the local cache, not the server. With the memory-only cache the JS SDK
// has on React Native, a cold start while offline reports "doesn't exist" from cache for everything, so
// anything that deletes or creates on absence must wait for a server answer.
export type SnapMeta = { fromCache: boolean };

export type Op = { path: string; data: Record<string, unknown>; merge?: boolean };
export type Unsub = () => void;

export interface DataStore {
  demo: boolean;
  onAuth(cb: (u: User | null) => void): Unsub;
  signIn(email: string, pw?: string): Promise<unknown>;
  signUp(email: string, pw: string): Promise<void>;
  signOut(): Promise<void>;
  sendVerification(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  refreshUser(): Promise<User | null>;
  onStatus(cb: (s: SyncStatus) => void): Unsub;

  watchDoc<T>(path: string, cb: (d: T | null, meta: SnapMeta) => void, onError?: (e: unknown) => void): Unsub;
  watchCol<T>(path: string, cb: (l: T[], meta: SnapMeta) => void, onError?: (e: unknown) => void): Unsub;
  getDoc<T>(path: string): Promise<T | null>;
  getCol<T>(path: string): Promise<T[]>;
  setDoc(path: string, data: Record<string, unknown>, merge?: boolean): Promise<void>;
  remove(path: string): Promise<void>;
  newId(path: string): string;
  batch(ops: Op[]): Promise<void>;
}
