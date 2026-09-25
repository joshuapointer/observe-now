import { Stack } from "expo-router";

import { useTheme } from "@/ui/theme";

export default function FamilyLayout() {
  const t = useTheme();
  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: t.c.bg } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="family-settings"
        options={{
          title: "Settings",
          headerStyle: { backgroundColor: t.c.chrome }, // matches the status bar, whose text is always light
          headerTintColor: t.c.onChrome,
          headerTitleStyle: { ...t.font("heavy"), color: t.c.onChrome },
          headerBackTitle: "Back",
        }}
      />
    </Stack>
  );
}
