// The brand, from the app icon's glass layers: the lens (an eye that watches over), the aperture ring (the
// 15-minute cycle), and the swirl mark. Used on the splash, sign-in, the intro, loading, and quietly in the app.
import { useEffect } from "react";
import { Image, type ImageStyle, type StyleProp } from "react-native";
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { YStack, type YStackProps } from "tamagui";

import { SCREENSHOTS } from "@/lib/config";
import { useNight } from "./theme";

export const BRAND = {
  lens: require("../../assets/brand/lens.png"),
  aperture: require("../../assets/brand/aperture.png"),
  markLight: require("../../assets/brand/mark-lavender.png"),
  markDark: require("../../assets/brand/mark-clear.png"),
  markGreen: require("../../assets/brand/mark-green.png"),
};

// A slow, endless turn. `seconds` is one full revolution; pass 0 to hold still. The screenshot build holds everything
// still, so the automation can tell when a screen has settled.
function useSpin(seconds: number, reverse = false) {
  const turn = useSharedValue(0);
  useEffect(() => {
    if (!seconds || SCREENSHOTS) return;
    turn.value = withRepeat(withTiming(1, { duration: seconds * 1000, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(turn);
  }, [seconds, turn]);
  return useAnimatedStyle(() => ({ transform: [{ rotate: `${(reverse ? -1 : 1) * turn.value * 360}deg` }] }));
}

// A gentle breathing scale, for the lens.
function useBreath(on: boolean) {
  const s = useSharedValue(1);
  useEffect(() => {
    if (!on || SCREENSHOTS) return;
    s.value = withRepeat(withTiming(1.04, { duration: 1800, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(s);
  }, [on, s]);
  return useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
}

export function Lens({ size, breathe = false, style, onLoad }: { size: number; breathe?: boolean; style?: StyleProp<ImageStyle>; onLoad?: () => void }) {
  const anim = useBreath(breathe);
  return <Animated.Image source={BRAND.lens} onLoad={onLoad} fadeDuration={0} style={[{ width: size, height: size }, anim, style]} accessibilityIgnoresInvertColors />;
}

export function Aperture({ size, seconds = 24, reverse, opacity = 1 }: { size: number; seconds?: number; reverse?: boolean; opacity?: number }) {
  const spin = useSpin(seconds, reverse);
  return <Animated.Image source={BRAND.aperture} style={[{ width: size, height: size, opacity }, spin]} accessibilityIgnoresInvertColors />;
}

// The lens inside the turning aperture ring: the brand's "eye", for sign-in, the intro and loading.
export function BrandEye({ size = 120, speed = 24, ...rest }: YStackProps & { size?: number; speed?: number }) {
  return (
    <YStack width={size} height={size} items="center" justify="center" aria-hidden {...rest}>
      <YStack position="absolute"><Aperture size={size} seconds={speed} /></YStack>
      <Lens size={size * 0.64} breathe />
    </YStack>
  );
}

// The swirl mark, very faint, behind content (cards, empty states). Lavender by day, clear glass at night.
export function Watermark({ size, opacity, ...rest }: YStackProps & { size: number; opacity?: number }) {
  const night = useNight();
  const spin = useSpin(90);
  return (
    <YStack position="absolute" pointerEvents="none" aria-hidden {...rest}>
      <Animated.View style={spin}>
        <Image source={night ? BRAND.markDark : BRAND.markLight} style={{ width: size, height: size, opacity: opacity ?? (night ? 0.18 : 0.35) }} />
      </Animated.View>
    </YStack>
  );
}
