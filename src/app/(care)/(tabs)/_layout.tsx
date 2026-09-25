import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router/tabs";

import { useView } from "@/state/view";
import { useLayout } from "@/ui/layout";
import { CareHeader } from "@/ui/shell";
import { useTheme } from "@/ui/theme";

type Icon = keyof typeof Ionicons.glyphMap;

// [route, tab label, page title, icon]
const TABS: [string, string, string, Icon][] = [
  ["record", "Record", "What's happening now", "create-outline"],
  ["messages", "Messages", "Messages with family", "chatbubbles-outline"],
  ["notes", "Notes & medicines", "Notes and medicines", "medkit-outline"],
  ["week", "This week", "The last seven nights", "moon-outline"],
  ["settings", "Settings", "Settings", "settings-outline"],
];

export default function CareTabs() {
  const t = useTheme(), V = useView(), { isTablet } = useLayout();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: t.c.accentInk,
        tabBarInactiveTintColor: t.c.mute,
        tabBarStyle: { backgroundColor: t.c.ground, borderTopColor: t.colorful ? t.c.line : t.c.edge, borderTopWidth: t.colorful ? 1 : 2 },
        tabBarLabelStyle: { ...t.font("bold"), fontSize: isTablet ? 14 : 11 },
        tabBarHideOnKeyboard: true,
        sceneStyle: { backgroundColor: t.c.bg },
      }}
    >
      {TABS.map(([name, label, title, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: label,
            tabBarLabel: !isTablet && name === "notes" ? "Notes" : label,
            tabBarIcon: ({ color, size }) => <Ionicons name={icon} color={color} size={size} />,
            tabBarBadge: name === "messages" && V.unreadMsgs ? (V.unreadMsgs > 9 ? "9+" : V.unreadMsgs) : undefined,
            tabBarBadgeStyle: { backgroundColor: t.c.danger },
            header: () => <CareHeader title={title} record={name === "record"} />,
          }}
        />
      ))}
    </Tabs>
  );
}
