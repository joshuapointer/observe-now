import { useKeepAwake } from "expo-keep-awake";
import { Stack } from "expo-router";

import { useApp } from "@/state/app";
import { useStackHeader } from "@/ui/stackHeader";
import { useColors } from "@/ui/theme";

// The screen stays on while the log is open on the care device (Settings → Keep the screen on).
function KeepAwake() {
  useKeepAwake("care-log");
  return null;
}

export default function CareLayout() {
  const c = useColors();
  const header = useStackHeader();
  const wake = useApp(s => s.settings.wake);
  return (
    <>
      {wake ? <KeepAwake /> : null}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.page } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="fall" options={{ ...header, title: "Fall report" }} />
        <Stack.Screen name="codes" options={{ ...header, title: "Codes" }} />
        <Stack.Screen name="preview" options={{ ...header, title: "What family see" }} />
        <Stack.Screen name="settings" options={{ ...header, title: "Settings" }} />
        <Stack.Screen name="week" options={{ ...header, title: "The last seven nights" }} />
        <Stack.Screen name="notes" options={{ ...header, title: "Notes" }} />
      </Stack>
    </>
  );
}
