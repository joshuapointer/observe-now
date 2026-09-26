import { Stack } from "expo-router";

import { useStackHeader } from "@/ui/stackHeader";
import { useColors } from "@/ui/theme";

export default function FamilyLayout() {
  const c = useColors();
  const header = useStackHeader();
  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: c.page } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="family-settings" options={{ ...header, title: "Settings" }} />
    </Stack>
  );
}
