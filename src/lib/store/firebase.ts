// React Native Firebase (the native iOS/Android SDKs). Which project it talks to comes from the
// GoogleService-Info.plist that app.config.ts bundles for the build's environment, not from code.
import NetInfo from "@react-native-community/netinfo";
import {
  AppleAuthProvider, createUserWithEmailAndPassword, deleteUser, getAuth, getIdToken, onAuthStateChanged, reload,
  sendEmailVerification, sendPasswordResetEmail, signInWithCredential, signInWithEmailAndPassword,
  signInWithPhoneNumber, signOut as fbSignOut, type ConfirmationResult, type User as FbUser,
} from "@react-native-firebase/auth";
import {
  collection, deleteDoc, doc, getDoc as fbGetDoc, getDocs, getFirestore, onSnapshot, setDoc as fbSetDoc,
  writeBatch, type SnapshotMetadata,
} from "@react-native-firebase/firestore";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import * as Device from "expo-device";

import type { DataStore, SyncStatus, User } from "./types";

export function createFirebaseStore(): DataStore {
  const auth = getAuth();
  // Phone sign-in proves it's really this app with a silent APNs push (the key is uploaded in each Firebase
  // project), falling back to a reCAPTCHA page when no push arrives. A simulator never gets that push, so in
  // development there only the console's test numbers are used and verification is skipped. Real devices,
  // and every release build, always verify.
  if (__DEV__ && !Device.isDevice) auth.settings.appVerificationDisabledForTesting = true;
  // The native SDK keeps a persistent on-disk cache by default, so writes made offline survive a restart.
  const db = getFirestore();

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

  // Verified: a confirmed email, a phone number (confirmed by the code it signed in with), or an Apple account
  // (Apple has verified the person, even when it shares no email). Mirrors verified() in the Firestore rules.
  const toUser = (u: FbUser | null): User | null => u && {
    uid: u.uid,
    email: (u.email || "").toLowerCase(),
    phone: u.phoneNumber || "",
    verified: u.emailVerified || !!u.phoneNumber || u.providerData.some(p => p.providerId === "apple.com"),
  };

  let confirmation: ConfirmationResult | null = null;

  return {
    demo: false,

    onAuth(cb) { return onAuthStateChanged(auth, u => cb(toUser(u))); },
    signIn: (email, pw) => signInWithEmailAndPassword(auth, email, pw || ""),
    async signUp(email, pw) {
      const cred = await createUserWithEmailAndPassword(auth, email, pw);
      await sendEmailVerification(cred.user);
    },
    async sendPhoneCode(phone) { confirmation = await signInWithPhoneNumber(auth, phone); },
    async confirmPhoneCode(code) {
      if (!confirmation) throw Object.assign(new Error("No code was sent"), { code: "auth/missing-verification-id" });
      await confirmation.confirm(code);
      confirmation = null;
    },
    async signInWithApple() {
      // Apple gets the hash of the nonce; Firebase gets the raw one and checks they match.
      const nonce = Crypto.randomUUID();
      const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);
      const res = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
        nonce: hashed,
      });
      if (!res.identityToken) throw Object.assign(new Error("Apple returned no token"), { code: "auth/invalid-credential" });
      await signInWithCredential(auth, AppleAuthProvider.credential(res.identityToken, nonce));
    },
    signOut: () => fbSignOut(auth),
    sendVerification: async () => { if (auth.currentUser) await sendEmailVerification(auth.currentUser); },
    resetPassword: email => sendPasswordResetEmail(auth, email),
    async refreshUser() {
      if (!auth.currentUser) return null;
      await reload(auth.currentUser);
      await getIdToken(auth.currentUser, true); // pick up email_verified for the security rules
      return toUser(auth.currentUser);
    },

    onStatus(cb) { statusListeners.add(cb); cb({ ...status }); return () => { statusListeners.delete(cb); }; },

    watchDoc(path, cb, onError) {
      return onSnapshot(doc(db, path), { includeMetadataChanges: true }, snap => {
        noteMeta(snap.metadata);
        cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as never) : null, { fromCache: snap.metadata.fromCache, pending: snap.metadata.hasPendingWrites });
      }, err => (onError ? onError(err) : console.warn(path, err)));
    },
    watchCol(path, cb, onError) {
      return onSnapshot(collection(db, path), { includeMetadataChanges: true }, snap => {
        noteMeta(snap.metadata);
        cb(snap.docs.map(d => ({ id: d.id, ...d.data() }) as never), { fromCache: snap.metadata.fromCache, pending: snap.metadata.hasPendingWrites });
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

    setDoc: (path, data, merge = true) => acked(fbSetDoc(doc(db, path), stripUndefined(data), { merge })),
    remove: path => acked(deleteDoc(doc(db, path))),
    newId: path => doc(collection(db, path)).id,
    batch(ops) {
      const b = writeBatch(db);
      for (const { path, data, merge = true } of ops) b.set(doc(db, path), stripUndefined(data), { merge });
      return acked(b.commit());
    },
    // Waits for the server (not acked): an account is deleted only once its data is really gone.
    async removeMany(paths) {
      for (let i = 0; i < paths.length; i += 450) {
        const b = writeBatch(db);
        for (const path of paths.slice(i, i + 450)) b.delete(doc(db, path));
        await b.commit();
      }
    },
    async deleteUser() { if (auth.currentUser) await deleteUser(auth.currentUser); },
  };
}

// The JS SDK was set to ignore undefined fields; the native one rejects them. Nested objects too.
function stripUndefined(v: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, x] of Object.entries(v)) {
    if (x === undefined) continue;
    out[k] = x && typeof x === "object" && !Array.isArray(x) && Object.getPrototypeOf(x) === Object.prototype
      ? stripUndefined(x as Record<string, unknown>) : x;
  }
  return out;
}
