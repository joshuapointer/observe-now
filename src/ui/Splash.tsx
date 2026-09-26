// The animated splash. The native splash (the lens, centred, 120pt) can't move, so the app draws the same lens in
// the same place the moment it starts, hides the native one underneath, grows the aperture ring around it, and
// then flies the lens into wherever it lives on the first real screen: the eye on sign-in, or the small lens in
// the header. The screen's own copy stays hidden until the flight lands, so there's only ever one lens.
import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { useWindowDimensions, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import * as SplashScreen from "expo-splash-screen";
import { YStack } from "tamagui";
import { create } from "zustand";

import { Aperture, Lens } from "./Brand";
import { useColors } from "./theme";

export const SPLASH_LENS = 120; // app.json → expo-splash-screen imageWidth
const RING = SPLASH_LENS / 0.64; // the eye's ring around a lens of that size

// Where the lens should land: its centre and the lens's size there. `ring` says whether the target shows the ring.
type Target = { cx: number; cy: number; lens: number; ring: boolean };
export const useSplash = create<{ target: Target | null; done: boolean }>(() => ({ target: null, done: false }));

// A screen's lens registers itself as the landing spot, and stays invisible until the splash has landed there.
export function useSplashTarget(ref: RefObject<View | null>, ring: boolean) {
  const done = useSplash(s => s.done);
  const measure = () => {
    if (useSplash.getState().done) return;
    ref.current?.measureInWindow((x, y, w, h) => {
      if (!w) return;
      useSplash.setState({ target: { cx: x + w / 2, cy: y + h / 2, lens: ring ? w * 0.64 : w, ring } });
    });
  };
  // Clear the target if this screen goes away before the splash lands (the next one will register).
  useEffect(() => () => { if (!useSplash.getState().done) useSplash.setState({ target: null }); }, []);
  return { onLayout: measure, hidden: !done };
}

// Wrap a screen's lens (or eye, with `ring`) to make it the splash's landing spot.
export function SplashTarget({ ring = false, children }: { ring?: boolean; children: ReactNode }) {
  const ref = useRef<View>(null);
  const { onLayout, hidden } = useSplashTarget(ref, ring);
  return <View ref={ref} onLayout={onLayout} style={{ opacity: hidden ? 0 : 1 }}>{children}</View>;
}

// The native splash goes only once this copy of the lens has drawn, so there's never a blank frame between them.
const hideNative = () => SplashScreen.hideAsync().catch(() => {});

const finish = () => useSplash.setState({ done: true });

export function SplashOverlay() {
  const { width, height } = useWindowDimensions();
  const c = useColors();
  const target = useSplash(s => s.target);
  const done = useSplash(s => s.done);
  const ring = useSharedValue(0); // the aperture ring growing in
  const fly = useSharedValue(0); // 0 = centred splash, 1 = landed
  const started = useRef(0);
  const flying = useRef(false);

  useEffect(() => {
    const t = setTimeout(hideNative, 1500); // in case the image never reports loading
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    started.current = Date.now();
    ring.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [ring]);

  // Land once the first screen has said where; stay at least long enough for the ring to have appeared. If nothing
  // registers (an unexpected screen), fade out anyway rather than covering the app.
  useEffect(() => {
    if (done || flying.current) return;
    const go = (wait: number) => {
      flying.current = true;
      fly.value = withDelay(wait, withTiming(1, { duration: 650, easing: Easing.inOut(Easing.cubic) }, ok => { if (ok) scheduleOnRN(finish); }));
    };
    if (target) { go(Math.max(0, 900 - (Date.now() - started.current))); return; }
    const t = setTimeout(() => { if (!flying.current) go(0); }, 5000);
    return () => clearTimeout(t);
  }, [target, done, fly]);

  const dx = target ? target.cx - width / 2 : 0;
  const dy = target ? target.cy - height / 2 : 0;
  const scale = target ? target.lens / SPLASH_LENS : 1;
  const ringStays = target ? target.ring : false;

  const bg = useAnimatedStyle(() => ({ opacity: 1 - fly.value }));
  const mover = useAnimatedStyle(() => ({
    transform: [{ translateX: dx * fly.value }, { translateY: dy * fly.value }, { scale: 1 + (scale - 1) * fly.value }],
    opacity: target ? 1 : 1 - fly.value,
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ring.value * (ringStays ? 1 : 1 - fly.value),
    transform: [{ scale: 0.7 + 0.3 * ring.value }],
  }));

  if (done) return null;
  return (
    <YStack position="absolute" t={0} l={0} r={0} b={0} items="center" justify="center" pointerEvents="none" aria-hidden>
      <Animated.View style={[{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.page }, bg]} />
      <Animated.View style={[{ width: RING, height: RING, alignItems: "center", justifyContent: "center" }, mover]}>
        <Animated.View style={[{ position: "absolute" }, ringStyle]}>
          <Aperture size={RING} seconds={8} />
        </Animated.View>
        <Lens size={SPLASH_LENS} onLoad={hideNative} />
      </Animated.View>
    </YStack>
  );
}
