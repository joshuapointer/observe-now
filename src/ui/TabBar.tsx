// The floating tab bar: a rounded bar above the home indicator with a pill that springs to the chosen tab.
import type { Tabs } from "expo-router/tabs";
import { useEffect, useState, type ComponentProps } from "react";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { XStack, YStack } from "tamagui";

import type { Icon } from "./icons";
import { useLayout } from "./layout";
import { Badge, T } from "./primitives";

export type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];
export type TabItem = { name: string; label: string; icon: Icon; badge?: number };

export const TAB_BAR_HEIGHT = 64;

export function TabBar({ state, navigation, items }: TabBarProps & { items: TabItem[] }) {
  const insets = useSafeAreaInsets();
  const { isTablet } = useLayout();
  const [w, setW] = useState(0);
  const routes = state.routes.filter(r => items.some(i => i.name === r.name));
  const idx = Math.max(0, routes.findIndex(r => r.key === state.routes[state.index]?.key));
  const itemW = routes.length ? w / routes.length : 0;

  const x = useSharedValue(0);
  useEffect(() => { x.value = withSpring(idx * itemW, { damping: 20, stiffness: 240, mass: 0.8 }); }, [idx, itemW, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <YStack bg="$page" pb={Math.max(insets.bottom, 12)} pt={6} px={isTablet ? 0 : 12} items="center">
      <XStack
        role="tablist"
        width="100%"
        maxW={isTablet ? 520 : undefined}
        height={TAB_BAR_HEIGHT}
        bg="$card"
        rounded={24}
        p={5}
        shadowColor="$shadowColor"
        shadowOpacity={0.14}
        shadowRadius={18}
        shadowOffset={{ width: 0, height: 6 }}
        elevation={6}
        onLayout={e => setW(e.nativeEvent.layout.width - 10)}
      >
        {itemW ? (
          <Animated.View style={[{ position: "absolute", left: 5, top: 5, bottom: 5, width: itemW }, pill]}>
            <YStack flex={1} rounded={19} bg="$accent3" />
          </Animated.View>
        ) : null}
        {routes.map((route, i) => {
          const item = items.find(it => it.name === route.name)!;
          const focused = i === idx;
          const I = item.icon;
          const onPress = () => {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              Haptics.selectionAsync().catch(() => {});
              navigation.navigate(route.name, route.params);
            }
          };
          return (
            <YStack
              key={route.key}
              testID={`tab-${item.name}`}
              role="tab"
              aria-selected={focused}
              aria-label={item.badge ? `${item.label}, ${item.badge} new` : item.label}
              onPress={onPress}
              flex={1}
              items="center"
              justify="center"
              gap={2}
              transition="quick"
              pressStyle={{ scale: 0.92 }}
            >
              <YStack>
                <I size={22} color={focused ? "$accent11" : "$color10"} strokeWidth={focused ? 2.4 : 2} />
                {item.badge ? <YStack position="absolute" t={-6} r={-12}><Badge n={item.badge} /></YStack> : null}
              </YStack>
              <T fontSize={12} lineHeight={15} weight={focused ? "heavy" : "bold"} color={focused ? "$accent11" : "$color10"} maxFontSizeMultiplier={1.2}>
                {item.label}
              </T>
            </YStack>
          );
        })}
      </XStack>
    </YStack>
  );
}
