// Which backend the app talks to. Dev is the default so a stray build can't write to real people's logs.
// The Firebase project itself is chosen at build time: app.config.ts bundles firebase/<env>/GoogleService-Info.plist,
// and dev and beta both point at garth-log-dev. Beta is the TestFlight app: its own install, on the dev backend,
// so testers never touch real people's logs.
export type AppEnv = "dev" | "beta" | "prod" | "demo";

const raw = process.env.EXPO_PUBLIC_APP_ENV;
export const ENV: AppEnv = raw === "prod" || raw === "beta" || raw === "demo" ? raw : "dev";
export const DEMO = ENV === "demo";
// The App Store screenshot build: practice mode with a believable recent history and no PRACTICE marker.
export const SCREENSHOTS = DEMO && process.env.EXPO_PUBLIC_SCREENSHOTS === "1";

// The marker shown on every screen of anything that isn't production (null in production).
export const ENV_TAG: { text: string; label: string } | null =
  ENV === "prod" || SCREENSHOTS ? null
  : ENV === "demo" ? { text: "PRACTICE", label: "Practice mode" }
  : ENV === "beta" ? { text: "BETA", label: "Beta version" }
  : { text: "DEV", label: "Development version" };

// The id the original single-patient version used. Existing data under it is picked up automatically.
export const PATIENT_ID = "garth";

// The log is organised by calendar day (midnight to midnight): one continuous record of 15-minute boxes.
export const SLOT_MIN = 15;

export const APP_NAME = "Observe Now";
