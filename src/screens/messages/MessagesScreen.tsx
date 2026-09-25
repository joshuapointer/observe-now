// Caregiver chat: conversations on the left (or full-width list on phone), the open one on the right
// (or full-width, on top of the list, on phone). Port of the PWA's messagesView (views.js).
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, View, type ScrollView } from "react-native";

import * as M from "@/lib/model";
import type { Message } from "@/lib/types";
import { markThreadRead, openThread, openThreadId, sendNew, sendReply, setDraft } from "@/state/actions";
import { actingAs, useApp } from "@/state/app";
import { setOnNotes } from "@/state/session";
import { fromCaregiver, msgWho, msgWhen, useView, type Thread, type View as ViewState } from "@/state/view";
import { RAIL_WIDTH, useLayout } from "@/ui/layout";
import { ChatBubble } from "@/ui/ChatBubble";
import { Button, Field, KeyboardArea, Scroll, Screen, T } from "@/ui/primitives";
import { useTheme } from "@/ui/theme";

const unreadIn = (th: Thread, unreadIds: Set<string>) => [th.root, ...th.replies].filter(n => unreadIds.has(n.id)).length;

function ThreadRow({ th, V, selected, onPress }: { th: Thread; V: ViewState; selected: boolean; onPress: () => void }) {
  const t = useTheme();
  const lastMsg = th.replies[th.replies.length - 1] || th.root;
  const unread = unreadIn(th, V.unreadIds);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${msgWho(th.root)}. ${th.root.text}${unread ? `. ${unread} new` : ""}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.threadItem,
        { borderBottomColor: t.c.line, backgroundColor: selected ? t.c.press : "transparent" },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={styles.threadTop}>
        <T v="label" numberOfLines={1} style={{ flex: 1 }}>{msgWho(th.root)}</T>
        <T v="small" color={t.c.mute}>{msgWhen(lastMsg, V)}</T>
      </View>
      <T numberOfLines={2} weight={unread ? "bold" : undefined}>{th.root.text}</T>
      <View style={styles.threadFoot}>
        <T v="small" color={t.c.mute} style={{ flex: 1 }}>
          {th.replies.length ? `${th.replies.length} repl${th.replies.length === 1 ? "y" : "ies"} · last from ${lastMsg.who}` : "No replies yet"}
        </T>
        {unread ? (
          <View style={[styles.dot, { backgroundColor: t.c.danger, borderRadius: t.colorful ? t.r.pill : 0 }]}>
            <T v="small" weight="black" color={t.c.onDanger}>{`${unread} new`}</T>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

// Your side's messages sit on the right: the caregivers' in caregiver mode (whoever was on shift), family's in
// family mode. On the right the name is left off, as in iMessage; the other side's always say who.
function Bubble({ n, V, family }: { n: Message; V: ViewState; family: boolean }) {
  const mine = fromCaregiver(n) !== family;
  return <ChatBubble text={n.text} mine={mine} who={msgWho(n)} when={mine && fromCaregiver(n) ? `${n.who} · ${msgWhen(n, V)}` : msgWhen(n, V)} />;
}

export function MessagesScreen() {
  const t = useTheme();
  const { isTablet } = useLayout();
  const V = useView();
  const thread = useApp(s => s.thread);
  const draftReply = useApp(s => s.drafts.reply || "");
  const draftNew = useApp(s => s.drafts.newmsg || "");
  const onShiftName = M.firstName(V.onShift?.name);
  const family = useApp(s => actingAs(s)) === "family";
  const [phoneOpen, setPhoneOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Keeps the currently open conversation selected (and read) whenever this screen has focus, and marks a
  // reply as read the instant it arrives while the conversation is open — mirrors the PWA's tab(id) switch.
  // On a phone the conversation is only on screen once it's been opened; showing the list alone must not mark
  // anything read, or the unread badge would clear for messages nobody has seen.
  const chatVisible = isTablet || phoneOpen;
  useFocusEffect(
    useCallback(() => {
      if (!chatVisible) return;
      if (thread !== "new") openThread(openThreadId());
      setOnNotes(() => markThreadRead(thread === "new" ? null : openThreadId()));
      return () => setOnNotes(null);
    }, [thread, chatVisible]),
  );

  const sel = thread === "new" ? null : V.threads.find(x => x.root.id === thread) || V.threads[0] || null;

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: false });
  }, [sel?.root.id, sel?.replies.length]);

  const openItem = (id: string) => {
    openThread(id);
    if (!isTablet) setPhoneOpen(true);
  };
  const openNew = () => {
    openThread("new");
    if (!isTablet) setPhoneOpen(true);
  };
  const back = () => setPhoneOpen(false);

  const showList = isTablet || !phoneOpen;
  const showChat = isTablet || phoneOpen;
  const send = sel ? sendReply : sendNew;

  return (
    <Screen style={{ flexDirection: isTablet ? "row" : "column" }}>
      {showList ? (
        <View
          style={[
            styles.listCol,
            isTablet && { width: RAIL_WIDTH, borderRightWidth: t.colorful ? StyleSheet.hairlineWidth : 2, borderRightColor: t.colorful ? t.c.line : t.c.edge },
          ]}
        >
          <View style={[styles.listHead, { borderBottomColor: t.c.line }]}>
            <Button title="New message" kind="primary" onPress={openNew} />
          </View>
          <FlatList
            data={V.threads}
            keyExtractor={x => x.root.id}
            extraData={sel?.root.id}
            renderItem={({ item }) => <ThreadRow th={item} V={V} selected={sel === item} onPress={() => openItem(item.root.id)} />}
            ListEmptyComponent={<T v="small" color={t.c.mute} style={{ padding: 16 }}>No conversations yet.</T>}
          />
        </View>
      ) : null}
      {showChat ? (
        <KeyboardArea style={{ flex: 1 }}>
          {!isTablet ? (
            <Pressable accessibilityRole="button" accessibilityLabel="All messages" onPress={back} style={styles.backRow} hitSlop={8}>
              <Ionicons name="chevron-back" size={20} color={t.c.accentInk} />
              <T v="label" color={t.c.accentInk}>All messages</T>
            </Pressable>
          ) : null}
          <View style={[styles.bar, { backgroundColor: t.colorful ? t.c.panel : t.c.chrome }]}>
            <T v="label" color={t.colorful ? t.c.ink : t.c.onChrome} numberOfLines={1} style={{ flex: 1 }}>
              {sel ? `${sel.root.who} started this conversation · ${msgWhen(sel.root, V)}` : family ? `New message to ${V.ctx.caregiver}` : "New message to family"}
            </T>
          </View>
          {sel ? (
            <Scroll ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={styles.chatlog}>
              <Bubble n={sel.root} V={V} family={family} />
              {sel.replies.map(r => <Bubble key={r.id} n={r} V={V} family={family} />)}
            </Scroll>
          ) : (
            <View style={{ flex: 1, padding: 24 }}>
              <T color={t.c.mute}>
                {family
                  ? `Write something for ${V.ctx.caregiver}. It shows in the care app's Messages, and they can reply.`
                  : "Write something for family to read. They see it in their list of updates, and can reply."}
              </T>
            </View>
          )}
          <View style={[styles.composeRow, { borderTopColor: t.colorful ? t.c.line : t.c.edge, borderTopWidth: t.colorful ? StyleSheet.hairlineWidth : 2 }]}>
            <Field
              style={{ flex: 1 }}
              value={sel ? draftReply : draftNew}
              onChangeText={v => setDraft(sel ? "reply" : "newmsg", v)}
              placeholder={family ? (sel ? "Write your reply…" : `Write to ${V.ctx.caregiver}…`) : sel ? `Reply as ${onShiftName}…` : `Write to family as ${onShiftName}…`}
              accessibilityLabel={sel ? "Reply" : "New message"}
              autoCapitalize="sentences"
              returnKeyType="send"
              onSubmitEditing={send}
            />
            <Button title="Send" kind="primary" small onPress={send} />
          </View>
        </KeyboardArea>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  listCol: { flex: 1 },
  listHead: { padding: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  threadItem: { paddingHorizontal: 16, paddingVertical: 12, gap: 4, borderBottomWidth: StyleSheet.hairlineWidth },
  threadTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  threadFoot: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { paddingHorizontal: 8, paddingVertical: 1 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 4, padding: 12, alignSelf: "flex-start" },
  bar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10 },
  chatlog: { padding: 16, gap: 10, flexGrow: 1, justifyContent: "flex-end" },
  composeRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12 },
});
