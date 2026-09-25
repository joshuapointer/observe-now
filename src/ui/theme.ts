import { useMemo } from "react";
import { useColorScheme, type TextStyle } from "react-native";

import type { Cat } from "@/lib/codes";
import { useApp } from "@/state/app";

// Two looks × two screens, ported from the PWA's CSS tokens:
// colorful = modern.css (rounded, colour-coded, Nunito), classic = app.css (hard-edged, monochrome, Archivo).
type Palette = {
  bg: string; ground: string; panel: string; ink: string;
  chrome: string; onChrome: string; onChromeDim: string; onChromeAlert: string;
  solid: string; onSolid: string; edge: string;
  accent: string; accentHover: string; onAccent: string; accentInk: string;
  danger: string; onDanger: string; dangerInk: string;
  faint: string; line: string; mute: string; label: string; press: string;
  mid: string; strong: string; done: string; fallBg: string;
  kSleep: string; kAwake: string; kAgit: string; kFall: string; live: string;
};
export type CatColors = { cat: string; a: string; b: string; bg: string; bg2: string; ink: string };

const colorfulLight: Palette = {
  bg: "#e8eefb", ground: "#ffffff", panel: "#f1f4fb", ink: "#1a2140",
  chrome: "#3a3585", onChrome: "#ffffff", onChromeDim: "rgba(255,255,255,0.76)", onChromeAlert: "#ffc7c7",
  solid: "#4f46e5", onSolid: "#ffffff", edge: "rgba(79,70,229,0.35)",
  accent: "#4f46e5", accentHover: "#4338ca", onAccent: "#ffffff", accentInk: "#4338ca",
  danger: "#e5484d", onDanger: "#ffffff", dangerInk: "#c62b32",
  faint: "rgba(26,33,64,0.16)", line: "rgba(26,33,64,0.09)", mute: "rgba(26,33,64,0.68)", label: "rgba(26,33,64,0.62)", press: "rgba(79,70,229,0.09)",
  mid: "#cfdcf7", strong: "#f59e0b", done: "#e3e7f2", fallBg: "#ffe6e6",
  kSleep: "#7aa2f7", kAwake: "#8ddcb8", kAgit: "#f7b955", kFall: "#e5484d", live: "#22c55e",
};
const colorfulNight: Palette = {
  ...colorfulLight,
  bg: "#0e1120", ground: "#181c33", panel: "#20253f", ink: "#e9ecfa",
  chrome: "#231f4a", onChromeDim: "rgba(233,236,250,0.7)",
  solid: "#6366f1", edge: "rgba(129,140,248,0.5)", accent: "#6366f1", accentHover: "#7375f8", accentInk: "#a5b4fc",
  danger: "#e5484d", dangerInk: "#ff9a9e",
  faint: "rgba(255,255,255,0.17)", line: "rgba(255,255,255,0.09)", mute: "rgba(233,236,250,0.68)", label: "rgba(233,236,250,0.62)", press: "rgba(129,140,248,0.16)",
  mid: "#3b4a7a", strong: "#c08a2e", done: "#2a2f4d", fallBg: "#3d1c25",
  kSleep: "#5b83e0", kAwake: "#2bb58a", kAgit: "#e0a13a", kFall: "#ef4b52",
};
const classicLight: Palette = {
  bg: "#f3f2f2", ground: "#f3f2f2", panel: "#eae9e9", ink: "#201e1d",
  chrome: "#201e1d", onChrome: "#f3f2f2", onChromeDim: "rgba(243,242,242,0.6)", onChromeAlert: "#ff9783",
  solid: "#201e1d", onSolid: "#f3f2f2", edge: "#201e1d",
  accent: "#ec3013", accentHover: "#dd2b0f", onAccent: "#f3f2f2", accentInk: "#ae1800",
  danger: "#ec3013", onDanger: "#f3f2f2", dangerInk: "#ae1800",
  faint: "rgba(32,30,29,0.4)", line: "rgba(32,30,29,0.22)", mute: "rgba(32,30,29,0.6)", label: "rgba(32,30,29,0.55)", press: "rgba(32,30,29,0.07)",
  mid: "#c9c6c5", strong: "#7d7979", done: "#d7d3d3", fallBg: "#ffe0d9",
  kSleep: "#c9c6c5", kAwake: "#eae9e9", kAgit: "#7d7979", kFall: "#ec3013", live: "#22c55e",
};
const classicNight: Palette = {
  ...classicLight,
  bg: "#171514", ground: "#171514", panel: "#201d1c", ink: "#e9e6e4",
  chrome: "#0b0a0a", onChrome: "#e9e6e4", onChromeDim: "rgba(233,230,228,0.55)", onChromeAlert: "#ff8f7a",
  solid: "#48433f", onSolid: "#f4f1ef", edge: "rgba(233,230,228,0.55)",
  accent: "#c7290f", accentHover: "#d93012", onAccent: "#fff4f1", accentInk: "#ff8f7a",
  danger: "#c7290f", onDanger: "#fff4f1", dangerInk: "#ff8f7a",
  faint: "rgba(233,230,228,0.3)", line: "rgba(233,230,228,0.14)", mute: "rgba(233,230,228,0.62)", label: "rgba(233,230,228,0.55)", press: "rgba(233,230,228,0.09)",
  mid: "#3a3634", strong: "#7d7773", done: "#2c2927", fallBg: "#3a1c16",
  kSleep: "#3a3634", kAwake: "#201d1c", kAgit: "#7d7773", kFall: "#c7290f",
};

const CATS_LIGHT: Record<Cat | "default", CatColors> = {
  default: { cat: "#6366f1", a: "#7c6cff", b: "#4338ca", bg: "#eef0ff", bg2: "#e0e4fb", ink: "#4338ca" },
  sleep: { cat: "#3b82f6", a: "#4f8dfa", b: "#2557d6", bg: "#e7f0ff", bg2: "#d2e3ff", ink: "#1d4ed8" },
  mood: { cat: "#8b5cf6", a: "#9b6cff", b: "#6a3fd8", bg: "#f0eaff", bg2: "#e1d6ff", ink: "#6d28d9" },
  care: { cat: "#f97316", a: "#ff8a3d", b: "#d4530a", bg: "#ffeedd", bg2: "#ffdcbb", ink: "#b45309" },
  calm: { cat: "#10b981", a: "#22c993", b: "#0a8a63", bg: "#dcf7ec", bg2: "#bfeedc", ink: "#047857" },
  danger: { cat: "#e5484d", a: "#ff6b70", b: "#c9333a", bg: "#ffe5e5", bg2: "#ffcdcd", ink: "#b91c24" },
};
const CATS_NIGHT: Record<Cat | "default", CatColors> = {
  default: { cat: "#818cf8", a: "#7c6cff", b: "#3f38b8", bg: "#232848", bg2: "#2b3159", ink: "#b9c0ff" },
  sleep: { cat: "#3b82f6", a: "#4a7fe8", b: "#23459c", bg: "#1b2b52", bg2: "#223669", ink: "#a6c2ff" },
  mood: { cat: "#8b5cf6", a: "#8a63f0", b: "#4b2b9c", bg: "#2a2350", bg2: "#352b66", ink: "#cdb8ff" },
  care: { cat: "#f97316", a: "#e7742a", b: "#98400a", bg: "#3f261a", bg2: "#503020", ink: "#ffbb85" },
  calm: { cat: "#10b981", a: "#18b287", b: "#0a6b4c", bg: "#14372e", bg2: "#1a4839", ink: "#79e6bd" },
  danger: { cat: "#e5484d", a: "#f05a5f", b: "#a92830", bg: "#431d26", bg2: "#562530", ink: "#ff9fa3" },
};

type Weight = "regular" | "semibold" | "bold" | "heavy" | "black";
const FONTS: Record<"colorful" | "classic", Record<Weight, string>> = {
  colorful: { regular: "Nunito_400Regular", semibold: "Nunito_600SemiBold", bold: "Nunito_700Bold", heavy: "Nunito_800ExtraBold", black: "Nunito_900Black" },
  classic: { regular: "Archivo_400Regular", semibold: "Archivo_600SemiBold", bold: "Archivo_700Bold", heavy: "Archivo_800ExtraBold", black: "Archivo_900Black" },
};

export type Theme = ReturnType<typeof makeTheme>;

export function makeTheme(style: "colorful" | "classic", night: boolean) {
  const colorful = style === "colorful";
  const c = colorful ? (night ? colorfulNight : colorfulLight) : night ? classicNight : classicLight;
  const cats = night ? CATS_NIGHT : CATS_LIGHT;
  // Classic is monochrome: categories only colour the colorful look (the danger family keeps its red).
  const neutral: CatColors = { cat: c.ink, a: c.solid, b: c.solid, bg: c.panel, bg2: c.mid, ink: c.ink };
  const dangerClassic: CatColors = { cat: c.danger, a: c.danger, b: c.danger, bg: c.fallBg, bg2: c.fallBg, ink: c.dangerInk };
  return {
    style, night, colorful, c,
    cat: (k?: Cat | null): CatColors => (colorful ? cats[k || "default"] : k === "danger" ? dangerClassic : neutral),
    font: (w: Weight = "regular"): TextStyle => ({ fontFamily: FONTS[style][w] }),
    r: colorful ? { sm: 10, md: 16, lg: 24, pill: 999 } : { sm: 0, md: 0, lg: 0, pill: 0 },
    border: colorful ? 0 : 2,
    shadow: colorful
      ? { shadowColor: "#1a2150", shadowOpacity: night ? 0.45 : 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 }
      : {},
    shadowLg: colorful
      ? { shadowColor: "#1a2150", shadowOpacity: night ? 0.6 : 0.3, shadowRadius: 22, shadowOffset: { width: 0, height: 14 }, elevation: 8 }
      : {},
  };
}

// The active theme: Settings → Screen (Auto follows the device) and Settings → Look.
export function useTheme(): Theme {
  const system = useColorScheme();
  const { theme, style } = useApp(s => s.settings);
  const night = theme === "night" || (theme === "auto" && system === "dark");
  return useMemo(() => makeTheme(style, night), [style, night]);
}
