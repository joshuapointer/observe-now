// The day's 96 boxes: one sideways-scrolling row on phones (the current box kept in view), a grid on tablets.
// Tap a box to fill it in; empty boxes that were missed have a dashed red outline.
import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import { ScrollView } from "react-native";
import { Theme, XStack, YStack } from "tamagui";

import { type Cat } from "@/lib/codes";
import * as M from "@/lib/model";
import { tapSlot } from "@/state/actions";
import type { View as ViewModel } from "@/state/view";
import { catTheme } from "@/ui/cat";
import { T } from "@/ui/primitives";

const GAP = 6;
const BOX_W = 56;
const BOX_H = 60;

type SlotProps = {
  slot: string; time: number; a11y: string; mark: string; extra: number; long: boolean;
  cat: Cat | null; has: boolean; fall: boolean; missed: boolean; now: boolean; target: boolean; future: boolean; width: number;
};

const Slot = memo(function Slot(p: SlotProps) {
  const theme = p.fall ? "red" : p.has ? catTheme(p.cat) : p.missed ? "red" : null;
  const bg = p.fall ? "$color9" : p.has ? "$color4" : p.missed ? "$color2" : "$card";
  const fg = p.fall ? "$white1" : p.has ? "$color12" : "$color11";
  const border = p.now ? "$accent9" : p.target ? "$accent8" : p.missed ? "$color8" : "$color5";
  return (
    <Theme name={theme}>
      <YStack
        role="button"
        aria-label={p.a11y}
        aria-selected={p.now || p.target}
        onPress={() => tapSlot(p.slot)}
        width={p.width}
        height={BOX_H}
        px={6}
        py={6}
        rounded={14}
        bg={bg}
        borderWidth={p.now || p.target ? 3 : p.missed ? 2 : 1}
        borderColor={border}
        borderStyle={p.missed && !p.now ? "dashed" : "solid"}
        opacity={p.future ? 0.4 : 1}
        justify="space-between"
        pressStyle={{ scale: 0.94 }}
        transition="quick"
      >
        <T fontSize={11} lineHeight={13} weight="heavy" color={p.fall ? "$white1" : "$color11"} numberOfLines={1} maxFontSizeMultiplier={1.2}>
          {M.hhmmShort(p.time)}
        </T>
        <XStack items="baseline">
          <T fontSize={p.long ? 12 : 17} lineHeight={p.long ? 14 : 20} weight="black" color={fg} numberOfLines={1} flexShrink={1} maxFontSizeMultiplier={1.2}>
            {p.mark}
          </T>
          {p.extra ? <T fontSize={11} lineHeight={13} weight="black" color={fg} ml={2}>+{p.extra}</T> : null}
        </XStack>
      </YStack>
    </Theme>
  );
});

export function Timeline({ V, target, grid, width }: { V: ViewModel; target: string | null; grid: boolean; width: number }) {
  const { info, d, ctx } = V;
  const missed = new Set(V.missed);
  const cols = (width - GAP * 11) / 12 >= 46 ? 12 : Math.max(6, Math.floor((width + GAP) / (60 + GAP)));
  const boxW = grid ? Math.floor((width - GAP * (cols - 1)) / cols) : BOX_W;

  const boxes = Array.from({ length: info.slots }, (_, i) => {
    const key = M.slotKey(info, i), e = d.byKey[key], codes = M.entryCodes(e), time = info.start + i * M.SLOT_MS;
    const fall = codes.includes("FL"), primary = fall ? "FL" : codes[0] || "";
    const isNow = i === d.cur && d.inToday;
    return (
      <Slot
        key={key} slot={key} time={time}
        a11y={`${M.hhmm(time)}: ${codes.length ? M.codesText(codes, ctx) : "empty"}`}
        mark={codes.length ? M.codeLabel(primary, ctx) : e?.note ? "✎" : isNow ? "•" : ""}
        long={!!codes.length && !ctx.reg.CODE[primary]?.abbr} extra={codes.length > 1 ? codes.length - 1 : 0}
        cat={primary ? ctx.reg.CAT[primary] || null : null} has={!!codes.length} fall={fall}
        missed={missed.has(key)} now={isNow} target={!!target && key === V.key} future={time > V.now} width={boxW}
      />
    );
  });

  return grid ? <XStack flexWrap="wrap" gap={GAP}>{boxes}</XStack> : <PhoneRow index={target ? V.targetIdx : d.cur}>{boxes}</PhoneRow>;
}

// One row that scrolls sideways and keeps the current (or chosen) box in view.
function PhoneRow({ index, children }: { index: number; children: ReactNode }) {
  const ref = useRef<ScrollView>(null);
  const [vw, setVw] = useState(0);
  useEffect(() => {
    if (!vw) return;
    ref.current?.scrollTo({ x: Math.max(0, index * (BOX_W + GAP) - vw / 2 + BOX_W / 2), animated: true });
  }, [index, vw]);
  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      onLayout={e => setVw(e.nativeEvent.layout.width)}
      contentContainerStyle={{ flexDirection: "row", gap: GAP, paddingHorizontal: 16, paddingVertical: 4 }}
      style={{ marginHorizontal: -16 }}
    >
      {children}
    </ScrollView>
  );
}
