// Shared building blocks on Tamagui. Screens compose these instead of styling from scratch, so light and night
// stay consistent everywhere. Touch targets are at least 44pt; the main actions are 52–56pt.
import * as Haptics from "expo-haptics";
import { forwardRef, useEffect, useRef, useState, type ReactNode } from "react";
import {
  KeyboardAvoidingView, ScrollView, View, type ScrollViewProps, type StyleProp, type TextInput, type TextInputProps, type ViewStyle,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { Input, Text, TextArea, Theme, XStack, YStack, type ColorTokens, type TextProps, type XStackProps, type YStackProps } from "tamagui";

import type { Cat } from "@/lib/codes";
import { catColor, catTheme } from "./cat";
import type { Icon } from "./icons";

// ---------------------------------------------------------------- text
type TVariant = "body" | "title" | "h2" | "lede" | "small" | "eyebrow" | "big" | "label" | "hero";
type Weight = "regular" | "semibold" | "bold" | "heavy" | "black";
const W: Record<Weight, "400" | "600" | "700" | "800" | "900"> = { regular: "400", semibold: "600", bold: "700", heavy: "800", black: "900" };
const SIZES: Record<TVariant, { size: number; w: Weight; lh: number; upper?: boolean; muted?: boolean }> = {
  body: { size: 17, w: "regular", lh: 23 },
  hero: { size: 30, w: "black", lh: 35 },
  title: { size: 28, w: "black", lh: 33 },
  big: { size: 22, w: "heavy", lh: 27 },
  h2: { size: 20, w: "heavy", lh: 25 },
  lede: { size: 17, w: "semibold", lh: 23 },
  label: { size: 15, w: "bold", lh: 20 },
  small: { size: 14, w: "semibold", lh: 19, muted: true },
  eyebrow: { size: 12, w: "heavy", lh: 16, upper: true, muted: true },
};

export type TProps = Omit<TextProps, "color"> & { v?: TVariant; color?: ColorTokens | string; center?: boolean; weight?: Weight };

export function T({ v = "body", color, center, weight, fontSize, lineHeight, ...rest }: TProps) {
  const s = SIZES[v];
  // A caller that changes the size without a line height would otherwise get this variant's (smaller) one and clip.
  const lh = lineHeight ?? (typeof fontSize === "number" ? Math.round(fontSize * 1.25) : s.lh);
  return (
    <Text
      fontFamily="$body"
      maxFontSizeMultiplier={1.6}
      fontWeight={W[weight || s.w]}
      fontSize={fontSize ?? s.size}
      lineHeight={lh}
      color={(color as ColorTokens) || (s.muted ? "$color11" : "$color12")}
      textTransform={s.upper ? "uppercase" : undefined}
      letterSpacing={s.upper ? 0.7 : undefined}
      textAlign={center ? "center" : undefined}
      {...rest}
    />
  );
}

const tap = () => Haptics.selectionAsync().catch(() => {});

// ---------------------------------------------------------------- buttons
export type ButtonKind = "default" | "primary" | "danger" | "done" | "ghost" | "soft" | "destructive";
type BtnProps = Omit<XStackProps, "children" | "grow"> & {
  title: string;
  kind?: ButtonKind;
  big?: boolean;
  small?: boolean;
  sub?: string; // lighter second part of the label
  grow?: boolean;
  icon?: Icon;
  right?: ReactNode;
  disabled?: boolean;
  onPress?: () => void;
};

const KINDS: Record<ButtonKind, { bg: ColorTokens; fg: ColorTokens; press: ColorTokens; line?: ColorTokens }> = {
  primary: { bg: "$accent9", fg: "$white1", press: "$accent10" },
  danger: { bg: "$red9", fg: "$white1", press: "$red10" },
  default: { bg: "$card", fg: "$color12", press: "$color4", line: "$color6" },
  soft: { bg: "$accent3", fg: "$accent11", press: "$accent5" },
  done: { bg: "$color4", fg: "$color11", press: "$color4" },
  ghost: { bg: "transparent" as ColorTokens, fg: "$accent11", press: "$accent3" },
  destructive: { bg: "transparent" as ColorTokens, fg: "$red11", press: "$red3" }, // a quiet red text button
};

export function Button({ title, kind = "default", big, small, sub, grow, icon: I, right, disabled, onPress, ...rest }: BtnProps) {
  const k = KINDS[kind];
  const h = big ? 56 : small ? 40 : 48;
  return (
    <XStack
      role="button"
      aria-label={sub ? `${title} ${sub}` : title}
      aria-disabled={!!disabled}
      accessibilityState={{ disabled: !!disabled }}
      onPress={disabled ? undefined : () => { if (kind === "primary" || kind === "danger") tap(); onPress?.(); }}
      hitSlop={4}
      minH={h}
      px={small ? 14 : big ? 22 : 18}
      gap={8}
      items="center"
      justify="center"
      rounded={small ? 12 : 16}
      bg={k.bg}
      borderWidth={k.line ? 1 : 0}
      borderColor={k.line}
      flexGrow={grow ? 1 : undefined}
      opacity={disabled ? 0.45 : 1}
      transition="quick"
      pressStyle={{ scale: 0.97, bg: k.press }}
      {...rest}
    >
      {I ? <I size={small ? 16 : 20} color={k.fg} /> : null}
      <T v="label" color={k.fg} fontSize={big ? 18 : small ? 15 : 16} weight="heavy" center>
        {title}
        {sub ? <T v="label" color={k.fg} weight="semibold" fontSize={big ? 18 : small ? 15 : 16}>{` ${sub}`}</T> : null}
      </T>
      {right}
    </XStack>
  );
}

// A round icon-only button (close, back, help).
export function IconButton({ icon: I, label, onPress, size = 44, tone = "plain" }: { icon: Icon; label: string; onPress: () => void; size?: number; tone?: "plain" | "soft" }) {
  return (
    <YStack
      role="button"
      aria-label={label}
      onPress={onPress}
      hitSlop={6}
      width={size}
      height={size}
      rounded={size / 2}
      items="center"
      justify="center"
      bg={tone === "soft" ? "$color4" : "transparent"}
      transition="quick"
      pressStyle={{ scale: 0.92, bg: "$color5" }}
    >
      <I size={Math.round(size * 0.5)} color="$color12" />
    </YStack>
  );
}

// A small toggle ("seg" in the PWA): place, pain, settings choices, code picks. Colour family from `cat`.
type SegProps = Omit<XStackProps, "children"> & {
  title: string;
  on?: boolean;
  cat?: Cat | null;
  small?: boolean;
  wide?: boolean;
  lead?: string; // bold prefix, e.g. an abbreviation
  disabled?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
};
export function Seg({ title, on, cat, small, wide, lead, disabled, onPress, accessibilityLabel, ...rest }: SegProps) {
  const tinted = cat !== undefined;
  const bg: ColorTokens = on ? (tinted ? catColor(cat, 9) : "$color12") : tinted ? catColor(cat, 3) : "$card";
  const fg: ColorTokens = on ? (tinted ? "$white1" : "$color1") : tinted ? catColor(cat, 11) : "$color12";
  return (
    <XStack
      role="button"
      aria-label={accessibilityLabel || (lead ? `${lead} ${title}` : title)}
      aria-selected={!!on}
      accessibilityState={{ selected: !!on, disabled: !!disabled }}
      onPress={disabled ? undefined : () => { tap(); onPress?.(); }}
      hitSlop={3}
      minH={small ? 38 : 44}
      minW={wide ? 96 : 44}
      px={small ? 12 : 16}
      items="center"
      justify="center"
      rounded={999}
      bg={bg}
      borderWidth={on || tinted ? 0 : 1}
      borderColor="$color6"
      opacity={disabled ? 0.45 : 1}
      transition="quick"
      pressStyle={{ scale: 0.95 }}
      {...rest}
    >
      <T v="label" color={fg} fontSize={small ? 14 : 15}>
        {lead ? <T v="label" color={fg} weight="black" fontSize={small ? 14 : 15}>{`${lead} `}</T> : null}
        {title}
      </T>
    </XStack>
  );
}

// ---------------------------------------------------------------- chips, cards, rows
export function Chip({ title, onRemove, cat }: { title: string; onRemove?: () => void; cat?: Cat | null }) {
  const bg: ColorTokens = cat !== undefined ? catColor(cat, 9) : "$color12";
  const fg: ColorTokens = cat !== undefined ? "$white1" : "$color1";
  return (
    <XStack
      role={onRemove ? "button" : undefined}
      aria-label={onRemove ? `Remove ${title}` : title}
      onPress={onRemove}
      hitSlop={6}
      px={12}
      py={7}
      gap={6}
      items="center"
      rounded={999}
      bg={bg}
      self="flex-start"
      transition="quick"
      enterStyle={{ scale: 0.8, opacity: 0 }}
      pressStyle={onRemove ? { scale: 0.94 } : undefined}
    >
      <T v="label" color={fg} fontSize={14}>{title}</T>
      {onRemove ? <T v="label" color={fg} weight="black" fontSize={14}>×</T> : null}
    </XStack>
  );
}

export function Card({ children, pad = 16, tone = "card", elevated = true, ...rest }: YStackProps & { pad?: number; tone?: "card" | "page"; elevated?: boolean }) {
  return (
    <YStack
      bg={tone === "page" ? "$page" : "$card"}
      rounded={22}
      p={pad}
      shadowColor="$shadowColor"
      shadowOpacity={elevated ? 0.08 : 0}
      shadowRadius={14}
      shadowOffset={{ width: 0, height: 4 }}
      elevation={elevated ? 2 : 0}
      {...rest}
    >
      {children}
    </YStack>
  );
}

// A card tinted with a category's colour family.
export function CatCard({ cat, children, ...rest }: YStackProps & { cat: Cat | null }) {
  return (
    <Theme name={catTheme(cat)}>
      <YStack bg="$color3" rounded={22} p={16} {...rest}>{children}</YStack>
    </Theme>
  );
}

export function Row({ children, gap = 8, wrap, center = true, ...rest }: XStackProps & { wrap?: boolean; center?: boolean }) {
  return <XStack gap={gap} items={center ? "center" : "flex-start"} flexWrap={wrap ? "wrap" : undefined} {...rest}>{children}</XStack>;
}

export function Rule(props: YStackProps) {
  return <YStack height={1} bg="$color5" {...props} />;
}

// A section heading above a group of rows or cards.
export function Section({ title, action, children, ...rest }: YStackProps & { title?: string; action?: ReactNode }) {
  return (
    <YStack gap={8} {...rest}>
      {title || action ? (
        <XStack items="center" justify="space-between" px={4} gap={8}>
          {title ? <T v="eyebrow">{title}</T> : <View />}
          {action}
        </XStack>
      ) : null}
      {children}
    </YStack>
  );
}

// A settings-style row: label + detail on the left, a control on the right. Rows stack inside a Card with pad 0.
export function ListRow({ title, detail, right, onPress, icon: I, last }: { title: string; detail?: string; right?: ReactNode; onPress?: () => void; icon?: Icon; last?: boolean }) {
  return (
    <XStack
      role={onPress ? "button" : undefined}
      onPress={onPress}
      items="center"
      gap={12}
      px={16}
      py={12}
      minH={60}
      borderBottomWidth={last ? 0 : 1}
      borderBottomColor="$color4"
      pressStyle={onPress ? { bg: "$color3" } : undefined}
    >
      {I ? (
        <YStack width={34} height={34} rounded={10} bg="$accent3" items="center" justify="center">
          <I size={18} color="$accent11" />
        </YStack>
      ) : null}
      <YStack flex={1} gap={2}>
        <T v="label">{title}</T>
        {detail ? <T v="small">{detail}</T> : null}
      </YStack>
      {right}
    </XStack>
  );
}

export function Empty({ title, body, children }: { title: string; body?: string; children?: ReactNode }) {
  return (
    <YStack p={24} gap={10} items="flex-start">
      <T v="h2">{title}</T>
      {body ? <T v="lede" color="$color11">{body}</T> : null}
      {children}
    </YStack>
  );
}

export function Badge({ n }: { n: number }) {
  if (!n) return null;
  return (
    <YStack
      aria-label={`${n} new`}
      minW={20}
      height={20}
      rounded={10}
      px={5}
      bg="$red9"
      items="center"
      justify="center"
      transition="bouncy"
      enterStyle={{ scale: 0 }}
    >
      <T fontSize={12} lineHeight={15} weight="black" color="$white1">{n > 9 ? "9+" : String(n)}</T>
    </YStack>
  );
}

// The icon's signal light: a green LED that glows and breathes while something is live, grey when not.
export function LiveDot({ on = true, size = 10 }: { on?: boolean; size?: number }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = on ? withRepeat(withTiming(0.45, { duration: 1100 }), -1, true) : 1;
  }, [on, pulse]);
  const style = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return (
    <YStack width={size} height={size} items="center" justify="center">
      {on ? (
        <Animated.View style={[{ position: "absolute" }, style]}>
          <YStack width={size * 2.2} height={size * 2.2} rounded={size * 1.1} bg="$signal" opacity={0.28} />
        </Animated.View>
      ) : null}
      <YStack
        width={size}
        height={size}
        rounded={size / 2}
        bg={on ? "$signal" : "$color8"}
        shadowColor="$signal"
        shadowOpacity={on ? 0.9 : 0}
        shadowRadius={size * 0.8}
        shadowOffset={{ width: 0, height: 0 }}
      />
    </YStack>
  );
}

// ---------------------------------------------------------------- inputs
type FieldProps = TextInputProps & { label?: string; hint?: string; multiline?: boolean; minHeight?: number; style?: StyleProp<ViewStyle> };
export const Field = forwardRef<TextInput, FieldProps>(function Field({ label, hint, minHeight, multiline, style, ...rest }, ref) {
  const common = {
    fontFamily: "$body" as const,
    fontSize: 17,
    color: "$color12" as ColorTokens,
    bg: "$card" as ColorTokens,
    borderColor: "$color6" as ColorTokens,
    borderWidth: 1,
    rounded: 14,
    px: 14,
    placeholderTextColor: "$color9" as ColorTokens,
    focusStyle: { borderColor: "$accent9" as ColorTokens, borderWidth: 2 },
    "aria-label": label,
    accessibilityHint: hint,
    maxFontSizeMultiplier: 1.5,
  };
  const input = multiline ? (
    <TextArea ref={ref as any} {...common} minH={minHeight ?? 100} py={12} verticalAlign="top" {...(rest as object)} style={style} />
  ) : (
    <Input ref={ref as any} {...common} minH={minHeight ?? 50} {...(rest as object)} style={style} />
  );
  if (!label && !hint) return input;
  return (
    <YStack gap={6}>
      {/* The input itself carries the label and hint, so screen readers read them together with the field. */}
      {label ? <T v="label" aria-hidden>{label}</T> : null}
      {input}
      {hint ? <T v="small" aria-hidden>{hint}</T> : null}
    </YStack>
  );
});

// ---------------------------------------------------------------- screens
export function Screen({ children, ...rest }: YStackProps) {
  return <YStack flex={1} bg="$page" {...rest}>{children}</YStack>;
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

// Wrap anything with a text box pinned to the bottom (composers, the record sheet on phones).
// Padding on both platforms: Android is edge to edge (SDK 57), so the window no longer resizes for the keyboard.
// KeyboardAvoidingView measures itself relative to its parent, so it's told where on screen that parent starts
// (below headers); pass `offset` only to override the measurement.
export function KeyboardArea({ children, offset, style }: { children: ReactNode; offset?: number; style?: StyleProp<ViewStyle> }) {
  const wrap = useRef<View>(null);
  const [top, setTop] = useState(0);
  const measure = () => wrap.current?.measureInWindow((_x, y) => setTop(y));
  return (
    <View ref={wrap} onLayout={measure} style={[{ flex: 1 }, style]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={offset ?? top}>
        {children}
      </KeyboardAvoidingView>
    </View>
  );
}
