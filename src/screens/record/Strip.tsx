// The day's 96 boxes: a wrapping grid on tablets, one horizontally-scrolling row on phones.
import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { DARK, type Cat } from "@/lib/codes";
import * as M from "@/lib/model";
import { tapSlot, toggleStrip } from "@/state/actions";
import type { View as ViewModel } from "@/state/view";
import type { Theme } from "@/ui/theme";

const GAP = 6;
const BOX_H = 56;
const PHONE_BOX_W = 60;

type SlotProps = {
  slot: string; time: number; a11y: string; long: boolean; extra: number; mark: string;
  cat: Cat | null; has: boolean; dark: boolean; fall: boolean; missed: boolean; now: boolean; target: boolean; future: boolean;
  width: number; t: Theme;
};

const SlotBox = memo(function SlotBox(p: SlotProps) {
  const { t } = p, k = t.cat(p.cat);
  let bg = t.colorful ? t.c.panel : t.c.ground, fg = t.c.ink, tc = t.c.mute;
  let border = t.colorful ? t.c.line : t.c.faint, bw = t.colorful ? 1 : 2, dashed = false;
  if (p.has) { bg = p.dark ? k.bg2 : k.bg; fg = k.ink; }
  if (p.fall) { bg = t.c.danger; fg = t.c.onDanger; tc = t.c.onDanger; }
  if (p.missed) { bg = t.c.fallBg; border = t.c.danger; bw = 2; dashed = true; tc = t.c.dangerInk; }
  if (p.now) { border = p.missed ? t.c.danger : t.c.accent; bw = 3; dashed = false; }
  else if (p.target) { border = t.colorful ? t.cat(null).a : t.c.edge; bw = 3; dashed = false; }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={p.a11y}
      accessibilityState={{ selected: p.target || p.now }}
      onPress={() => tapSlot(p.slot)}
      style={({ pressed }) => [
        styles.slot,
        { width: p.width, backgroundColor: bg, borderColor: border, borderWidth: bw, borderStyle: dashed ? "dashed" : "solid", borderRadius: t.colorful ? 14 : 0 },
        p.future && { opacity: 0.45 },
        pressed && { opacity: 0.7 },
      ]}
    >
      {p.has && !p.fall && t.colorful ? <View style={[styles.catBar, { backgroundColor: k.cat }]} /> : null}
      <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={[t.font("heavy"), { fontSize: 12, color: tc }]}>{M.hhmmShort(p.time)}</Text>
      <View style={styles.markRow}>
        <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={[t.font(p.long ? "heavy" : "black"), { fontSize: p.long ? 12 : 17, color: fg, flexShrink: 1 }]}>{p.mark}</Text>
        {p.extra ? <Text maxFontSizeMultiplier={1.2} style={[t.font("black"), styles.more, { color: fg }]}>+{p.extra}</Text> : null}
      </View>
    </Pressable>
  );
});

type StripProps = { V: ViewModel; target: string | null; collapsed: boolean; grid: boolean; width: number; t: Theme };

export function Strip({ V, target, collapsed, grid, width, t }: StripProps) {
  const { info, d, ctx } = V;
  const missed = new Set(V.missed);
  // Three hours per row (8 rows) whenever the boxes stay wide enough to read; otherwise as many as fit.
  const cols = (width - GAP * 11) / 12 >= 46 ? 12 : Math.max(6, Math.floor((width + GAP) / (60 + GAP)));
  const boxW = grid ? Math.floor((width - GAP * (cols - 1)) / cols) : PHONE_BOX_W;

  const boxes = Array.from({ length: info.slots }, (_, i) => {
    const key = M.slotKey(info, i), e = d.byKey[key], codes = M.entryCodes(e), time = info.start + i * M.SLOT_MS;
    const fall = codes.includes("FL"), primary = fall ? "FL" : codes[0] || "";
    const isNow = i === d.cur && d.inToday;
    const label = codes.length ? codes.map(c => M.codeText(c, ctx)).join(", ") : "empty";
    const mark = codes.length ? M.codeLabel(primary, ctx) : e?.note ? "✎" : isNow ? "·" : "";
    return (
      <SlotBox
        key={key} slot={key} time={time} a11y={`${M.hhmm(time)}: ${label}`} mark={mark}
        long={!!codes.length && !ctx.reg.CODE[primary]?.abbr} extra={codes.length > 1 ? codes.length - 1 : 0}
        cat={primary ? ctx.reg.CAT[primary] || null : null} has={!!codes.length} dark={codes.some(c => DARK.includes(c))} fall={fall}
        missed={missed.has(key)} now={isNow} target={!!target && key === V.key} future={time > V.now} width={boxW} t={t}
      />
    );
  });

  return (
    <View style={[styles.strip, { borderBottomColor: t.colorful ? t.c.line : t.c.edge, borderBottomWidth: t.colorful ? 1 : 2, paddingHorizontal: grid ? 20 : 16 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: !collapsed }}
        onPress={toggleStrip}
        style={({ pressed }) => [styles.head, pressed && { opacity: 0.7 }]}
      >
        <Text maxFontSizeMultiplier={1.3} style={[t.font("heavy"), styles.eyebrow, { color: t.c.mute }]}>{`${M.dayLong(info.start)} · a box every 15 minutes`}</Text>
        <View style={styles.hint}>
          {V.missed.length ? (
            <View style={styles.legend}>
              <View style={[styles.legendBox, { borderColor: t.c.danger, backgroundColor: t.c.fallBg }]} />
              <Text style={[t.font("semibold"), { color: t.c.mute, fontSize: 13 }]}>empty</Text>
            </View>
          ) : null}
          <Text maxFontSizeMultiplier={1.3} style={[t.font("semibold"), { color: t.c.mute, fontSize: 13, flexShrink: 1 }]}>
            {collapsed ? "Tap to show the day's boxes" : "Tap to hide · tap a box to fill it in later"}
          </Text>
          <Text style={[t.font("heavy"), { color: t.c.mute, fontSize: 14 }]} accessibilityElementsHidden importantForAccessibility="no">{collapsed ? "▾" : "▴"}</Text>
        </View>
      </Pressable>
      {collapsed ? null : grid ? (
        <View style={styles.grid}>{boxes}</View>
      ) : (
        <PhoneRow index={target ? V.targetIdx : d.cur}>{boxes}</PhoneRow>
      )}
    </View>
  );
}

// One row that scrolls sideways and keeps the current (or chosen) box in view.
function PhoneRow({ index, children }: { index: number; children: ReactNode }) {
  const ref = useRef<ScrollView>(null);
  const [vw, setVw] = useState(0);
  useEffect(() => {
    if (!vw) return;
    const x = Math.max(0, index * (PHONE_BOX_W + GAP) - vw / 2 + PHONE_BOX_W / 2);
    ref.current?.scrollTo({ x, animated: true });
  }, [index, vw]);
  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      onLayout={e => setVw(e.nativeEvent.layout.width)}
      contentContainerStyle={styles.row}
      style={styles.rowScroll}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: { paddingTop: 10, paddingBottom: 12, gap: 8 },
  head: { gap: 4, minHeight: 44, justifyContent: "center" },
  eyebrow: { fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6 },
  hint: { flexDirection: "row", alignItems: "center", gap: 8 },
  legend: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendBox: { width: 14, height: 14, borderWidth: 2, borderStyle: "dashed", borderRadius: 3 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP },
  rowScroll: { marginHorizontal: -16 },
  row: { flexDirection: "row", gap: GAP, paddingHorizontal: 16, paddingVertical: 4 },
  slot: { height: BOX_H, paddingHorizontal: 6, paddingVertical: 5, justifyContent: "space-between", overflow: "hidden" },
  catBar: { position: "absolute", left: 0, right: 0, bottom: 0, height: 4 },
  markRow: { flexDirection: "row", alignItems: "baseline", minWidth: 0 },
  more: { fontSize: 12, marginLeft: 3 },
});
