import { useFocusEffect } from "expo-router";
import { memo, useCallback } from "react";
import { StyleSheet, View } from "react-native";

import type { CellKind, Night } from "@/lib/model";
import * as M from "@/lib/model";
import { loadTrends } from "@/state/actions";
import { useApp } from "@/state/app";
import { useLayout } from "@/ui/layout";
import { Card, Empty, Row, Screen, Scroll, T } from "@/ui/primitives";
import { useTheme, type Theme } from "@/ui/theme";

const CELL_LABEL: Record<CellKind, string> = {
  none: "Nothing recorded", sleep: "Asleep", awake: "Awake and calm", agit: "Restless", fall: "Fall",
};

function cellColor(t: Theme, k: CellKind) {
  return k === "sleep" ? t.c.kSleep : k === "awake" ? t.c.kAwake : k === "agit" ? t.c.kAgit : k === "fall" ? t.c.kFall : t.c.faint;
}

const NightRow = memo(function NightRow({ night, isTablet }: { night: Night; isTablet: boolean }) {
  const t = useTheme();
  const cells: CellKind[] = night.empty ? Array<CellKind>(48).fill("none") : night.cells;
  const noteText = night.empty ? "nothing recorded" : night.note || "—";
  const cellsRow = (
    <View style={{ flex: 1, flexDirection: "row", gap: 1 }}>
      {cells.map((c, i) => (
        <View
          key={i}
          accessibilityLabel={night.start != null && c !== "none" ? `${M.hhmm(night.start + i * M.SLOT_MS)}: ${CELL_LABEL[c]}` : undefined}
          style={{ flex: 1, height: isTablet ? 26 : 22, borderRadius: t.colorful ? 3 : 0, backgroundColor: cellColor(t, c), opacity: c === "none" ? 0.5 : 1 }}
        />
      ))}
    </View>
  );
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <T v="label" style={{ width: 68 }}>{night.label}</T>
        {cellsRow}
        {isTablet ? <T v="small" style={{ width: 112, textAlign: "right" }}>{noteText}</T> : null}
      </View>
      {!isTablet ? <T v="small" style={{ paddingLeft: 78 }}>{noteText}</T> : null}
    </View>
  );
});

export function WeekScreen() {
  const t = useTheme();
  const { isTablet } = useLayout();
  const trends = useApp(s => s.trends);

  useFocusEffect(useCallback(() => { loadTrends(); }, []));

  if (!trends || trends.loading) {
    return (
      <Screen>
        <Empty title="Loading the last seven nights…" />
      </Screen>
    );
  }

  const { nights, summary } = trends;
  const legend: [string, string][] = [
    ["Asleep", t.c.kSleep], ["Awake and calm", t.c.kAwake], ["Restless", t.c.kAgit], ["Fall", t.c.kFall],
  ];

  return (
    <Screen>
      <Scroll contentContainerStyle={{ padding: isTablet ? 24 : 16, gap: 18 }}>
        <Row wrap gap={10} style={{ alignItems: "stretch" }}>
          {summary.stats.map(s => (
            <Card key={s.label} pad={14} style={{ width: isTablet ? "23.5%" : "47.5%", gap: 4, minHeight: 86 }}>
              <T v="eyebrow">{s.label}</T>
              <T v="big">{s.value}</T>
              <T v="small">{s.detail}</T>
            </Card>
          ))}
        </Row>

        <View style={{ gap: 10 }}>
          <Row wrap style={{ justifyContent: "space-between" }} gap={8}>
            <T v="eyebrow">Seven nights · {M.hourLabel(18)} to {M.hourLabel(6)}</T>
            <Row wrap gap={14}>
              {legend.map(([label, color]) => (
                <Row key={label} gap={6}>
                  <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: color }} />
                  <T v="small">{label}</T>
                </Row>
              ))}
            </Row>
          </Row>
          {nights.map((n, i) => <NightRow key={n.start ?? `${n.label}-${i}`} night={n} isTablet={isTablet} />)}
        </View>

        <View style={{ gap: 6, maxWidth: 760 }}>
          <T v="eyebrow">What the week shows</T>
          {summary.insights.map((insight, i) => (
            <View
              key={i}
              style={[
                { paddingVertical: 8 },
                i < summary.insights.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: t.c.line },
              ]}
            >
              <T v="body">{insight}</T>
            </View>
          ))}
        </View>
      </Scroll>
    </Screen>
  );
}
