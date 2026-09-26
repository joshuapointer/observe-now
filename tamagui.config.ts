// The design system, taken from the app icon's glass: lavender-iris accent, a deep lens navy at night, a signal green
// for "live", the aperture ring's blue-to-aqua, one colour family per code category (see src/ui/cat.ts), Nunito,
// and spring animations run on the UI thread by Reanimated.
import {
  amber, amberDark, blue, blueDark, green, greenDark, orange, orangeDark, purple, purpleDark, red, redDark, slate, slateDark,
} from "@tamagui/colors";
import { createV5Theme, defaultConfig } from "@tamagui/config/v5";
import { animationsReanimated } from "@tamagui/config/v5-reanimated";
import { createFont, createTamagui } from "tamagui";

const face = {
  400: { normal: "Nunito_400Regular" },
  500: { normal: "Nunito_600SemiBold" },
  600: { normal: "Nunito_600SemiBold" },
  700: { normal: "Nunito_700Bold" },
  800: { normal: "Nunito_800ExtraBold" },
  900: { normal: "Nunito_900Black" },
};

// Sizes follow iOS text styles, a notch larger at the body end: this is read at arm's length, at night.
const size = { 1: 12, 2: 13, 3: 15, 4: 17, true: 17, 5: 19, 6: 22, 7: 26, 8: 30, 9: 36, 10: 44 };
const lineHeight = Object.fromEntries(Object.entries(size).map(([k, v]) => [k, Math.round(v * 1.3)])) as { [K in keyof typeof size]: number };

const nunito = createFont({
  family: "Nunito_400Regular",
  size,
  lineHeight,
  weight: { 1: "400", 4: "600", 5: "700", 6: "800", 7: "900" },
  letterSpacing: { 1: 0, 4: 0, 9: -0.4 },
  face,
});

const palette = (o: Record<string, string>) => Object.values(o);

// Iris: the lavender-blue of the icon's glass (Radix iris), used as the accent.
const iris = ["#fdfdff", "#f8f8ff", "#f0f1fe", "#e6e7ff", "#dadcff", "#cbcdff", "#b8baf8", "#9b9ef0", "#5b5bd6", "#5151cd", "#5753c6", "#272962"];
const irisDark = ["#13131e", "#171625", "#202248", "#262a65", "#303374", "#3d3e82", "#4a4a95", "#5958b1", "#5b5bd6", "#6e6ade", "#b1a9ff", "#e0dffe"];
type Steps<N extends string> = { [K in `${N}${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12}`]: string };
const named = <N extends string>(name: N, steps: string[]) => Object.fromEntries(steps.map((v, i) => [`${name}${i + 1}`, v])) as Steps<N>;

const themes = createV5Theme({
  lightPalette: palette(slate),
  darkPalette: palette(slateDark),
  accent: {
    light: named("accent", iris),
    dark: named("accent", irisDark),
  },
  childrenThemes: {
    blue: { light: blue, dark: blueDark },
    purple: { light: purple, dark: purpleDark },
    orange: { light: orange, dark: orangeDark },
    green: { light: green, dark: greenDark },
    red: { light: red, dark: redDark },
    indigo: { light: named("indigo", iris), dark: named("indigo", irisDark) }, // "no category": the brand's iris
    amber: { light: amber, dark: amberDark }, // notes
  },
});

// Two surfaces on top of the palette: the page behind everything, and the cards that sit on it (lighter than
// the page in both light and dark). Every theme gets them, so a coloured sub-theme can still reach them.
const surfaces = {
  // Light: a lavender mist. Night: the navy of the lens.
  light: { page: "#f2f1f9", card: "#ffffff", cardLine: "#e3e2ef", signal: "#1fbf5c", aquaA: "#4a90c0", aquaB: "#4fb3a2" },
  dark: { page: "#0b0c18", card: "#161728", cardLine: "#26273d", signal: "#2fe06f", aquaA: "#5aa2d0", aquaB: "#5fc8b4" },
};
const withSurfaces = Object.fromEntries(
  Object.entries(themes).map(([name, t]) => [name, { ...t, ...surfaces[name.startsWith("dark") ? "dark" : "light"] }]),
) as { [K in keyof typeof themes]: (typeof themes)[K] & typeof surfaces.light };

export const config = createTamagui({
  ...defaultConfig,
  themes: withSurfaces,
  animations: animationsReanimated,
  fonts: { body: nunito, heading: nunito },
  settings: {
    ...defaultConfig.settings,
    // Plain React Native style names and values alongside tokens, and React Native's flex rules.
    onlyAllowShorthands: false,
    allowedStyleValues: false,
    styleCompat: "react-native",
  },
});

export default config;

type Conf = typeof config;
declare module "tamagui" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends Conf {}
}
