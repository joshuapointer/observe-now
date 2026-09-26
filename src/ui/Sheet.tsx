// A sheet with a title and a close button, shown as the platform's own sheet (a card that slides up on iOS and
// swipes down to close). Everything that used to open as a separate page (help, medicines, the record picker,
// account) opens as one of these. Only the open one is rendered.
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { XStack, YStack } from "tamagui";

import { X } from "./icons";
import { useLayout } from "./layout";
import { IconButton, T } from "./primitives";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode; // pinned below the scrolling body (Save buttons)
  scroll?: boolean;
};

export function Sheet({ open, onClose, title, subtitle, children, footer, scroll = true }: Props) {
  const insets = useSafeAreaInsets();
  const { isTablet } = useLayout();
  const ios = Platform.OS === "ios";
  const bottom = ios ? Math.max(insets.bottom, 16) : insets.bottom + 16;

  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle={ios ? (isTablet ? "formSheet" : "pageSheet") : undefined}
      onRequestClose={onClose}
      statusBarTranslucent={!ios}
    >
      <YStack flex={1} bg="$page" pt={ios ? 0 : insets.top}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={ios ? "padding" : undefined}>
          <YStack items="center" pt={8}>
            <YStack width={40} height={5} rounded={3} bg="$color6" />
          </YStack>
          {title ? (
            <XStack items="center" gap={8} pl={20} pr={12} pt={12} pb={8}>
              <YStack flex={1} gap={2}>
                <T v="big" accessibilityRole="header">{title}</T>
                {subtitle ? <T v="small">{subtitle}</T> : null}
              </YStack>
              <IconButton icon={X} label="Close" onPress={onClose} tone="soft" size={40} />
            </XStack>
          ) : null}
          {scroll ? (
            <ScrollView
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: footer ? 16 : bottom + 12 }}
            >
              <YStack gap={20}>{children}</YStack>
            </ScrollView>
          ) : (
            <YStack flex={1}>{children}</YStack>
          )}
          {footer ? (
            <YStack px={20} pt={12} pb={bottom} gap={10} borderTopWidth={1} borderTopColor="$color4" bg="$page">
              {footer}
            </YStack>
          ) : null}
        </KeyboardAvoidingView>
      </YStack>
    </Modal>
  );
}
