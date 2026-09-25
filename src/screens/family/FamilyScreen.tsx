// Family's whole app (also shown to caregivers as a read-only "framed" preview).
// Port of the PWA's familyView + the preview wrapper + familyRules (views.js).
import { useEffect, useMemo, useRef } from "react";
import { FlatList, Pressable, StyleSheet, View, type TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import * as M from "@/lib/model";
import type { Entry, Message } from "@/lib/types";
import { ackAlert, replyTo as setReplyTo, reveal, sendFamilyNote, setDraft } from "@/state/actions";
import { useApp } from "@/state/app";
import { fromCaregiver, msgWho, nowDetail, nowText, useView, whoBy, type Thread } from "@/state/view";
import { useLayout } from "@/ui/layout";
import { Button, Card, Field, KeyboardArea, Screen, T } from "@/ui/primitives";
import { useTheme } from "@/ui/theme";

type FeedItem = { at: number; x: Entry } | { at: number; t: Thread };

const FAMILY_RULES: [string, string][] = [
  ["Plain words, not codes", "Family read everyday sentences. Tapping a line shows the clinical code that was recorded."],
  ["Red alerts are rare", "Only a fall, grabbing or pushing, or pain of 7 or more sends a red alert. Everything else waits quietly in the list."],
  ["Replies come to the iPad", "A message from family appears on the right-hand side of the Record screen. It doesn't ring or interrupt."],
];

function RulesSection() {
  return (
    <View style={styles.rules}>
      <T v="eyebrow">Good to know</T>
      {FAMILY_RULES.map(([title, body]) => (
        <Card key={title}>
          <T v="label">{title}</T>
          <T v="small" style={{ marginTop: 4 }}>{body}</T>
        </Card>
      ))}
    </View>
  );
}

function MessageBubble({ n, me, isNew, reply }: { n: Message; me?: string; isNew: boolean; reply?: boolean }) {
  const t = useTheme();
  const mine = n.uid === me;
  return (
    <View style={[styles.msgcard, reply && styles.msgcardReply]}>
      <View style={styles.msgwhoRow}>
        <T v="small" weight="bold" color={mine ? t.c.accentInk : fromCaregiver(n) ? t.c.ink : t.cat("sleep").ink}>
          {(mine ? "You" : msgWho(n)) + (isNew ? " · new" : "")}
        </T>
        <T v="small" color={t.c.mute}>{M.hhmm(n.at)}</T>
      </View>
      <T style={{ marginTop: 2 }}>{n.text}</T>
    </View>
  );
}

// framed = the caregiver's preview of the family screen (no sending, no acks).
export function FamilyScreen({ framed = false }: { framed?: boolean }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { isTablet } = useLayout();
  const V = useView();
  const me = useApp(s => s.user?.uid);
  const lastVisit = useApp(s => s.lastVisit);
  const revealed = useApp(s => s.revealed);
  const replyToId = useApp(s => s.replyTo);
  const draft = useApp(s => s.drafts.familyNote || "");
  // Choosing "Reply" puts the cursor straight in the message box, as the PWA does.
  const input = useRef<TextInput>(null);
  useEffect(() => { if (replyToId && !framed) input.current?.focus(); }, [replyToId, framed]);

  const noteAllowed = !framed;
  const e = V.latest;
  const primary = M.entryCodes(e)[0];
  const cat = t.cat(primary ? V.ctx.reg.CAT[primary] : undefined);
  const al = V.alerts[0] || null;
  const recent = !!al && V.now - al.at < 12 * 3600e3;
  const who = e ? whoBy(e, V) : "";

  const items = useMemo<FeedItem[]>(() => {
    const entries: FeedItem[] = [...V.D.entries, ...V.PD.entries]
      .filter(x => M.entryCodes(x).length || x.note)
      .map(x => ({ at: x.markedAt, x }));
    const threads: FeedItem[] = V.threads.map(th => ({ at: th.root.at, t: th }));
    return [...entries, ...threads].sort((a, b) => b.at - a.at).slice(0, 40);
  }, [V.D.entries, V.PD.entries, V.threads]);

  const isNew = (at: number, by?: string) => !framed && !!lastVisit && at > lastVisit && by !== me;
  const newCount = items.reduce((n, it) => {
    if ("x" in it) return n + (isNew(it.x.markedAt, it.x.by) ? 1 : 0);
    return n + [it.t.root, ...it.t.replies].filter(m => isNew(m.at, m.uid)).length;
  }, 0);

  const replyToThread = (noteAllowed && replyToId && V.threads.find(th => th.root.id === replyToId)) || null;
  const replyText = replyToThread ? replyToThread.root.text || "" : "";

  const renderItem = ({ item }: { item: FeedItem }) => {
    if ("t" in item) {
      const th = item.t;
      const isReplying = replyToThread?.root.id === th.root.id;
      return (
        <View
          style={[
            styles.thread,
            { backgroundColor: t.cat("sleep").bg },
            isReplying && { borderWidth: 2, borderColor: t.cat("sleep").a },
          ]}
        >
          <T v="eyebrow" color={t.cat("sleep").ink}>Message</T>
          <MessageBubble n={th.root} me={me} isNew={isNew(th.root.at, th.root.uid)} />
          {th.replies.length ? (
            <View style={[styles.replies, { borderLeftColor: t.cat("sleep").a }]}>
              {th.replies.map(r => <MessageBubble key={r.id} n={r} me={me} isNew={isNew(r.at, r.uid)} reply />)}
            </View>
          ) : null}
          {noteAllowed ? (
            <Pressable accessibilityRole="button" onPress={() => setReplyTo(th.root.id)} hitSlop={8} style={styles.replyLink}>
              <T v="label" color={t.c.accentInk}>
                {th.replies.length ? "Reply" : `Reply to ${th.root.uid === me ? "your message" : th.root.who}`}
              </T>
            </Pressable>
          ) : null}
        </View>
      );
    }
    const x = item.x;
    const codes = M.entryCodes(x);
    const by = whoBy(x, V);
    const key = x.sid + x.id;
    const newFlag = isNew(x.markedAt, x.by);
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${M.hhmm(x.markedAt)}: ${M.entryLine(x, V.ctx, true)}`}
        onPress={() => reveal(key)}
        style={({ pressed }) => [
          styles.feedline,
          { backgroundColor: t.c.panel, borderLeftWidth: newFlag ? 3 : 0, borderLeftColor: t.c.accent },
          pressed && { opacity: 0.85 },
        ]}
      >
        <T v="small" color={t.c.mute} numberOfLines={1} style={{ width: M.clock.h12 ? 64 : 46 }}>{M.hhmm(x.markedAt)}</T>
        <View style={{ flex: 1 }}>
          <T weight={newFlag ? "bold" : undefined}>{M.entryLine(x, V.ctx, true)}</T>
          {by ? <T v="small" color={t.c.mute}>{by}</T> : null}
          {revealed[key] && codes.length ? (
            <T v="small" color={t.c.mute} style={{ marginTop: 3 }}>
              {`Clinical code${codes.length > 1 ? "s" : ""} ${codes.map(c => M.codeLabel(c, V.ctx)).join(", ")} · ${codes.map(c => M.codeText(c, V.ctx, false)).join("; ")}`}
            </T>
          ) : null}
        </View>
      </Pressable>
    );
  };

  const header = (
    <>
      {newCount > 0 ? (
        <View style={[styles.newcount, { backgroundColor: t.c.press, borderRadius: t.colorful ? t.r.pill : 0 }]}>
          <T v="small" weight="black" color={t.c.accentInk}>{`${newCount} new since you last looked`}</T>
        </View>
      ) : null}
      <T v="eyebrow" style={styles.sectionLabel}>Recent updates and messages</T>
    </>
  );

  const card = (
    <View
      style={[
        styles.card,
        { backgroundColor: t.c.ground, borderRadius: t.r.lg },
        framed ? t.shadowLg : t.shadow,
        framed && !t.colorful ? { borderWidth: 2, borderColor: t.c.edge } : null,
      ]}
    >
      <View style={[styles.head, { backgroundColor: cat.a, borderTopLeftRadius: t.r.lg, borderTopRightRadius: t.r.lg }]}>
        <T v="eyebrow" color="#fff">{`${V.ctx.name} · right now`}</T>
        <T v="big" color="#fff" style={{ marginTop: 6 }} accessibilityLiveRegion="polite">{nowText(e, V, true)}</T>
        {nowDetail(e) ? <T color="rgba(255,255,255,0.92)" style={{ marginTop: 6 }}>{nowDetail(e)}</T> : null}
        <View style={styles.metaRow}>
          <T v="small" color="#fff" style={{ flex: 1 }}>{e ? `Updated ${M.agoText(e.markedAt)}${who ? " by " + who : ""}` : ""}</T>
          <T v="small" color="#fff">{`${V.ctx.caregiver} is with ${V.ctx.pronouns.him}`}</T>
        </View>
      </View>
      {recent && al ? (
        <View accessibilityRole="alert" style={[styles.alert, { backgroundColor: t.c.danger }]}>
          <T v="eyebrow" color={t.c.onDanger}>{`Important · ${M.hhmm(al.at)}`}</T>
          <T v="label" color={t.c.onDanger}>{al.text}</T>
          {noteAllowed && !(me && al.acks?.[me]) ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => ackAlert(al.sid, al.id)}
              style={({ pressed }) => [styles.ackBtn, { borderColor: t.c.onDanger }, pressed && { opacity: 0.7 }]}
            >
              <T v="label" color={t.c.onDanger}>Got it</T>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <FlatList
        style={{ flex: 1 }}
        data={items}
        keyExtractor={it => ("x" in it ? `x:${it.x.sid}${it.x.id}` : `t:${it.t.root.id}`)}
        extraData={[revealed, replyToId, newCount]}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListFooterComponent={framed && !isTablet ? <RulesSection /> : null}
        ListEmptyComponent={<T v="small" color={t.c.mute} style={{ padding: 14 }}>Nothing recorded yet.</T>}
      />
      {replyToThread ? (
        <View style={[styles.replyingBar, { backgroundColor: t.cat("sleep").bg }]}>
          <T numberOfLines={1} style={{ flex: 1 }} color={t.cat("sleep").ink} weight="bold">
            {`Replying to ${replyToThread.root.uid === me ? "your message" : replyToThread.root.who}: "${replyText.slice(0, 60)}${replyText.length > 60 ? "…" : ""}"`}
          </T>
          <Pressable accessibilityRole="button" onPress={() => setReplyTo(null)} hitSlop={8}>
            <T v="label" color={t.c.accentInk}>Cancel</T>
          </Pressable>
        </View>
      ) : null}
      <View
        style={[
          styles.compose,
          {
            borderTopColor: t.colorful ? t.c.line : t.c.edge,
            borderTopWidth: t.colorful ? StyleSheet.hairlineWidth : 2,
            paddingBottom: 10 + (framed ? 0 : insets.bottom),
            opacity: noteAllowed ? 1 : 0.6,
          },
        ]}
      >
        <Field
          ref={input}
          style={{ flex: 1 }}
          value={draft}
          onChangeText={v => setDraft("familyNote", v)}
          placeholder={replyToThread ? "Write your reply…" : `Send ${V.ctx.caregiver} a message…`}
          editable={noteAllowed}
          accessibilityLabel={replyToThread ? "Reply" : "Message"}
          autoCapitalize="sentences"
          returnKeyType="send"
          onSubmitEditing={noteAllowed ? sendFamilyNote : undefined}
        />
        <Button title="Send" kind="primary" small disabled={!noteAllowed} onPress={sendFamilyNote} />
      </View>
    </View>
  );

  if (framed && isTablet) {
    return (
      <Screen>
        <KeyboardArea style={styles.framedTablet}>
          <View style={{ flex: 1, maxWidth: 480 }}>{card}</View>
          <View style={{ width: 320 }}><RulesSection /></View>
        </KeyboardArea>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardArea style={{ flex: 1, alignItems: "center", paddingHorizontal: insets.left || insets.right ? 0 : 0 }}>
        <View style={{ flex: 1, width: "100%", maxWidth: isTablet ? 640 : undefined, padding: framed ? 16 : 0 }}>{card}</View>
      </KeyboardArea>
    </Screen>
  );
}

const styles = StyleSheet.create({
  framedTablet: { flex: 1, flexDirection: "row", gap: 24, padding: 20 },
  card: { flex: 1, overflow: "hidden" },
  head: { padding: 18 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 10 },
  alert: { padding: 14, gap: 3 },
  ackBtn: { alignSelf: "flex-start", marginTop: 6, borderWidth: 2, paddingHorizontal: 14, paddingVertical: 8, minHeight: 40, justifyContent: "center" },
  newcount: { marginHorizontal: 14, marginTop: 10, paddingHorizontal: 14, paddingVertical: 6, alignSelf: "flex-start" },
  sectionLabel: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 },
  feedline: { flexDirection: "row", gap: 10, marginHorizontal: 12, marginVertical: 6, padding: 14, borderRadius: 14 },
  thread: { marginHorizontal: 12, marginVertical: 6, padding: 12, borderRadius: 16, gap: 2 },
  replies: { marginLeft: 18, marginTop: 4, paddingLeft: 12, borderLeftWidth: 2, gap: 6 },
  msgcard: { paddingVertical: 4 },
  msgcardReply: { paddingVertical: 3 },
  msgwhoRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  replyLink: { paddingVertical: 8, minHeight: 40, justifyContent: "center" },
  replyingBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 8 },
  compose: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingTop: 10 },
  rules: { gap: 12, padding: 14 },
});
