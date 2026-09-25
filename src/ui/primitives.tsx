// Shared building blocks. Screens compose these instead of styling from scratch, so both looks
// (Colorful / Classic) and both screens (Light / Night) stay consistent everywhere.
import { forwardRef, useRef, useState, type ReactNode } from "react";
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type PressableProps, type ScrollViewProps, type StyleProp, type TextInputProps, type TextProps, type TextStyle, type ViewStyle,
} from "react-native";

import type { Cat } from "@/lib/codes";
import { useTheme } from "./theme";

// ---------------------------------------------------------------- text
type TVariant = "body" | "title" | "h2" | "lede" | "small" | "eyebrow" | "big" | "label";
const SIZES: Record<TVariant, { size: number; w: "regular" | "semibold" | "bold" | "heavy" | "black"; lh?: number; upper?: boolean; ls?: number }> = {
  body: { size: 16, w: "regular", lh: 22 },
  title: { size: 26, w: "black", lh: 30 },
  h2: { size: 20, w: "heavy", lh: 25 },
  lede: { size: 17, w: "semibold", lh: 23 },
  small: { size: 13, w: "semibold", lh: 18 },
  eyebrow: { size: 12, w: "heavy", upper: true, ls: 0.6, lh: 16 },
  big: { size: 22, w: "heavy", lh: 27 },
  label: { size: 14, w: "bold", lh: 19 },
};

export type TProps = TextProps & { v?: TVariant; color?: string; center?: boolean; weight?: "regular" | "semibold" | "bold" | "heavy" | "black" };

export function T({ v = "body", color, center, weight, style, ...rest }: TProps) {
  const t = useTheme(), s = SIZES[v];
  const muted = v === "small" || v === "eyebrow";
  // A caller that changes the size without a line height would otherwise get this variant's (smaller) one and clip.
  const own = StyleSheet.flatten(style) as TextStyle | undefined;
  const lineHeight = own?.fontSize && !own.lineHeight ? Math.round(own.fontSize * 1.3) : s.lh;
  return (
    <Text
      maxFontSizeMultiplier={1.6}
      {...rest}
      style={[
        t.font(weight || s.w),
        { fontSize: s.size, lineHeight, color: color || (muted ? t.c.mute : t.c.ink) },
        s.upper && { textTransform: "uppercase", letterSpacing: s.ls },
        center && { textAlign: "center" },
        style,
      ]}
    />
  );
}

// ---------------------------------------------------------------- buttons
export type ButtonKind = "default" | "primary" | "danger" | "done" | "ghost";
type BtnProps = Omit<PressableProps, "style" | "children"> & {
  title: string;
  kind?: ButtonKind;
  big?: boolean;
  small?: boolean;
  sub?: string; // lighter second part of the label
  style?: StyleProp<ViewStyle>;
  grow?: boolean;
  right?: ReactNode;
};

export function Button({ title, kind = "default", big, small, sub, disabled, style, grow, right, ...rest }: BtnProps) {
  const t = useTheme();
  const bg = kind === "primary" ? t.c.accent : kind === "danger" ? t.c.danger : kind === "done" ? t.c.done : kind === "ghost" ? "transparent" : t.c.ground;
  const fg = kind === "primary" ? t.c.onAccent : kind === "danger" ? t.c.onDanger : kind === "done" ? t.c.mute : t.c.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityLabel={sub ? `${title} ${sub}` : title}
      disabled={disabled}
      hitSlop={4}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: bg,
          minHeight: big ? 56 : small ? 38 : 48,
          paddingHorizontal: small ? 14 : big ? 22 : 18,
          borderRadius: t.r.md,
          borderWidth: kind === "ghost" ? 0 : t.border || (kind === "default" ? StyleSheet.hairlineWidth * 2 : 0),
          borderColor: kind === "default" ? (t.colorful ? t.c.faint : t.c.edge) : bg,
        },
        kind !== "ghost" && kind !== "done" && t.shadow,
        grow && { flexGrow: 1 },
        pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
        disabled && { opacity: 0.45 },
        style,
      ]}
      {...rest}
    >
      <Text maxFontSizeMultiplier={1.4} style={[t.font("heavy"), { color: fg, fontSize: big ? 18 : small ? 14 : 16, textAlign: "center" }]}>
        {title}
        {sub ? <Text style={t.font("semibold")}> {sub}</Text> : null}
      </Text>
      {right}
    </Pressable>
  );
}

// A small toggle/segment button ("seg" in the PWA): Auto / Light / Night, place, pain, etc.
type SegProps = Omit<PressableProps, "style" | "children"> & {
  title: string;
  on?: boolean;
  cat?: Cat | null; // colour family (colorful look)
  small?: boolean;
  wide?: boolean;
  lead?: string; // bold prefix, e.g. an abbreviation
  style?: StyleProp<ViewStyle>;
};
export function Seg({ title, on, cat, small, wide, lead, disabled, style, ...rest }: SegProps) {
  const t = useTheme(), k = cat ? t.cat(cat) : null;
  const bg = on ? (k ? k.a : t.c.solid) : k ? k.bg : t.c.ground;
  const fg = on ? (k ? "#ffffff" : t.c.onSolid) : k ? k.ink : t.c.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!on, disabled: !!disabled }}
      disabled={disabled}
      hitSlop={3}
      style={({ pressed }) => [
        styles.seg,
        {
          backgroundColor: bg, minHeight: small ? 36 : 44, minWidth: wide ? 96 : 44, paddingHorizontal: small ? 12 : 14,
          borderRadius: t.colorful ? t.r.pill : 0,
          borderWidth: t.colorful ? (k && !on ? 2 : StyleSheet.hairlineWidth * 2) : 2,
          borderColor: on ? bg : k ? k.cat : t.colorful ? t.c.faint : t.c.edge,
        },
        pressed && { opacity: 0.75 },
        disabled && { opacity: 0.45 },
        style,
      ]}
      {...rest}
    >
      <Text maxFontSizeMultiplier={1.4} style={[t.font("bold"), { color: fg, fontSize: small ? 14 : 15 }]}>
        {lead ? <Text style={t.font("black")}>{lead} </Text> : null}
        {title}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------- chips, cards, rows
export function Chip({ title, onRemove, cat, style }: { title: string; onRemove?: () => void; cat?: Cat | null; style?: StyleProp<ViewStyle> }) {
  const t = useTheme(), k = cat ? t.cat(cat) : null;
  const body = (
    <Text maxFontSizeMultiplier={1.4} style={[t.font("bold"), { color: k ? "#fff" : t.c.onChrome, fontSize: 14 }]}>
      {title}{onRemove ? "  ×" : ""}
    </Text>
  );
  const st = [styles.chip, { backgroundColor: k ? k.b : t.c.chrome, borderRadius: t.colorful ? t.r.pill : 0 }, style];
  return onRemove ? (
    <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${title}`} onPress={onRemove} hitSlop={6} style={({ pressed }) => [st, pressed && { opacity: 0.7 }]}>{body}</Pressable>
  ) : (
    <View style={st}>{body}</View>
  );
}

export function Card({ children, style, pad = 16, tone = "ground" }: { children: ReactNode; style?: StyleProp<ViewStyle>; pad?: number; tone?: "ground" | "panel" }) {
  const t = useTheme();
  return (
    <View style={[{ backgroundColor: tone === "panel" ? t.c.panel : t.c.ground, borderRadius: t.r.lg, padding: pad, borderWidth: t.border, borderColor: t.c.edge }, t.shadow, style]}>
      {children}
    </View>
  );
}

export function Row({ children, gap = 8, wrap, style, center = true }: { children: ReactNode; gap?: number; wrap?: boolean; style?: StyleProp<ViewStyle>; center?: boolean }) {
  return <View style={[{ flexDirection: "row", gap, alignItems: center ? "center" : "flex-start" }, wrap && { flexWrap: "wrap" }, style]}>{children}</View>;
}

export function Rule({ style }: { style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return <View style={[{ height: t.colorful ? StyleSheet.hairlineWidth * 2 : 2, backgroundColor: t.colorful ? t.c.line : t.c.faint }, style]} />;
}

// A section bar across the top of a pane ("bar" in the PWA).
export function Bar({ title, right, danger }: { title: string; right?: ReactNode; danger?: boolean }) {
  const t = useTheme();
  return (
    <View style={[styles.bar, { backgroundColor: danger ? t.c.danger : t.colorful ? t.c.panel : t.c.chrome }]}>
      <T v="label" color={danger ? t.c.onDanger : t.colorful ? t.c.ink : t.c.onChrome} style={{ flex: 1 }}>{title}</T>
      {right}
    </View>
  );
}

// A settings-style row: label + detail on the left, a control on the right.
export function ListRow({ title, detail, right, onPress }: { title: string; detail?: string; right?: ReactNode; onPress?: () => void }) {
  const t = useTheme();
  const inner = (
    <>
      <View style={{ flex: 1, gap: 2 }}>
        <T v="label">{title}</T>
        {detail ? <T v="small">{detail}</T> : null}
      </View>
      {right}
    </>
  );
  const st = [styles.listRow, { borderBottomColor: t.c.line }];
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [st, pressed && { backgroundColor: t.c.press }]}>{inner}</Pressable>
  ) : (
    <View style={st}>{inner}</View>
  );
}

export function Empty({ title, body, children }: { title: string; body?: string; children?: ReactNode }) {
  return (
    <View style={{ padding: 24, gap: 10, alignItems: "flex-start" }}>
      <T v="eyebrow">{title}</T>
      {body ? <T v="lede">{body}</T> : null}
      {children}
    </View>
  );
}

export function Badge({ n }: { n: number }) {
  const t = useTheme();
  if (!n) return null;
  return (
    <View style={[styles.badge, { backgroundColor: t.c.danger }]} accessibilityLabel={`${n} new`}>
      <Text style={[t.font("black"), { color: t.c.onDanger, fontSize: 12 }]}>{n > 9 ? "9+" : n}</Text>
    </View>
  );
}

export function LiveDot({ color }: { color?: string }) {
  const t = useTheme();
  return <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color || t.c.live }} />;
}

// ---------------------------------------------------------------- inputs
type FieldProps = TextInputProps & { label?: string; hint?: string; multiline?: boolean; minHeight?: number };
export const Field = forwardRef<TextInput, FieldProps>(function Field({ label, hint, style, minHeight, multiline, ...rest }, ref) {
  const t = useTheme();
  const input = (
    <TextInput
      ref={ref}
      placeholderTextColor={t.c.label}
      multiline={multiline}
      maxFontSizeMultiplier={1.5}
      {...rest}
      style={[
        t.font("semibold"),
        {
          fontSize: 16, color: t.c.ink, backgroundColor: t.c.ground, borderRadius: t.r.sm,
          borderWidth: t.colorful ? StyleSheet.hairlineWidth * 2 : 2, borderColor: t.colorful ? t.c.faint : t.c.edge,
          paddingHorizontal: 14, paddingVertical: 12, minHeight: minHeight ?? (multiline ? 96 : 48),
          textAlignVertical: multiline ? "top" : "center",
        },
        style as StyleProp<TextStyle>,
      ]}
    />
  );
  if (!label && !hint) return input;
  return (
    <View style={{ gap: 6 }}>
      {label ? <T v="label">{label}</T> : null}
      {input}
      {hint ? <T v="small">{hint}</T> : null}
    </View>
  );
});

// ---------------------------------------------------------------- screens
export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return <View style={[{ flex: 1, backgroundColor: t.c.bg }, style]}>{children}</View>;
}

// A scrolling body that keeps focused inputs above the keyboard and lets taps land while it's open.
export const Scroll = forwardRef<ScrollView, ScrollViewProps>(function Scroll({ contentContainerStyle, ...rest }, ref) {
  return (
    <ScrollView
      ref={ref}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={contentContainerStyle}
      {...rest}
    />
  );
});

// Wrap anything with a text box pinned to the bottom (composers, the Step 2 panel on phones).
// KeyboardAvoidingView measures itself relative to its parent, so it's told where on screen that parent
// starts (below headers); pass `offset` only to override the measurement.
export function KeyboardArea({ children, offset, style }: { children: ReactNode; offset?: number; style?: StyleProp<ViewStyle> }) {
  const wrap = useRef<View>(null);
  const [top, setTop] = useState(0);
  const measure = () => wrap.current?.measureInWindow((_x, y) => setTop(y));
  return (
    <View ref={wrap} onLayout={measure} style={[{ flex: 1 }, style]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={offset ?? top}>
        {children}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  seg: { alignItems: "center", justifyContent: "center" },
  chip: { paddingHorizontal: 12, paddingVertical: 7, alignSelf: "flex-start" },
  bar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  listRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, minHeight: 56 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, alignItems: "center", justifyContent: "center" },
});
