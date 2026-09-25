// Family's History tab: every 15-minute box of one day, latest first, with runs of empty boxes folded into one
// line. The arrows step through days. Only the chosen day is loaded, and only while this tab is open, so it
// never touches the day the rest of the app is following.
import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";

import * as M from "@/lib/model";
import type { Entry } from "@/lib/types";
import { useApp } from "@/state/app";
import { dayPath, store } from "@/state/session";
import { useView, whoBy } from "@/state/view";
import { useLayout } from "@/ui/layout";
import { Screen, T } from "@/ui/primitives";
import { useTheme } from "@/ui/theme";

type Row = { kind: "entry"; key: string; e: Entry } | { kind: "gap"; key: string; from: number; to: number };

function useDayEntries(sid: string) {
  const pid = useApp(s => s.pid);
  const [entries, setEntries] = useState<{ sid: string; list: Entry[] } | null>(null);
  useEffect(() => {
    if (!pid) return;
    return store().watchCol<Entry>(`${dayPath(sid)}/entries`, list => setEntries({ sid, list }));
  }, [pid, sid]);
  return entries?.sid === sid ? entries.list : null;
}

export function HistoryScreen() {
  const t = useTheme();
  const V = useView();
  const { isTablet } = useLayout();
  const today = M.sidAt(V.now);
  const [sid, setSid] = useState(today);
  const entries = useDayEntries(sid);
  const isToday = sid === today;

  const rows = useMemo<Row[]>(() => {
    if (!entries) return [];
    const info = M.dayInfo(sid);
    const byKey = new Map(entries.filter(e => M.entryCodes(e).length || e.note).map(e => [e.id, e]));
    const last = isToday ? Math.min(M.slotIndexAt(info, V.now), info.slots - 1) : info.slots - 1;
    const out: Row[] = [];
    let gap: { from: number; to: number } | null = null;
    const flush = () => { if (gap) out.push({ kind: "gap", key: `gap${gap.from}`, ...gap }); gap = null; };
    for (let i = last; i >= 0; i--) {
      const key = M.slotKey(info, i);
      const e = byKey.get(key);
      if (e) { flush(); out.push({ kind: "entry", key, e }); continue; }
      const start = info.start + i * M.SLOT_MS;
      gap = gap ? { from: start, to: gap.to } : { from: start, to: start };
    }
    flush();
    return out;
  }, [entries, sid, isToday, V.now]);

  const recorded = rows.filter(r => r.kind === "entry").length;

  const renderRow = ({ item }: { item: Row }) => {
    if (item.kind === "gap") {
      const one = item.from === item.to;
      return (
        <T v="small" color={t.c.mute} style={styles.gap}>
          {one ? `${M.hhmm(item.from)} · nothing recorded` : `${M.hhmm(item.from)} – ${M.hhmm(item.to)} · nothing recorded`}
        </T>
      );
    }
    const e = item.e, code = M.entryCodes(e)[0];
    const k = t.cat(code ? V.ctx.reg.CAT[code] : undefined);
    const by = whoBy(e, V);
    return (
      <View
        accessible
        accessibilityLabel={`${M.hhmm(e.slotStart)}: ${M.entryLine(e, V.ctx, true)}${by ? `, recorded by ${by}` : ""}`}
        style={[styles.entry, { backgroundColor: t.c.panel, borderLeftColor: k.a, borderRadius: t.colorful ? 14 : 0 }]}
      >
        <T v="small" color={t.c.mute} style={{ width: M.clock.h12 ? 64 : 46 }}>{M.hhmm(e.slotStart)}</T>
        <View style={{ flex: 1, gap: 2 }}>
          <T weight="bold">{M.entryLine(e, V.ctx, true)}</T>
          {by ? <T v="small" color={t.c.mute}>{by}</T> : null}
        </View>
      </View>
    );
  };

  return (
    <Screen>
      <View style={{ flex: 1, width: "100%", maxWidth: isTablet ? 720 : undefined, alignSelf: "center" }}>
        <View style={[styles.dayBar, { borderBottomColor: t.colorful ? t.c.line : t.c.edge }]}>
          <DayArrow icon="chevron-back" label="Day before" onPress={() => setSid(M.prevSid(sid))} />
          <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
            <T weight="black" style={{ fontSize: 18 }}>{isToday ? "Today" : M.dayLong(M.dayInfo(sid).start)}</T>
            <T v="small" color={t.c.mute}>
              {entries ? `${recorded} ${recorded === 1 ? "box" : "boxes"} recorded · latest first` : "Loading…"}
            </T>
          </View>
          <DayArrow icon="chevron-forward" label="Next day" disabled={isToday} onPress={() => setSid(M.nextSid(sid))} />
        </View>
        {!isToday ? (
          <Pressable accessibilityRole="button" onPress={() => setSid(today)} style={styles.todayLink} hitSlop={8}>
            <T v="label" color={t.c.accentInk}>Back to today</T>
          </Pressable>
        ) : null}
        <FlatList
          data={rows}
          keyExtractor={r => r.key}
          renderItem={renderRow}
          contentContainerStyle={{ padding: 12, gap: 6 }}
          ListEmptyComponent={entries ? <T v="small" color={t.c.mute} style={{ padding: 12 }}>Nothing recorded this day.</T> : null}
        />
      </View>
    </Screen>
  );
}

function DayArrow({ icon, label, onPress, disabled }: { icon: "chevron-back" | "chevron-forward"; label: string; onPress: () => void; disabled?: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.arrow, { backgroundColor: pressed ? t.c.press : t.c.ground, opacity: disabled ? 0.35 : 1, borderRadius: t.r.md }]}
    >
      <Ionicons name={icon} size={24} color={t.c.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dayBar: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  arrow: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  todayLink: { alignSelf: "center", paddingTop: 10 },
  entry: { flexDirection: "row", gap: 10, padding: 14, borderLeftWidth: 4 },
  gap: { paddingHorizontal: 14, paddingVertical: 4 },
});
