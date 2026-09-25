import { useKeepAwake } from "expo-keep-awake";
import { Stack } from "expo-router";

import { useApp } from "@/state/app";
import { useTheme } from "@/ui/theme";

// The screen stays on while the log is open on the care device (Settings → Keep the screen on).
function KeepAwake() {
  useKeepAwake("care-log");
  return null;
}

export default function CareLayout() {
  const t = useTheme();
  const wake = useApp(s => s.settings.wake);
  const header = {
    headerShown: true,
    headerStyle: { backgroundColor: t.c.chrome }, // matches the status bar, whose text is always light
    headerTintColor: t.c.onChrome,
    headerTitleStyle: { ...t.font("heavy"), color: t.c.onChrome },
    headerBackTitle: "Back",
  };
  return (
    <>
      {wake ? <KeepAwake /> : null}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.c.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="fall" options={{ ...header, title: "Fall report" }} />
        <Stack.Screen name="codes" options={{ ...header, title: "Codes you can choose" }} />
        <Stack.Screen name="preview" options={{ ...header, title: "What family see" }} />
      </Stack>
    </>
  );
}
