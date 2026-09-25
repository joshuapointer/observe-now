import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword, getAuth, getReactNativePersistence, initializeAuth, onAuthStateChanged,
  sendEmailVerification, sendPasswordResetEmail, signOut as fbSignOut, signInWithEmailAndPassword,
  type Auth, type User as FbUser,
} from "@firebase/auth"; // not firebase/auth: only @firebase/auth has the react-native build (getReactNativePersistence)
import {
  collection, deleteDoc, doc, getDoc as fbGetDoc, getDocs, getFirestore, initializeFirestore, memoryLocalCache,
  onSnapshot, setDoc as fbSetDoc, writeBatch, type Firestore, type SnapshotMetadata,
} from "firebase/firestore";

import type { FirebaseWebConfig } from "../config";
import type { DataStore, SyncStatus, User } from "./types";

export function createFirebaseStore(config: FirebaseWebConfig): DataStore {
  // Guarded so Fast Refresh re-running this module doesn't throw auth/already-initialized.
  const fresh = !getApps().length;
  const app = fresh ? initializeApp(config) : getApp();
  let auth: Auth;
  let db: Firestore;
  if (fresh) {
    auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
    // Memory cache: the only one the JS SDK has on React Native. Writes still queue while offline.
    db = initializeFirestore(app, { localCache: memoryLocalCache(), ignoreUndefinedProperties: true });
  } else {
    auth = getAuth(app);
    db = getFirestore(app);
  }

  const status: SyncStatus = { online: true, pending: 0, lastSync: 0 };
  const statusListeners = new Set<(s: SyncStatus) => void>();
  const emitStatus = () => statusListeners.forEach(f => f({ ...status }));
  // isInternetReachable starts as null (unknown); only an explicit false counts as offline.
  NetInfo.addEventListener(s => {
    const online = s.isConnected !== false && s.isInternetReachable !== false;
    if (online !== status.online) { status.online = online; emitStatus(); }
  });

  const noteMeta = (meta: SnapshotMetadata) => {
    if (!meta.fromCache) status.lastSync = Date.now();
    status.pending = meta.hasPendingWrites ? 1 : 0;
    emitStatus();
  };
  const acked = <T,>(p: Promise<T>) => p.then(r => { status.lastSync = Date.now(); emitStatus(); return r; });

  const toUser = (u: FbUser | null): User | null => u && { uid: u.uid, email: (u.email || "").toLowerCase(), emailVerified: u.emailVerified };

  return {
    demo: false,

    onAuth(cb) { return onAuthStateChanged(auth, u => cb(toUser(u))); },
    signIn: (email, pw) => signInWithEmailAndPassword(auth, email, pw || ""),
    async signUp(email, pw) {
      const cred = await createUserWithEmailAndPassword(auth, email, pw);
      await sendEmailVerification(cred.user);
    },
    signOut: () => fbSignOut(auth),
    sendVerification: async () => { if (auth.currentUser) await sendEmailVerification(auth.currentUser); },
    resetPassword: email => sendPasswordResetEmail(auth, email),
    async refreshUser() {
      if (!auth.currentUser) return null;
      await auth.currentUser.reload();
      await auth.currentUser.getIdToken(true); // pick up email_verified for the security rules
      return toUser(auth.currentUser);
    },

    onStatus(cb) { statusListeners.add(cb); cb({ ...status }); return () => { statusListeners.delete(cb); }; },

    watchDoc(path, cb, onError) {
      return onSnapshot(doc(db, path), { includeMetadataChanges: true }, snap => {
        noteMeta(snap.metadata);
        cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as never) : null, { fromCache: snap.metadata.fromCache });
      }, err => (onError ? onError(err) : console.warn(path, err)));
    },
    watchCol(path, cb, onError) {
      return onSnapshot(collection(db, path), { includeMetadataChanges: true }, snap => {
        noteMeta(snap.metadata);
        cb(snap.docs.map(d => ({ id: d.id, ...d.data() }) as never), { fromCache: snap.metadata.fromCache });
      }, err => (onError ? onError(err) : console.warn(path, err)));
    },
    async getDoc(path) {
      const snap = await fbGetDoc(doc(db, path));
      return snap.exists() ? ({ id: snap.id, ...snap.data() } as never) : null;
    },
    async getCol(path) {
      const snap = await getDocs(collection(db, path));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as never);
    },

    setDoc: (path, data, merge = true) => acked(fbSetDoc(doc(db, path), data, { merge })),
    remove: path => acked(deleteDoc(doc(db, path))),
    newId: path => doc(collection(db, path)).id,
    batch(ops) {
      const b = writeBatch(db);
      for (const { path, data, merge = true } of ops) b.set(doc(db, path), data, { merge });
      return acked(b.commit());
    },
  };
}
