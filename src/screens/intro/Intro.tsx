// The welcome: a few full-screen pages, one idea each, built from the icon's glass (the lens, the aperture ring,
// the swirl). Shown once per person and device, and again from Settings → Tour.
import { useRef, useState } from "react";
import { Image, Modal, ScrollView, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { XStack, YStack } from "tamagui";

import { closeModal } from "@/state/actions";
import { actingAs, useApp } from "@/state/app";
import { useView } from "@/state/view";
import { Aperture, BRAND, BrandEye, Lens, Watermark } from "@/ui/Brand";
import { Button, T } from "@/ui/primitives";
import { useNight } from "@/ui/theme";

type Page = { art: "eye" | "aperture" | "mark" | "signal"; title: string; body: string };

function Art({ kind, size }: { kind: Page["art"]; size: number }) {
  const night = useNight();
  if (kind === "eye") return <BrandEye size={size} speed={30} />;
  if (kind === "aperture") {
    return (
      <YStack width={size} height={size} items="center" justify="center">
        <Aperture size={size} seconds={12} />
        <YStack position="absolute" items="center">
          <T fontSize={size * 0.2} lineHeight={size * 0.24} weight="black" color="$color12">15</T>
          <T v="eyebrow">minutes</T>
        </YStack>
      </YStack>
    );
  }
  if (kind === "mark") return <Image source={night ? BRAND.markDark : BRAND.markLight} style={{ width: size, height: size }} />;
  return <Lens size={size * 0.8} breathe />;
}

export function Intro({ open }: { open: boolean }) {
  const V = useView();
  const isFamily = useApp(s => actingAs(s)) === "family";
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const scroll = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const n = V.ctx.name, c = V.ctx.caregiver;

  const pages: Page[] = isFamily
    ? [
      { art: "eye", title: "Observe Now", body: `See how ${n} is doing, kept up to date by ${c} through the day and night.` },
      { art: "mark", title: "Right now, in plain words", body: "The coloured card is what's happening now. Everything else follows below it, in time order." },
      { art: "signal", title: "Only what matters interrupts", body: `A red card means something important, like a fall. Tap Message to write to ${c}.` },
    ]
    : [
      { art: "eye", title: "Observe Now", body: `A calm, shared picture of ${n}'s day and night, for everyone who cares for ${V.ctx.pronouns.him}.` },
      { art: "aperture", title: "One tap every 15 minutes", body: "Tap the big card, or + then Record, and choose everything that fits. The chips under the card save in one tap." },
      { art: "mark", title: "Family see it, in plain words", body: "A fall or pain of 7 or more alerts them at once. Messages go both ways." },
      { art: "signal", title: "The green light means live", body: "It shows when family are watching. When you finish, tap the person button at the top and End shift." },
    ];
  const last = page === pages.length - 1;
  const go = (i: number) => { scroll.current?.scrollTo({ x: i * width, animated: true }); setPage(i); };
  const art = Math.min(width, height) * (height > width ? 0.52 : 0.36);

  return (
    <Modal visible={open} animationType="fade" onRequestClose={closeModal} statusBarTranslucent>
      <YStack flex={1} bg="$page" overflow="hidden">
        <Watermark size={Math.max(width, height) * 0.9} opacity={0.08} t={-height * 0.25} r={-width * 0.35} />
        <XStack justify="flex-end" px={20} pt={insets.top + 8}>
          {last ? <YStack height={40} /> : <Button kind="ghost" small title="Skip" onPress={closeModal} />}
        </XStack>
        <ScrollView
          ref={scroll}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={e => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
          style={{ flex: 1 }}
        >
          {pages.map((p, i) => (
            <YStack key={i} width={width} flex={1} items="center" justify="center" px={32} gap={28}>
              <YStack transition="lazy" opacity={page === i ? 1 : 0.3} scale={page === i ? 1 : 0.9}>
                <Art kind={p.art} size={art} />
              </YStack>
              <YStack gap={12} maxW={520} items="center">
                <T v="title" center fontSize={30} lineHeight={36}>{p.title}</T>
                <T v="lede" center color="$color11" fontSize={18} lineHeight={25}>{p.body}</T>
              </YStack>
            </YStack>
          ))}
        </ScrollView>
        <YStack px={24} pb={insets.bottom + 20} pt={12} gap={20} items="center">
          <XStack gap={8} aria-label={`Page ${page + 1} of ${pages.length}`}>
            {pages.map((_, i) => (
              <YStack key={i} height={8} width={i === page ? 26 : 8} rounded={4} bg={i === page ? "$accent9" : "$color6"} transition="quick" />
            ))}
          </XStack>
          <YStack width="100%" maxW={420}>
            <Button kind="primary" big title={last ? "Let's go" : "Next"} onPress={() => (last ? closeModal() : go(page + 1))} />
          </YStack>
        </YStack>
      </YStack>
    </Modal>
  );
}
