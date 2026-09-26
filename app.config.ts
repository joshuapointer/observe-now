// Gives each environment its own app identity so dev and beta builds install beside the real app instead of
// replacing it, and bundles that environment's Firebase config (firebase/<env>/, downloaded from the Firebase
// console for exactly that bundle id). Keyed on the same EXPO_PUBLIC_APP_ENV the app reads (src/lib/config.ts),
// so only the "Observe Now" app can ever talk to the prod backend. Static values stay in app.json.
import { existsSync } from "node:fs";

import type { ConfigContext, ExpoConfig } from "expo/config";

const VARIANTS = {
  prod: { name: "Observe Now", suffix: "", firebase: "prod" }, // behavior-observation-2d03f
  beta: { name: "Observe Now Beta", suffix: "beta", firebase: "beta" }, // garth-log-dev
  dev: { name: "Observe Now Dev", suffix: "dev", firebase: "dev" }, // garth-log-dev
};

const env = process.env.EXPO_PUBLIC_APP_ENV;
const { name, suffix, firebase } = env === "prod" || env === "beta" ? VARIANTS[env] : VARIANTS.dev;
const id = suffix ? `com.joshpointer.observenow.${suffix}` : "com.joshpointer.observenow";
// Android config per environment (firebase/<env>/google-services.json), downloaded for exactly that package name.
const androidFirebase = `./firebase/${firebase}/google-services.json`;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name,
  slug: config.slug ?? "observe-now",
  scheme: suffix ? `observenow-${suffix}` : "observenow",
  ios: { ...config.ios, bundleIdentifier: id, googleServicesFile: `./firebase/${firebase}/GoogleService-Info.plist` },
  android: { ...config.android, package: id, ...(existsSync(androidFirebase) && { googleServicesFile: androidFirebase }) },
});
