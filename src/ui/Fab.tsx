// The floating + button, bottom-right above the tab bar. It fans out the screen's actions; the first one is the
// main action and sits nearest the thumb.
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { StyleSheet } from "react-native";
import { AnimatePresence, XStack, YStack } from "tamagui";

import { Aperture } from "./Brand";
import type { Icon } from "./icons";
import { Plus } from "./icons";
import { T } from "./primitives";

export type FabAction = { label: string; icon: Icon; onPress: () => void; tone?: "primary" | "danger" };

export function Fab({ label, actions }: { label: string; actions: FabAction[] }) {
  const [open, setOpen] = useState(false);
  // With a single action there's nothing to choose between: the button runs it.
  const toggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (actions.length === 1) actions[0].onPress();
    else setOpen(o => !o);
  };
  const run = (fn: () => void) => { setOpen(false); fn(); };
  // Rendered bottom-up, so the first action ends up just above the button.
  const items = [...actions].reverse();

  return (
    <>
      <AnimatePresence>
        {open ? (
          <YStack
            key="scrim"
            style={StyleSheet.absoluteFill}
            bg="$shadow6"
            transition="quick"
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
            onPress={() => setOpen(false)}
            aria-label="Close menu"
          />
        ) : null}
      </AnimatePresence>
      <YStack position="absolute" r={16} b={16} items="flex-end" gap={12} pointerEvents="box-none">
        <AnimatePresence>
          {open
            ? items.map((a, i) => {
              const primary = a.tone === "primary", danger = a.tone === "danger";
              return (
                <XStack
                  key={a.label}
                  role="button"
                  aria-label={a.label}
                  onPress={() => run(a.onPress)}
                  items="center"
                  gap={12}
                  pl={18}
                  pr={6}
                  height={52}
                  rounded={26}
                  bg={primary ? "$accent9" : "$card"}
                  shadowColor="$shadowColor"
                  shadowOpacity={0.2}
                  shadowRadius={12}
                  shadowOffset={{ width: 0, height: 4 }}
                  elevation={4}
                  transition={["bouncy", { delay: (items.length - 1 - i) * 30 }]}
                  enterStyle={{ opacity: 0, y: 20, scale: 0.9 }}
                  exitStyle={{ opacity: 0, y: 10, scale: 0.9 }}
                  pressStyle={{ scale: 0.96 }}
                >
                  <T v="label" weight="heavy" fontSize={16} color={primary ? "$white1" : danger ? "$red11" : "$color12"}>{a.label}</T>
                  <YStack width={40} height={40} rounded={20} items="center" justify="center" bg={primary ? "$accent10" : danger ? "$red3" : "$accent3"}>
                    <a.icon size={20} color={primary ? "$white1" : danger ? "$red11" : "$accent11"} />
                  </YStack>
                </XStack>
              );
            })
            : null}
        </AnimatePresence>
        {/* The icon's aperture ring around the button; it twists as the menu opens. */}
        <YStack position="absolute" r={-8} b={-8} width={80} height={80} rotate={open ? "120deg" : "0deg"} transition="bouncy" pointerEvents="none">
          <Aperture size={80} seconds={0} />
        </YStack>
        <YStack
          role="button"
          aria-label={open ? "Close menu" : label}
          aria-expanded={open}
          onPress={toggle}
          width={64}
          height={64}
          rounded={32}
          bg="$accent9"
          items="center"
          justify="center"
          shadowColor="$accent9"
          shadowOpacity={0.45}
          shadowRadius={16}
          shadowOffset={{ width: 0, height: 8 }}
          elevation={8}
          rotate={open ? "45deg" : "0deg"}
          transition="bouncy"
          enterStyle={{ scale: 0.6, opacity: 0 }}
          pressStyle={{ scale: 0.92 }}
        >
          <Plus size={30} color="$white1" strokeWidth={2.6} />
        </YStack>
      </YStack>
    </>
  );
}
