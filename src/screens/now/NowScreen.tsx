// Now: the caregiver's home, used every 15 minutes. The current box up top (tap to record), one-tap codes used
// lately, at most one thing needing attention, the day's boxes, and the last few entries. The Record button
// opens the full picker; its menu has the fall alert, medicines and messages.
import { router } from "expo-router";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatePresence, Theme, XStack, YStack } from "tamagui";

import * as M from "@/lib/model";
import type { Entry } from "@/lib/types";
import { backfillNext, editEntry, openRecord, openThread, pick, quickRecord, viewToday, viewYesterday } from "@/state/actions";
import { useApp } from "@/state/app";
import { canEdit, fromCaregiver, useView, whoBy, type View as ViewModel } from "@/state/view";
import { NowCard } from "@/screens/family/NowCard";
import { catTheme } from "@/ui/cat";
import { Fab } from "@/ui/Fab";
import { MessagesSquare, NotebookPen, Pill, Plus, Siren, TriangleAlert } from "@/ui/icons";
import { RAIL_WIDTH, useLayout } from "@/ui/layout";
import { NoteCard } from "@/ui/NoteCard";
import { Button, Card, Screen, Section, Seg, T } from "@/ui/primitives";
import { Hero } from "./Hero";
import { Timeline } from "./Timeline";

// The one thing that needs doing, if any: an unfinished fall report beats empty boxes.
function Attention({ V }: { V: ViewModel }) {
  const f = V.day?.fall;
  const fallOpen = V.isToday && f && !f.filedAt;
  const missed = V.isToday && V.missed.length > 0;
  return (
    <AnimatePresence>
      {fallOpen ? (
        <Theme name="red" key="fall">
          <XStack bg="$color3" rounded={20} p={14} gap={12} items="center" transition="quick" enterStyle={{ opacity: 0, y: -8 }} exitStyle={{ opacity: 0 }}>
            <Siren size={24} color="$color11" />
            <T v="label" color="$color12" flex={1}>{`The fall report from ${M.hhmm(f.at)} hasn't been sent yet.`}</T>
            <Button kind="danger" small title="Finish it" onPress={() => router.navigate("/fall")} />
          </XStack>
        </Theme>
      ) : missed ? (
        <Theme name="orange" key="missed">
          <XStack bg="$color3" rounded={20} p={14} gap={12} items="center" transition="quick" enterStyle={{ opacity: 0, y: -8 }} exitStyle={{ opacity: 0 }}>
            <TriangleAlert size={22} color="$color11" />
            <YStack flex={1}>
              <T v="label" color="$color12">{V.missed.length === 1 ? "1 box was left empty" : `${V.missed.length} boxes were left empty`}</T>
              <T v="small" color="$color11">{V.missedTimes.slice(0, 4).join(", ")}{V.missedTimes.length > 4 ? "…" : ""}</T>
            </YStack>
            <Button kind="soft" small title={`Fill ${V.missedTimes[0] || ""}`} onPress={backfillNext} />
          </XStack>
        </Theme>
      ) : null}
    </AnimatePresence>
  );
}

function Recents({ V, selected }: { V: ViewModel; selected: string[] }) {
  if (!V.isToday || !V.recents.length) return null;
  return (
    <Section title="One tap to record now">
      <XStack flexWrap="wrap" gap={8}>
        {V.recents.map(c => (
          <Seg
            key={c}
            cat={V.ctx.reg.CAT[c] || null}
            on={selected.includes(c)}
            lead={V.plain ? undefined : V.ctx.reg.CODE[c]?.abbr || undefined}
            title={M.codeText(c, V.ctx, V.plain).split(" — ")[0]}
            accessibilityLabel={`Record ${M.codeText(c, V.ctx, true)} now`}
            onPress={() => quickRecord(c)}
          />
        ))}
      </XStack>
    </Section>
  );
}

function EntryRow({ e, V, editable }: { e: Entry; V: ViewModel; editable: boolean }) {
  const codes = M.entryCodes(e), fall = codes.includes("FL");
  const cat = fall ? "danger" : codes[0] ? V.ctx.reg.CAT[codes[0]] || null : null;
  const who = whoBy(e, V);
  return (
    <XStack
      role={editable ? "button" : undefined}
      aria-label={`${M.hhmm(e.slotStart)}: ${M.entryLine(e, V.ctx, true)}${who ? `, by ${who}` : ""}${editable ? ". Tap to change" : ""}`}
      onPress={editable ? () => editEntry(e.sid, e.id) : undefined}
      gap={12}
      py={10}
      items="flex-start"
      pressStyle={editable ? { opacity: 0.7 } : undefined}
    >
      <Theme name={codes.length ? catTheme(cat) : "amber"}>
        <YStack width={10} height={10} rounded={5} bg="$color9" mt={6} />
      </Theme>
      <YStack flex={1} gap={4}>
        {codes.length || (e.pain && e.pain !== "—") ? <T v="label" color={fall ? "$red11" : "$color12"}>{M.codesLine(e, V.ctx, V.plain)}</T> : null}
        {e.note ? <NoteCard text={e.note} /> : null}
        <T v="small">{`${M.hhmm(e.slotStart)}${who ? ` · ${who}` : ""}`}</T>
      </YStack>
      {editable ? <T v="small" color="$accent11" weight="heavy">Edit</T> : null}
    </XStack>
  );
}

function Latest({ V, canEditEntry }: { V: ViewModel; canEditEntry: (e: Entry) => boolean }) {
  const list = [...V.feed].sort((a, b) => b.slotStart - a.slotStart).slice(0, 5);
  if (!list.length) return null;
  return (
    <Section title="Recorded lately">
      <Card py={4}>
        {list.map(e => <EntryRow key={`${e.sid}/${e.id}`} e={e} V={V} editable={canEditEntry(e)} />)}
      </Card>
    </Section>
  );
}

function MessagesPeek({ V }: { V: ViewModel }) {
  const notes = V.messages.slice(0, 3);
  return (
    <Section title="Messages" action={<Button kind="ghost" small title={V.unreadMsgs ? `${V.unreadMsgs} new` : "Open"} onPress={() => router.navigate("/messages")} />}>
      <Card gap={8}>
        {notes.length ? notes.map(n => {
          const mine = fromCaregiver(n), isNew = !mine && V.unreadIds.has(n.id);
          return (
            <T key={n.id} v="body" fontSize={15} lineHeight={20} weight={isNew ? "heavy" : "regular"} numberOfLines={2}>
              <T v="body" fontSize={15} lineHeight={20} weight="heavy">{mine ? `${n.who} (you)` : n.who}: </T>{n.text}
            </T>
          );
        }) : <T v="small">No messages yet.</T>}
      </Card>
    </Section>
  );
}

export function NowScreen() {
  const V = useView(), S = useApp();
  const insets = useSafeAreaInsets();
  const { width, isTablet } = useLayout();
  const when = M.hhmm(V.info.start + V.targetIdx * M.SLOT_MS);
  const saved = V.d.byKey[V.key] || null;
  const editable = canEdit(S, V, saved) && M.entryCodes(saved).length > 0;
  const canEditEntry = (e: Entry) => canEdit(S, V, e);
  const pad = isTablet ? 24 : 16;
  const colW = (isTablet ? width - RAIL_WIDTH - pad : width) - insets.left - insets.right - pad * 2;

  const main = (
    <>
      {!V.isToday ? (
        <Theme name="accent">
          <XStack bg="$color3" rounded={20} p={14} gap={12} items="center">
            <T v="label" flex={1}>{`Looking at ${M.dayLong(V.info.start)}. Recording is off.`}</T>
            <Button kind="primary" small title="Back to today" onPress={viewToday} />
          </XStack>
        </Theme>
      ) : null}
      <Attention V={V} />
      <Hero V={V} saved={saved} editable={editable} pending={S.pendingCodes} when={when} target={!!S.target} />
      <Recents V={V} selected={S.pendingCodes} />
      <Section
        title={V.isToday ? "Today, every 15 minutes" : M.dayLong(V.info.start)}
        action={V.isToday ? <Button kind="ghost" small title="Yesterday" onPress={viewYesterday} /> : null}
      >
        <Timeline V={V} target={S.target} grid={isTablet} width={colW} />
      </Section>
      <Latest V={V} canEditEntry={canEditEntry} />
    </>
  );

  const fab = V.isToday ? (
<Fab
      label="Record and more"
      actions={[
        { label: "Record", icon: Plus, onPress: openRecord, tone: "primary" },
        { label: "Report a fall", icon: Siren, onPress: () => pick("FL"), tone: "danger" },
        { label: "Give a medicine", icon: Pill, onPress: () => router.navigate("/care") },
        { label: "Write a note", icon: NotebookPen, onPress: () => router.navigate("/care") },
        { label: "Message family", icon: MessagesSquare, onPress: () => { openThread("new"); router.navigate("/messages"); } },
      ]}
    />
  ) : null;

  if (isTablet) {
    return (
      <Screen>
        <XStack flex={1} pl={insets.left} pr={insets.right}>
          <YStack flex={1}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: pad, paddingBottom: 120, gap: 20 }}>{main}</ScrollView>
          </YStack>
          <YStack width={RAIL_WIDTH + pad}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: pad, paddingRight: pad, gap: 20 }}>
              <Section title="What family see right now">
                <NowCard V={V} compact />
              </Section>
              <MessagesPeek V={V} />
            </ScrollView>
          </YStack>
        </XStack>
        {fab}
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: pad, paddingLeft: pad + insets.left, paddingRight: pad + insets.right, paddingBottom: 120, gap: 20 }}>
        {main}
        <MessagesPeek V={V} />
      </ScrollView>
      {fab}
    </Screen>
  );
}
