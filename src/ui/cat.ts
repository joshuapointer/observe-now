// Each code category has a colour family (a Tamagui child theme): <Theme name={catTheme(cat)}> tints everything
// inside it, and catColor() reaches one step of the family from anywhere.
import type { ColorTokens } from "tamagui";

import type { Cat } from "@/lib/codes";

export type CatTheme = "blue" | "purple" | "orange" | "green" | "red" | "indigo";

const THEMES: Record<Cat, CatTheme> = { sleep: "blue", mood: "purple", care: "orange", calm: "green", danger: "red" };

export const catTheme = (c?: Cat | null): CatTheme => (c ? THEMES[c] : "indigo");

// Steps, as in Radix: 3 = tinted surface, 5 = pressed surface, 7 = border, 9 = solid, 11 = readable text.
export type Step = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export const catColor = (c: Cat | null | undefined, step: Step) => `$${catTheme(c)}${step}` as ColorTokens;
