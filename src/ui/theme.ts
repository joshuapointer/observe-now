// Light or night (Settings → Screen, where Auto follows the device), and resolved colours for the few places
// outside Tamagui that need a plain value: the status bar, navigation, the system background, icons.
import { useColorScheme } from "react-native";
import { useTheme } from "tamagui";

import { useApp } from "@/state/app";

export function useNight(): boolean {
  const system = useColorScheme();
  const theme = useApp(s => s.settings.theme);
  return theme === "night" || (theme === "auto" && system === "dark");
}

export function useColors() {
  const t = useTheme();
  return {
    page: t.page.val as string,
    card: t.card.val as string,
    ink: t.color12.val as string,
    mute: t.color11.val as string,
    faint: t.color8.val as string,
    line: t.color5.val as string,
    accent: t.accent9.val as string,
    accentInk: t.accent11.val as string,
    danger: t.red9.val as string,
  };
}
