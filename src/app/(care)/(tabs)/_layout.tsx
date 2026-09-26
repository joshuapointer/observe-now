import { Tabs } from "expo-router/tabs";

import { useView } from "@/state/view";
import { House, MessagesSquare, Pill } from "@/ui/icons";
import { AppHeader } from "@/ui/shell";
import { TabBar, type TabItem } from "@/ui/TabBar";
import { useColors } from "@/ui/theme";

export default function CareTabs() {
  const V = useView(), c = useColors();
  const items: TabItem[] = [
    { name: "record", label: "Now", icon: House },
    { name: "messages", label: "Messages", icon: MessagesSquare, badge: V.unreadMsgs },
    { name: "care", label: "Care", icon: Pill },
  ];
  return (
    <Tabs
      tabBar={p => <TabBar {...p} items={items} />}
      screenOptions={{ header: () => <AppHeader />, sceneStyle: { backgroundColor: c.page }, animation: "shift" }}
    >
      {items.map(it => <Tabs.Screen key={it.name} name={it.name} options={{ title: it.label }} />)}
    </Tabs>
  );
}
