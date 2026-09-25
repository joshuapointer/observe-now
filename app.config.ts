// Gives each environment its own app identity so dev and beta builds install beside the real app instead of
// replacing it. Keyed on the same EXPO_PUBLIC_APP_ENV that picks the Firebase project (src/lib/config.ts), so
// only the "Observe Now" app can ever talk to the prod backend. Static values stay in app.json.
import type { ConfigContext, ExpoConfig } from "expo/config";

const VARIANTS = {
  prod: { name: "Observe Now", suffix: "" },
  beta: { name: "Observe Now Beta", suffix: "beta" },
  dev: { name: "Observe Now Dev", suffix: "dev" },
};

const env = process.env.EXPO_PUBLIC_APP_ENV;
const { name, suffix } = env === "prod" || env === "beta" ? VARIANTS[env] : VARIANTS.dev;
const id = suffix ? `com.joshpointer.observenow.${suffix}` : "com.joshpointer.observenow";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name,
  slug: config.slug ?? "observe-now",
  scheme: suffix ? `observenow-${suffix}` : "observenow",
  ios: { ...config.ios, bundleIdentifier: id },
  android: { ...config.android, package: id },
});
