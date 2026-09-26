// Family's Updates: what's happening right now, an important alert if there is one, then everything in time
// order (an entry at its 15-minute box, a message when it was sent). Also the caregivers' read-only preview.
import { useMemo } from "react";
import { FlatList } from "react-native";
import { Theme, XStack, YStack } from "tamagui";

import * as M from "@/lib/model";
import type { Entry, Message } from "@/lib/types";
import { ackAlert, compose, reveal } from "@/state/actions";
import { useApp } from "@/state/app";
import { msgWho, useView, whoBy, type Thread, type View as ViewModel } from "@/state/view";
import { catTheme } from "@/ui/cat";
import { ChatBubble } from "@/ui/ChatBubble";
import { NoteCard } from "@/ui/NoteCard";
import { Fab } from "@/ui/Fab";
import { MessagesSquare, Siren } from "@/ui/icons";
import { useLayout } from "@/ui/layout";
import { Screen, T } from "@/ui/primitives";
import { NowCard } from "./NowCard";

type FeedItem = { at: number; x: Entry } | { at: number; t: Thread };

function MessageBubble({ n, me, isNew }: { n: Message; me?: string; isNew: boolean }) {
  return <ChatBubble text={n.text} mine={n.uid === me} who={msgWho(n)} when={M.hhmm(n.at)} isNew={isNew} />;
}

function AlertBanner({ V, framed }: { V: ViewModel; framed: boolean }) {
  const me = useApp(s => s.user?.uid);
  const al = V.alerts[0] || null;
  if (!al || V.now - al.at > 12 * 3600e3) return null;
  const acked = !!(me && al.acks?.[me]);
  return (
    <Theme name="red">
      <XStack role="alert" bg="$color9" rounded={22} p={16} gap={12} items="center" transition="bouncy" enterStyle={{ opacity: 0, scale: 0.95 }}>
        <Siren size={26} color="$white1" />
        <YStack flex={1} gap={2}>
          <T v="eyebrow" color="$white1" opacity={0.9}>{`Important · ${M.hhmm(al.at)}`}</T>
          <T v="label" color="$white1" fontSize={17}>{al.text}</T>
        </YStack>
        {!framed && !acked ? (
          <XStack role="button" onPress={() => ackAlert(al.sid, al.id)} px={14} height={40} rounded={20} bg="$white1" items="center" pressStyle={{ scale: 0.95 }}>
            <T v="label" color="$color11" weight="heavy">Got it</T>
          </XStack>
        ) : null}
      </XStack>
    </Theme>
  );
}

// framed = the caregivers' preview of the family screen (no sending, no acks).
export function FamilyScreen({ framed = false }: { framed?: boolean }) {
  const { isTablet } = useLayout();
  const V = useView();
  const me = useApp(s => s.user?.uid);
  const lastVisit = useApp(s => s.lastVisit);
  const revealed = useApp(s => s.revealed);

  const items = useMemo<FeedItem[]>(() => {
    const entries: FeedItem[] = [...V.D.entries, ...V.PD.entries]
      .filter(x => M.entryCodes(x).length || x.note)
      .map(x => ({ at: x.slotStart, x }));
    const threads: FeedItem[] = V.threads.map(th => ({ at: th.root.at, t: th }));
    return [...entries, ...threads].sort((a, b) => b.at - a.at).slice(0, 40);
  }, [V.D.entries, V.PD.entries, V.threads]);

  const isNew = (at: number, by?: string) => !framed && !!lastVisit && at > lastVisit && by !== me;
  const newCount = items.reduce((n, it) => {
    if ("x" in it) return n + (isNew(it.x.markedAt, it.x.by) ? 1 : 0);
    return n + [it.t.root, ...it.t.replies].filter(m => isNew(m.at, m.uid)).length;
  }, 0);

  const renderItem = ({ item, index }: { item: FeedItem; index: number }) => {
    const prev = items[index - 1];
    const day = M.dateKey(new Date(item.at));
    const dayBreak = !prev || M.dateKey(new Date(prev.at)) !== day;
    const heading = dayBreak ? (
      <T v="eyebrow" px={20} pt={index ? 18 : 6} pb={6}>{day === M.dateKey(new Date(V.now)) ? "Today" : M.dayLong(item.at)}</T>
    ) : null;
    if ("t" in item) {
      const th = item.t;
      return (
        <>
          {heading}
          <YStack
            mx={16}
            my={5}
            pt={12}
            px={10}
            pb={4}
            gap={8}
            rounded={24}
            bg="$card"
            shadowColor="$shadowColor"
            shadowOpacity={0.08}
            shadowRadius={14}
            shadowOffset={{ width: 0, height: 4 }}
            elevation={2}
          >
            <MessageBubble n={th.root} me={me} isNew={isNew(th.root.at, th.root.uid)} />
            {th.replies.map(r => <MessageBubble key={r.id} n={r} me={me} isNew={isNew(r.at, r.uid)} />)}
            {!framed ? (
              <XStack role="button" onPress={() => compose(th.root.id)} hitSlop={8} px={14} height={40} items="center" self="flex-start" pressStyle={{ opacity: 0.6 }}>
                <T v="label" color="$accent11">Reply</T>
              </XStack>
            ) : null}
          </YStack>
        </>
      );
    }
    const x = item.x;
    const codes = M.entryCodes(x);
    const cat = codes.includes("FL") ? "danger" : codes[0] ? V.ctx.reg.CAT[codes[0]] || null : null;
    const by = whoBy(x, V);
    const key = x.sid + x.id;
    const newFlag = isNew(x.markedAt, x.by);
    return (
      <>
        {heading}
        <XStack
          role="button"
          aria-label={`${M.hhmm(x.slotStart)}: ${M.entryLine(x, V.ctx, true)}${by ? `, by ${by}` : ""}. Tap to see the clinical code`}
          onPress={() => reveal(key)}
          mx={16}
          my={3}
          px={14}
          py={12}
          gap={12}
          rounded={18}
          bg={newFlag ? "$accent2" : "transparent"}
          items="flex-start"
          pressStyle={{ bg: "$color3" }}
        >
          <T v="small" fontSize={13} width={M.clock.h12 ? 64 : 46} pt={1} numberOfLines={1}>{M.hhmm(x.slotStart)}</T>
          <Theme name={codes.length ? catTheme(cat) : "amber"}>
            <YStack width={10} height={10} rounded={5} bg="$color9" mt={5} />
          </Theme>
          <YStack flex={1} gap={6}>
            {codes.length || (x.pain && x.pain !== "—") ? (
              <T weight={newFlag ? "heavy" : "semibold"} fontSize={16} lineHeight={21}>{M.codesLine(x, V.ctx, true)}</T>
            ) : null}
            {x.note ? <NoteCard text={x.note} /> : null}
            {by ? <T v="small" fontSize={13}>{by}</T> : null}
            {revealed[key] && codes.length ? (
              <T v="small" fontSize={13} mt={3} transition="quick" enterStyle={{ opacity: 0 }}>
                {`Code${codes.length > 1 ? "s" : ""} ${codes.map(c => M.codeLabel(c, V.ctx)).join(", ")} · ${codes.map(c => M.codeText(c, V.ctx, false)).join("; ")}`}
              </T>
            ) : null}
          </YStack>
        </XStack>
      </>
    );
  };

  const header = (
    <YStack gap={14} px={16} pt={6} pb={8}>
      <AlertBanner V={V} framed={framed} />
      <NowCard V={V} />
      {newCount > 0 ? (
        <XStack self="flex-start" bg="$accent3" px={14} py={6} rounded={999} transition="bouncy" enterStyle={{ scale: 0.9, opacity: 0 }}>
          <T v="small" weight="black" color="$accent11">{`${newCount} new since you last looked`}</T>
        </XStack>
      ) : null}
    </YStack>
  );

  return (
    <Screen>
      <YStack flex={1} width="100%" maxW={isTablet ? 680 : undefined} self="center">
        <FlatList
          style={{ flex: 1 }}
          data={items}
          keyExtractor={it => ("x" in it ? `x:${it.x.sid}${it.x.id}` : `t:${it.t.root.id}`)}
          extraData={[revealed, newCount]}
          renderItem={renderItem}
          ListHeaderComponent={header}
          ListEmptyComponent={<T v="small" px={20} py={14}>Nothing recorded yet.</T>}
          contentContainerStyle={{ paddingBottom: framed ? 24 : 120 }}
        />
      </YStack>
      {framed ? null : <Fab label="Write a message" actions={[{ label: "Write a message", icon: MessagesSquare, onPress: () => compose(null), tone: "primary" }]} />}
    </Screen>
  );
}
