// Which backend the app talks to. Dev is the default so a stray build can't write to real people's logs.
// The web configs are the public Firebase web-app configs (the same ones Firebase Hosting serves at
// /__/firebase/init.json), so the app and the PWA share one Firestore per environment.
export type AppEnv = "dev" | "prod" | "demo";

const raw = process.env.EXPO_PUBLIC_APP_ENV;
export const ENV: AppEnv = raw === "prod" || raw === "demo" ? raw : "dev";
export const DEMO = ENV === "demo";

export type FirebaseWebConfig = {
  apiKey: string;
  appId: string;
  authDomain: string;
  messagingSenderId: string;
  projectId: string;
  storageBucket: string;
};

const FIREBASE: Record<Exclude<AppEnv, "demo">, FirebaseWebConfig> = {
  dev: {
    apiKey: "AIzaSyA9uHAnMtlqTZ013E_jUQC3gTitI6jO1fc",
    appId: "1:150892806433:web:9a4a1fab3ed127b4dc7e60",
    authDomain: "garth-log-dev.firebaseapp.com",
    messagingSenderId: "150892806433",
    projectId: "garth-log-dev",
    storageBucket: "garth-log-dev.firebasestorage.app",
  },
  prod: {
    apiKey: "AIzaSyAfknK049Y6zKg86i6JJ9GexxZ2AeD0Rqs",
    appId: "1:1016222315473:web:ad302caaf87f274db166f0",
    authDomain: "behavior-observation-2d03f.firebaseapp.com",
    messagingSenderId: "1016222315473",
    projectId: "behavior-observation-2d03f",
    storageBucket: "behavior-observation-2d03f.firebasestorage.app",
  },
};

export const firebaseConfig: FirebaseWebConfig | null = ENV === "demo" ? null : FIREBASE[ENV];

// The id the original single-patient version used. Existing data under it is picked up automatically.
export const PATIENT_ID = "garth";

// The log is organised by calendar day (midnight to midnight): one continuous record of 15-minute boxes.
export const SLOT_MIN = 15;

export const APP_NAME = "Observe Now";
