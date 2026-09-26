// The design system: slate neutrals, an indigo accent, one colour family per code category (see src/ui/cat.ts),
// Nunito, and spring animations run on the UI thread by Reanimated.
import {
  amber, amberDark, blue, blueDark, green, greenDark, indigo, indigoDark, orange, orangeDark, purple, purpleDark, red, redDark, slate, slateDark,
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

const themes = createV5Theme({
  lightPalette: palette(slate),
  darkPalette: palette(slateDark),
  accent: {
    light: Object.fromEntries(palette(indigo).map((v, i) => [`accent${i + 1}`, v])),
    dark: Object.fromEntries(palette(indigoDark).map((v, i) => [`accent${i + 1}`, v])),
  },
  childrenThemes: {
    blue: { light: blue, dark: blueDark },
    purple: { light: purple, dark: purpleDark },
    orange: { light: orange, dark: orangeDark },
    green: { light: green, dark: greenDark },
    red: { light: red, dark: redDark },
    indigo: { light: indigo, dark: indigoDark },
    amber: { light: amber, dark: amberDark }, // notes
  },
});

// Two surfaces on top of the palette: the page behind everything, and the cards that sit on it (lighter than
// the page in both light and dark). Every theme gets them, so a coloured sub-theme can still reach them.
const surfaces = {
  light: { page: slate.slate3, card: "#ffffff", cardLine: slate.slate5 },
  dark: { page: slateDark.slate1, card: slateDark.slate3, cardLine: slateDark.slate5 },
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
