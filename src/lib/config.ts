// Which backend the app talks to. Dev is the default so a stray build can't write to real people's logs.
// The web configs are the public Firebase web-app configs (the same ones Firebase Hosting serves at
// /__/firebase/init.json), so the app and the PWA share one Firestore per environment. Beta is the TestFlight
// app: its own install, on the dev backend, so testers never touch real people's logs.
export type AppEnv = "dev" | "beta" | "prod" | "demo";

const raw = process.env.EXPO_PUBLIC_APP_ENV;
export const ENV: AppEnv = raw === "prod" || raw === "beta" || raw === "demo" ? raw : "dev";
export const DEMO = ENV === "demo";

export type FirebaseWebConfig = {
  apiKey: string;
  appId: string;
  authDomain: string;
  messagingSenderId: string;
  projectId: string;
  storageBucket: string;
};

const FIREBASE: Record<"dev" | "prod", FirebaseWebConfig> = {
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

export const firebaseConfig: FirebaseWebConfig | null = ENV === "demo" ? null : FIREBASE[ENV === "prod" ? "prod" : "dev"];

// The marker shown on every screen of anything that isn't production (null in production).
export const ENV_TAG: { text: string; label: string } | null =
  ENV === "prod" ? null
  : ENV === "demo" ? { text: "PRACTICE", label: "Practice mode" }
  : ENV === "beta" ? { text: "BETA", label: "Beta version" }
  : { text: "DEV", label: "Development version" };

// The id the original single-patient version used. Existing data under it is picked up automatically.
export const PATIENT_ID = "garth";

// The log is organised by calendar day (midnight to midnight): one continuous record of 15-minute boxes.
export const SLOT_MIN = 15;

export const APP_NAME = "Observe Now";
