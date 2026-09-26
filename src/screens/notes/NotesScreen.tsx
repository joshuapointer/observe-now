// Every note written on one day, latest first: the ones family can see (kept on the entry) and the caregivers-only
// ones. The arrows step through days; only the chosen day is loaded, and only while this page is open.
import { useEffect, useMemo, useState } from "react";
import { FlatList } from "react-native";
import { XStack, YStack } from "tamagui";

import * as M from "@/lib/model";
import type { Entry, PrivateNote } from "@/lib/types";
import { useApp } from "@/state/app";
import { dayPath, store } from "@/state/session";
import { useView } from "@/state/view";
import { ChevronLeft, ChevronRight } from "@/ui/icons";
import { useLayout } from "@/ui/layout";
import { NoteCard } from "@/ui/NoteCard";
import { Button, Empty, IconButton, Screen, T } from "@/ui/primitives";

type Note = { key: string; at: number; text: string; by?: string; privateOnly: boolean };

function useDayNotes(sid: string) {
  const pid = useApp(s => s.pid);
  const [entries, setEntries] = useState<{ sid: string; list: Entry[] } | null>(null);
  const [priv, setPriv] = useState<{ sid: string; list: PrivateNote[] } | null>(null);
  useEffect(() => {
    if (!pid) return;
    const a = store().watchCol<Entry>(`${dayPath(sid)}/entries`, list => setEntries({ sid, list }));
    const b = store().watchCol<PrivateNote>(`${dayPath(sid)}/privateNotes`, list => setPriv({ sid, list }));
    return () => { a(); b(); };
  }, [pid, sid]);
  return useMemo<Note[] | null>(() => {
    if (entries?.sid !== sid || priv?.sid !== sid) return null;
    const shared = entries.list.filter(e => e.note).map(e => ({ key: `e:${e.id}`, at: e.slotStart, text: e.note!, by: e.byName, privateOnly: false }));
    const own = priv.list.filter(p => p.note).map(p => ({ key: `p:${p.id}`, at: p.at, text: p.note, by: p.byName, privateOnly: true }));
    return [...shared, ...own].sort((x, y) => y.at - x.at);
  }, [entries, priv, sid]);
}

export function NotesScreen() {
  const V = useView();
  const { isTablet } = useLayout();
  const today = M.sidAt(V.now);
  const [sid, setSid] = useState(today);
  const notes = useDayNotes(sid);
  const isToday = sid === today;

  return (
    <Screen>
      <YStack flex={1} width="100%" maxW={isTablet ? 720 : undefined} self="center">
        <XStack items="center" gap={8} px={12} py={8}>
          <IconButton icon={ChevronLeft} label="Day before" onPress={() => setSid(M.prevSid(sid))} tone="soft" />
          <YStack flex={1} items="center" gap={1}>
            <T v="h2">{isToday ? "Today" : M.dayLong(M.dayInfo(sid).start)}</T>
            <T v="small" fontSize={13}>{notes ? `${notes.length} ${notes.length === 1 ? "note" : "notes"}` : "Loading…"}</T>
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
          data={notes || []}
          keyExtractor={n => n.key}
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 10 }}
          renderItem={({ item: n }) => (
            <NoteCard
              text={n.text}
              privateOnly={n.privateOnly}
              meta={`${M.hhmm(n.at)}${n.by ? ` · ${M.firstName(n.by)}` : ""} · ${n.privateOnly ? "Caregivers only" : "Family can see it"}`}
            />
          )}
          ListEmptyComponent={notes ? <Empty title="No notes this day" body="Notes written on the Care tab show up here." /> : null}
        />
      </YStack>
    </Screen>
  );
}
