// Shared pieces for the gate screens: the centred-card frame, and the small bits every gate screen reuses
// (link-style buttons, error text, the big tap-a-name rows).
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLayout } from "@/ui/layout";
import { Card, Row, Scroll, Screen, T } from "@/ui/primitives";
import { useTheme } from "@/ui/theme";

// Frame for every gate screen: a centred card on tablet, full width (with side padding) on phone. The gate
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
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 20,
          paddingLeft: insets.left + (isTablet ? 24 : 20),
          paddingRight: insets.right + (isTablet ? 24 : 20),
        }}
      >
        <Card pad={isTablet ? 28 : 20} style={{ gap: 16, width: "100%", maxWidth: isTablet ? 520 : undefined, alignSelf: "center" }}>
          {children}
        </Card>
      </Scroll>
    </Screen>
  );
}

// An underlined text button ("linkbtn" in the PWA): switch auth mode, forgot password, sign out, etc.
export function LinkButton({ title, onPress, accessibilityLabel }: { title: string; onPress: () => void; accessibilityLabel?: string }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [{ minHeight: 44, justifyContent: "center" }, pressed && { opacity: 0.6 }]}
    >
      <Text maxFontSizeMultiplier={1.4} style={[t.font("bold"), { color: t.c.accentInk, fontSize: 15, textDecorationLine: "underline" }]}>{title}</Text>
    </Pressable>
  );
}

export function ErrorText({ children }: { children: string | undefined }) {
  const t = useTheme();
  if (!children) return null;
  return (
    <T v="small" color={t.c.dangerInk} accessibilityRole="alert">
      {children}
    </T>
  );
}

// A big tap target for a person's name ("person pick" in the PWA): choosing a patient, or a caregiver to start
// a shift.
export function PersonButton({ name, detail, onPress }: { name: string; detail?: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={detail ? `${name}, ${detail}` : name}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 64, borderRadius: t.r.md, borderWidth: t.colorful ? 0 : 2, borderColor: t.c.edge,
          backgroundColor: pressed ? t.c.press : t.colorful ? t.c.panel : t.c.ground,
          paddingHorizontal: 16, paddingVertical: 12, justifyContent: "center", gap: 3,
        },
        t.colorful && t.shadow,
      ]}
    >
      <T weight="black" style={{ fontSize: 20, lineHeight: 24 }}>{name}</T>
      {detail ? <T v="small">{detail}</T> : null}
    </Pressable>
  );
}

// A numbered list ("ol.steps" in the PWA).
export function Steps({ items }: { items: string[] }) {
  return (
    <View style={{ gap: 8 }}>
      {items.map((s, i) => (
        <Row key={i} gap={8} center={false}>
          <T weight="heavy">{i + 1}.</T>
          <T style={{ flex: 1 }}>{s}</T>
        </Row>
      ))}
    </View>
  );
}
