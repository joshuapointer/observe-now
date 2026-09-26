// email is "" for a phone-only account and phone is "" otherwise. verified: a confirmed email address or a
// phone number (which is confirmed by the text code it signed in with).
export type User = { uid: string; email: string; phone: string; verified: boolean };
export type SyncStatus = { online: boolean; pending: number; lastSync: number };

// fromCache: the snapshot came from the local cache, not the server. A cold start offline, or a document never
// synced to this device, reads as "doesn't exist" from cache, so anything that deletes or creates on absence must
// wait for a server answer.
// pending: it includes this device's own writes the server hasn't confirmed yet. Security rules are checked
// against the server's state, so nothing that reads *other* documents may act on a pending snapshot.
export type SnapMeta = { fromCache: boolean; pending: boolean };

export type Op = { path: string; data: Record<string, unknown>; merge?: boolean };
export type Unsub = () => void;

export interface DataStore {
  demo: boolean;
  onAuth(cb: (u: User | null) => void): Unsub;
  signIn(email: string, pw?: string): Promise<unknown>;
  signUp(email: string, pw: string): Promise<void>;
  sendPhoneCode(phone: string): Promise<void>;
  confirmPhoneCode(code: string): Promise<void>;
  signInWithApple(): Promise<void>;
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
  serverTime(): unknown; // a value the server replaces with its own clock when the write lands
  // For calling our Cloud Functions: the Firebase project and a fresh ID token for the signed-in account.
  projectId: string | null;
  idToken(): Promise<string | null>;
  batch(ops: Op[]): Promise<void>;
  removeMany(paths: string[]): Promise<void>; // deletes in batches; used to delete a whole log
  deleteUser(): Promise<void>; // the signed-in account itself; rejects with auth/requires-recent-login if it's been a while
}
