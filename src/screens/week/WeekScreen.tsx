// The last seven nights, evening to morning: a strip of 15-minute cells per night, a few headline numbers, and
// patterns worth mentioning to the nurse or doctor.
import { useFocusEffect } from "expo-router";
import { memo, useCallback } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { XStack, YStack, type ColorTokens } from "tamagui";

import type { CellKind, Night } from "@/lib/model";
import * as M from "@/lib/model";
import { loadTrends } from "@/state/actions";
import { useApp } from "@/state/app";
import { useLayout } from "@/ui/layout";
import { Card, Empty, Scroll, Screen, Section, T } from "@/ui/primitives";

const CELL_LABEL: Record<CellKind, string> = {
  none: "Nothing recorded", sleep: "Asleep", awake: "Awake and calm", agit: "Restless", fall: "Fall",
};
const CELL_COLOR: Record<CellKind, ColorTokens> = { sleep: "$blue9", awake: "$green8", agit: "$orange9", fall: "$red9", none: "$color5" };

const NightRow = memo(function NightRow({ night, isTablet }: { night: Night; isTablet: boolean }) {
  const cells: CellKind[] = night.empty ? Array<CellKind>(48).fill("none") : night.cells;
  const noteText = night.empty ? "nothing recorded" : night.note || "—";
  return (
    <YStack gap={4}>
      <XStack items="center" gap={10}>
        <T v="label" fontSize={14} width={64}>{night.label}</T>
        <XStack flex={1} gap={1.5}>
          {cells.map((c, i) => (
            <YStack
              key={i}
              aria-label={night.start != null && c !== "none" ? `${M.hhmm(night.start + i * M.SLOT_MS)}: ${CELL_LABEL[c]}` : undefined}
              flex={1}
              height={isTablet ? 28 : 24}
              rounded={3}
              bg={CELL_COLOR[c]}
            />
          ))}
        </XStack>
        {isTablet ? <T v="small" fontSize={13} width={120} text="right">{noteText}</T> : null}
      </XStack>
      {!isTablet ? <T v="small" fontSize={13} pl={74}>{noteText}</T> : null}
    </YStack>
  );
});

export function WeekScreen() {
  const { isTablet } = useLayout();
  const insets = useSafeAreaInsets();
  const trends = useApp(s => s.trends);

  useFocusEffect(useCallback(() => { loadTrends(); }, []));

  if (!trends || trends.loading) {
    return <Screen><Empty title="Loading the last seven nights…" /></Screen>;
  }

  const { nights, summary } = trends;
  const legend: [string, ColorTokens][] = [["Asleep", "$blue9"], ["Awake and calm", "$green8"], ["Restless", "$orange9"], ["Fall", "$red9"]];

  return (
    <Screen>
      <Scroll contentContainerStyle={{ padding: isTablet ? 24 : 16, paddingBottom: insets.bottom + 32, gap: 22 }}>
        <XStack flexWrap="wrap" gap={10}>
          {summary.stats.map(s => (
            <Card key={s.label} pad={14} gap={4} width={isTablet ? "23.5%" : "48%"} minH={96}>
              <T v="eyebrow">{s.label}</T>
              <T v="big">{s.value}</T>
              <T v="small" fontSize={13}>{s.detail}</T>
            </Card>
          ))}
        </XStack>

        <Section title={`Seven nights · ${M.hourLabel(18)} to ${M.hourLabel(6)}`}>
          <Card gap={12}>
            {nights.map((n, i) => <NightRow key={n.start ?? `${n.label}-${i}`} night={n} isTablet={isTablet} />)}
            <XStack flexWrap="wrap" gap={14} pt={4}>
              {legend.map(([label, color]) => (
                <XStack key={label} gap={6} items="center">
                  <YStack width={12} height={12} rounded={3} bg={color} />
                  <T v="small" fontSize={13}>{label}</T>
                </XStack>
              ))}
            </XStack>
          </Card>
        </Section>

        {summary.insights.length ? (
          <Section title="What the week shows">
            <Card gap={10}>
              {summary.insights.map((insight, i) => <T key={i} fontSize={16} lineHeight={22}>{`• ${insight}`}</T>)}
            </Card>
          </Section>
        ) : null}
      </Scroll>
    </Screen>
  );
}
