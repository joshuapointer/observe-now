import { Nunito_400Regular } from "@expo-google-fonts/nunito/400Regular";
import { Nunito_600SemiBold } from "@expo-google-fonts/nunito/600SemiBold";
import { Nunito_700Bold } from "@expo-google-fonts/nunito/700Bold";
import { Nunito_800ExtraBold } from "@expo-google-fonts/nunito/800ExtraBold";
import { Nunito_900Black } from "@expo-google-fonts/nunito/900Black";
import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect, useMemo, useState } from "react";
import { TamaguiProvider, Theme } from "tamagui";

import { loadKv } from "@/lib/kv";
import { actingAs, hydrateApp, useApp, type AppState } from "@/state/app";
import { boot } from "@/state/session";
import { ModalHost } from "@/screens/modals/ModalHost";
import { EnvTag, Toast } from "@/ui/shell";
import { useColors, useNight } from "@/ui/theme";
import { config } from "../../tamagui.config";

SplashScreen.preventAutoHideAsync().catch(() => {});

// Which part of the app this person should be in (port of the PWA's renderScreens gate).
export type Mode = "gate" | "care" | "family";
export function modeOf(S: AppState): Mode {
  if (!S.authReady || !S.user || S.pickerOpen || !S.pid || !S.member) return "gate";
  if (actingAs(S) === "family") return "family";
  if (!S.patient || !S.patient.onShift) return "gate";
  return "care";
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black,
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Saved settings, drafts and read-marks load before anything reads them, then auth starts.
    loadKv().then(() => { hydrateApp(); boot(); setReady(true); });
  }, []);

  const loaded = (fontsLoaded || !!fontError) && ready;
  useEffect(() => { if (loaded) SplashScreen.hideAsync().catch(() => {}); }, [loaded]);

  if (!loaded) return null;
  return <Themed />;
}

// Light or night follows Settings → Screen (Auto follows the device).
function Themed() {
  const night = useNight();
  return (
    <TamaguiProvider config={config} defaultTheme={night ? "dark" : "light"}>
      <Theme name={night ? "dark" : "light"}>
        <RootNav />
      </Theme>
    </TamaguiProvider>
  );
}

function RootNav() {
  const mode = useApp(modeOf);
  const night = useNight();
  const c = useColors();

  useEffect(() => { SystemUI.setBackgroundColorAsync(c.page).catch(() => {}); }, [c.page]);

  const navTheme = useMemo(() => {
    const base = night ? DarkTheme : DefaultTheme;
    return { ...base, colors: { ...base.colors, background: c.page, card: c.page, text: c.ink, border: c.line, primary: c.accent, notification: c.danger } };
  }, [night, c.page, c.ink, c.line, c.accent, c.danger]);

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={night ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.page }, animation: "fade" }}>
        <Stack.Protected guard={mode === "gate"}>
          <Stack.Screen name="(gate)/index" />
        </Stack.Protected>
        <Stack.Protected guard={mode === "care"}>
          <Stack.Screen name="(care)" />
        </Stack.Protected>
        <Stack.Protected guard={mode === "family"}>
          <Stack.Screen name="(family)" />
        </Stack.Protected>
      </Stack>
      <ModalHost />
      <Toast />
      {mode === "gate" ? <EnvTag /> : null}
    </ThemeProvider>
  );
}
