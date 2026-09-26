// Shared pieces for the gate screens (sign-in, choosing a person, starting a shift): the frame, link buttons,
// error text, and the big tap-a-name rows.
import type { ReactNode } from "react";
import { Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { XStack, YStack } from "tamagui";

import { ChevronRight } from "@/ui/icons";
import { useLayout } from "@/ui/layout";
import { Scroll, Screen, T } from "@/ui/primitives";

// Frame for every gate screen: the app mark, then the content in a centred column (a card on tablets). The gate
// route has no header or tab bar, so safe areas are handled here.
export function GateLayout({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { isTablet } = useLayout();
  return (
    <Screen>
      <Scroll
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
          paddingLeft: insets.left + 20,
          paddingRight: insets.right + 20,
        }}
      >
        <YStack
          width="100%"
          maxW={isTablet ? 500 : 460}
          self="center"
          gap={18}
          bg={isTablet ? "$card" : "transparent"}
          rounded={32}
          p={isTablet ? 32 : 4}
          shadowColor="$shadowColor"
          shadowOpacity={isTablet ? 0.1 : 0}
          shadowRadius={24}
          shadowOffset={{ width: 0, height: 10 }}
          transition="medium"
          enterStyle={{ opacity: 0, y: 12 }}
        >
          <Image source={require("../../../assets/icon.png")} style={{ width: 64, height: 64, borderRadius: 16 }} accessibilityIgnoresInvertColors />
          {children}
        </YStack>
      </Scroll>
    </Screen>
  );
}

// A text button: switch sign-in method, forgot password, sign out, etc.
export function LinkButton({ title, onPress, accessibilityLabel }: { title: string; onPress: () => void; accessibilityLabel?: string }) {
  return (
    <XStack role="button" aria-label={accessibilityLabel || title} onPress={onPress} hitSlop={6} minH={44} items="center" self="flex-start" pressStyle={{ opacity: 0.55 }}>
      <T v="label" fontSize={16} color="$accent11">{title}</T>
    </XStack>
  );
}

export function ErrorText({ children }: { children: string | undefined }) {
  if (!children) return null;
  return (
    <XStack bg="$red3" rounded={14} px={14} py={10} transition="quick" enterStyle={{ opacity: 0, y: -4 }}>
      <T v="label" color="$red11" role="alert">{children}</T>
    </XStack>
  );
}

// A big tap target for a person's name: choosing a patient, or a caregiver to start a shift.
export function PersonButton({ name, detail, onPress }: { name: string; detail?: string; onPress: () => void }) {
  return (
    <XStack
      role="button"
      aria-label={detail ? `${name}, ${detail}` : name}
      onPress={onPress}
      minH={72}
      px={16}
      py={12}
      gap={14}
      items="center"
      rounded={22}
      bg="$card"
      shadowColor="$shadowColor"
      shadowOpacity={0.08}
      shadowRadius={12}
      shadowOffset={{ width: 0, height: 4 }}
      elevation={2}
      transition="quick"
      pressStyle={{ scale: 0.98, bg: "$color3" }}
    >
      <YStack width={46} height={46} rounded={23} bg="$accent4" items="center" justify="center">
        <T weight="black" fontSize={20} lineHeight={24} color="$accent11">{name.trim().slice(0, 1).toUpperCase()}</T>
      </YStack>
      <YStack flex={1} gap={2}>
        <T weight="black" fontSize={20} lineHeight={25}>{name}</T>
        {detail ? <T v="small" fontSize={13}>{detail}</T> : null}
      </YStack>
      <ChevronRight size={22} color="$color10" />
    </XStack>
  );
}

// A numbered list.
export function Steps({ items }: { items: string[] }) {
  return (
    <YStack gap={10}>
      {items.map((s, i) => (
        <XStack key={i} gap={10} items="flex-start">
          <YStack width={26} height={26} rounded={13} bg="$accent3" items="center" justify="center">
            <T fontSize={13} lineHeight={16} weight="black" color="$accent11">{i + 1}</T>
          </YStack>
          <T flex={1}>{s}</T>
        </XStack>
      ))}
    </YStack>
  );
}
