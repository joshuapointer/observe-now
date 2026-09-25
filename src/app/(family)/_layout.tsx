import { Stack } from "expo-router";

import { FamilyHeader } from "@/ui/shell";
import { useTheme } from "@/ui/theme";

export default function FamilyLayout() {
  const t = useTheme();
  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: t.c.bg } }}>
      <Stack.Screen name="family" options={{ header: () => <FamilyHeader /> }} />
      <Stack.Screen
        name="family-settings"
        options={{
          title: "Settings",
          headerStyle: { backgroundColor: t.c.ground },
          headerTintColor: t.c.accentInk,
          headerTitleStyle: { ...t.font("heavy"), color: t.c.ink },
          headerBackTitle: "Back",
        }}
      />
    </Stack>
  );
}
