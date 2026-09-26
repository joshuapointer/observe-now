// Family's History tab: every 15-minute box of one day, latest first, with runs of empty boxes folded into one
// line. The arrows step through days. Only the chosen day is loaded, and only while this tab is open, so it
// never touches the day the rest of the app is following.
import { useEffect, useMemo, useState } from "react";
import { FlatList } from "react-native";
import { Theme, XStack, YStack } from "tamagui";

import * as M from "@/lib/model";
import type { Entry } from "@/lib/types";
import { useApp } from "@/state/app";
import { dayPath, store } from "@/state/session";
import { useView, whoBy } from "@/state/view";
import { catTheme } from "@/ui/cat";
import { ChevronLeft, ChevronRight } from "@/ui/icons";
import { NoteCard } from "@/ui/NoteCard";
import { useLayout } from "@/ui/layout";
import { Button, IconButton, Screen, T } from "@/ui/primitives";

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
        <XStack px={16} py={4} gap={12} items="center">
          <YStack width={M.clock.h12 ? 64 : 46} />
          <YStack width={2} height={18} bg="$color5" ml={4} mr={4} />
          <T v="small" fontSize={13} color="$color10">
            {one ? `${M.hhmm(item.from)} · nothing recorded` : `${M.hhmm(item.from)} – ${M.hhmm(item.to)} · nothing recorded`}
          </T>
        </XStack>
      );
    }
    const e = item.e, codes = M.entryCodes(e);
    const cat = codes.includes("FL") ? "danger" : codes[0] ? V.ctx.reg.CAT[codes[0]] || null : null;
    const by = whoBy(e, V);
    return (
      <XStack
        accessible
        aria-label={`${M.hhmm(e.slotStart)}: ${M.entryLine(e, V.ctx, true)}${by ? `, recorded by ${by}` : ""}`}
        mx={12}
        px={14}
        py={12}
        gap={12}
        rounded={18}
        bg="$card"
        items="flex-start"
      >
        <T v="small" fontSize={13} width={M.clock.h12 ? 64 : 46} pt={1}>{M.hhmm(e.slotStart)}</T>
        <Theme name={codes.length ? catTheme(cat) : "amber"}>
          <YStack width={10} height={10} rounded={5} bg="$color9" mt={5} />
        </Theme>
        <YStack flex={1} gap={6}>
          {codes.length || (e.pain && e.pain !== "—") ? <T weight="bold" fontSize={16} lineHeight={21}>{M.codesLine(e, V.ctx, true)}</T> : null}
          {e.note ? <NoteCard text={e.note} /> : null}
          {by ? <T v="small" fontSize={13}>{by}</T> : null}
        </YStack>
      </XStack>
    );
  };

  return (
    <Screen>
      <YStack flex={1} width="100%" maxW={isTablet ? 720 : undefined} self="center">
        <XStack items="center" gap={8} px={12} py={8}>
          <IconButton icon={ChevronLeft} label="Day before" onPress={() => setSid(M.prevSid(sid))} tone="soft" />
          <YStack flex={1} items="center" gap={1}>
            <T v="h2">{isToday ? "Today" : M.dayLong(M.dayInfo(sid).start)}</T>
            <T v="small" fontSize={13}>{entries ? `${recorded} ${recorded === 1 ? "box" : "boxes"} recorded` : "Loading…"}</T>
          </YStack>
          <YStack opacity={isToday ? 0.3 : 1} pointerEvents={isToday ? "none" : "auto"}>
            <IconButton icon={ChevronRight} label="Next day" onPress={() => setSid(M.nextSid(sid))} tone="soft" />
          </YStack>
        </XStack>
        {!isToday ? (
          <XStack justify="center" pb={4}>
            <Button kind="ghost" small title="Back to today" onPress={() => setSid(today)} />
          </XStack>
        ) : null}
        <FlatList
          data={rows}
          keyExtractor={r => r.key}
          renderItem={renderRow}
          contentContainerStyle={{ paddingVertical: 8, paddingBottom: 40, gap: 6 }}
          ListEmptyComponent={entries ? <T v="small" p={20}>Nothing recorded this day.</T> : null}
        />
      </YStack>
    </Screen>
  );
}
