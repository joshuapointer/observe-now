// Messages, for both sides: conversations on the left (or a full-width list on a phone), the open one on the
// right (or on top of the list, on a phone). Your side's messages sit on the right in blue.
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, type ScrollView } from "react-native";
import { XStack, YStack } from "tamagui";

import type { Message } from "@/lib/types";
import { markThreadRead, openThread, openThreadId, sendNew, sendReply, setDraft } from "@/state/actions";
import { actingAs, useApp } from "@/state/app";
import { setOnNotes } from "@/state/session";
import { fromCaregiver, msgWho, msgWhen, useView, type Thread, type View as ViewState } from "@/state/view";
import { ChatBubble } from "@/ui/ChatBubble";
import { ChevronLeft, Pencil, Send } from "@/ui/icons";
import { RAIL_WIDTH, useLayout } from "@/ui/layout";
import { Button, Empty, Field, KeyboardArea, Scroll, Screen, T } from "@/ui/primitives";

const unreadIn = (th: Thread, unreadIds: Set<string>) => [th.root, ...th.replies].filter(n => unreadIds.has(n.id)).length;

function ThreadRow({ th, V, selected, onPress }: { th: Thread; V: ViewState; selected: boolean; onPress: () => void }) {
  const lastMsg = th.replies[th.replies.length - 1] || th.root;
  const unread = unreadIn(th, V.unreadIds);
  return (
    <XStack
      role="button"
      aria-selected={selected}
      aria-label={`${msgWho(th.root)}. ${lastMsg.text}${unread ? `. ${unread} new` : ""}`}
      onPress={onPress}
      mx={12}
      my={4}
      p={14}
      gap={12}
      rounded={20}
      bg={selected ? "$accent3" : "$card"}
      items="center"
      pressStyle={{ scale: 0.985, bg: "$color3" }}
      transition="quick"
    >
      <YStack width={44} height={44} rounded={22} bg={fromCaregiver(th.root) ? "$accent4" : "$green4"} items="center" justify="center">
        <T weight="black" color={fromCaregiver(th.root) ? "$accent11" : "$green11"}>{(th.root.who || "?").slice(0, 1).toUpperCase()}</T>
      </YStack>
      <YStack flex={1} gap={2}>
        <XStack items="center" gap={8}>
          <T v="label" numberOfLines={1} flex={1}>{msgWho(th.root)}</T>
          <T v="small" fontSize={12}>{msgWhen(lastMsg, V)}</T>
        </XStack>
        <XStack items="center" gap={8}>
          <T numberOfLines={2} fontSize={15} lineHeight={20} flex={1} weight={unread ? "bold" : "regular"} color={unread ? "$color12" : "$color11"}>
            {th.replies.length ? `${lastMsg.who}: ${lastMsg.text}` : th.root.text}
          </T>
          {unread ? (
            <YStack minW={22} height={22} rounded={11} px={6} bg="$red9" items="center" justify="center">
              <T fontSize={12} lineHeight={15} weight="black" color="$white1">{unread}</T>
            </YStack>
          ) : null}
        </XStack>
      </YStack>
    </XStack>
  );
}

// Your side's messages sit on the right: the caregivers' in caregiver mode (whoever was on shift), family's in
// family mode. On the right the name is left off, as in iMessage; the other side's always say who.
function Bubble({ n, V, family }: { n: Message; V: ViewState; family: boolean }) {
  const mine = fromCaregiver(n) !== family;
  return <ChatBubble text={n.text} mine={mine} who={msgWho(n)} when={mine && fromCaregiver(n) ? `${n.who} · ${msgWhen(n, V)}` : msgWhen(n, V)} />;
}

export function MessagesScreen() {
  const { isTablet } = useLayout();
  const V = useView();
  const thread = useApp(s => s.thread);
  const draftReply = useApp(s => s.drafts.reply || "");
  const draftNew = useApp(s => s.drafts.newmsg || "");
  const family = useApp(s => actingAs(s)) === "family";
  const [phoneOpen, setPhoneOpen] = useState(thread === "new");
  const scrollRef = useRef<ScrollView>(null);

  // Keeps the open conversation selected (and read) whenever this screen has focus, and marks a reply read the
  // instant it arrives while the conversation is open. On a phone the conversation is only on screen once it's
  // been opened; the list alone must not mark anything read, or the badge would clear for messages nobody saw.
  const chatVisible = isTablet || phoneOpen;
  useFocusEffect(
    useCallback(() => {
      if (thread === "new" && !isTablet) setPhoneOpen(true);
      if (!chatVisible) return;
      if (thread !== "new") openThread(openThreadId());
      setOnNotes(() => markThreadRead(thread === "new" ? null : openThreadId()));
      return () => setOnNotes(null);
    }, [thread, chatVisible, isTablet]),
  );

  const sel = thread === "new" ? null : V.threads.find(x => x.root.id === thread) || V.threads[0] || null;

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: false });
  }, [sel?.root.id, sel?.replies.length]);

  const openItem = (id: string) => { openThread(id); if (!isTablet) setPhoneOpen(true); };
  const openNew = () => { openThread("new"); if (!isTablet) setPhoneOpen(true); };

  const showList = isTablet || !phoneOpen;
  const showChat = isTablet || phoneOpen;
  const send = sel ? sendReply : sendNew;
  const other = family ? V.ctx.caregiver : "family";
  const draft = sel ? draftReply : draftNew;

  return (
    <Screen flexDirection={isTablet ? "row" : "column"}>
      {showList ? (
        <YStack flex={isTablet ? undefined : 1} width={isTablet ? RAIL_WIDTH : undefined} borderRightWidth={isTablet ? 1 : 0} borderRightColor="$color4">
          <XStack px={16} pt={4} pb={8}>
            <Button kind="soft" icon={Pencil} title={`New message to ${other}`} onPress={openNew} grow />
          </XStack>
          <FlatList
            data={V.threads}
            keyExtractor={x => x.root.id}
            extraData={sel?.root.id}
            contentContainerStyle={{ paddingBottom: 16 }}
            renderItem={({ item }) => <ThreadRow th={item} V={V} selected={isTablet && sel === item} onPress={() => openItem(item.root.id)} />}
            ListEmptyComponent={<Empty title="No messages yet" body={`Start a conversation with ${other}. They can reply here.`} />}
          />
        </YStack>
      ) : null}
      {showChat ? (
        <KeyboardArea style={{ flex: 1 }}>
          <XStack items="center" gap={6} px={isTablet ? 16 : 6} py={6} borderBottomWidth={1} borderBottomColor="$color4">
            {!isTablet ? (
              <XStack role="button" aria-label="All messages" onPress={() => setPhoneOpen(false)} hitSlop={8} items="center" px={6} height={40} pressStyle={{ opacity: 0.6 }}>
                <ChevronLeft size={24} color="$accent11" />
                <T v="label" color="$accent11">All</T>
              </XStack>
            ) : null}
            <T v="label" numberOfLines={1} flex={1} center={!isTablet} pr={isTablet ? 0 : 50}>
              {sel ? msgWho(sel.root) : `New message to ${other}`}
            </T>
          </XStack>
          {sel ? (
            <Scroll ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1, justifyContent: "flex-end" }}>
              <Bubble n={sel.root} V={V} family={family} />
              {sel.replies.map(r => <Bubble key={r.id} n={r} V={V} family={family} />)}
            </Scroll>
          ) : (
            <YStack flex={1} p={24} justify="flex-end">
              <T color="$color11" center>
                {family
                  ? `${V.ctx.caregiver} sees this in the care app's Messages and can reply.`
                  : "Family see this in their updates and can reply."}
              </T>
            </YStack>
          )}
          <XStack items="flex-end" gap={8} px={12} pt={8} pb={10} borderTopWidth={1} borderTopColor="$color4">
            <YStack flex={1}>
              <Field
                value={draft}
                onChangeText={v => setDraft(sel ? "reply" : "newmsg", v)}
                placeholder={sel ? "Reply…" : `Write to ${other}…`}
                accessibilityLabel={sel ? "Reply" : "New message"}
                autoCapitalize="sentences"
                returnKeyType="send"
                onSubmitEditing={send}
                style={{ borderRadius: 24 }}
              />
            </YStack>
            <YStack
              role="button"
              aria-label="Send"
              onPress={send}
              width={50}
              height={50}
              rounded={25}
              bg={draft.trim() ? "$blue9" : "$color5"}
              items="center"
              justify="center"
              transition="quick"
              pressStyle={{ scale: 0.9 }}
            >
              <Send size={22} color="$white1" />
            </YStack>
          </XStack>
        </KeyboardArea>
      ) : null}
    </Screen>
  );
}
