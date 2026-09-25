import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router/tabs";
import { Platform } from "react-native";

import { useView } from "@/state/view";
import { useLayout } from "@/ui/layout";
import { FamilyHeader } from "@/ui/shell";
import { useTheme } from "@/ui/theme";

type Icon = keyof typeof Ionicons.glyphMap;

// [route, tab label, icon]. Route names differ from the caregiver tabs' so the two groups never share a URL.
const TABS: [string, string, Icon][] = [
  ["family", "Updates", "pulse-outline"],
  ["family-messages", "Messages", "chatbubbles-outline"],
  ["history", "History", "calendar-outline"],
];

export default function FamilyTabs() {
  const t = useTheme(), V = useView(), { isTablet } = useLayout();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: t.c.accentInk,
        tabBarInactiveTintColor: t.c.mute,
        tabBarStyle: { backgroundColor: t.c.ground, borderTopColor: t.colorful ? t.c.line : t.c.edge, borderTopWidth: t.colorful ? 1 : 2 },
        tabBarLabelStyle: { ...t.font("bold"), fontSize: isTablet ? 14 : 11 },
        tabBarHideOnKeyboard: Platform.OS === "android", // same reasoning as the caregiver tabs
        sceneStyle: { backgroundColor: t.c.bg },
        header: () => <FamilyHeader />,
      }}
    >
      {TABS.map(([name, label, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: label,
            tabBarIcon: ({ color, size }) => <Ionicons name={icon} color={color} size={size} />,
            tabBarBadge: name === "family-messages" && V.unreadMsgs ? (V.unreadMsgs > 9 ? "9+" : V.unreadMsgs) : undefined,
            tabBarBadgeStyle: { backgroundColor: t.c.danger },
          }}
        />
      ))}
    </Tabs>
  );
}
