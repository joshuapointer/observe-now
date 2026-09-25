// The right rail on tablets (and the lower part of the phone scroll): what family see now, what's been
// recorded, and a peek at the messages.
import { router } from "expo-router";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import * as M from "@/lib/model";
import type { Ctx, Entry } from "@/lib/types";
import { editEntry } from "@/state/actions";
import { fromCaregiver, nowDetail, whoBy, type View as ViewModel } from "@/state/view";
import { LiveDot, Seg, T } from "@/ui/primitives";
import type { Theme } from "@/ui/theme";
import { onFill } from "./Codes";

export function RailNow({ V, t, tablet }: { V: ViewModel; t: Theme; tablet: boolean }) {
  const e = V.latest, { ctx, plain } = V, codes = M.entryCodes(e), primary = codes[0];
  const cat = primary ? ctx.reg.CAT[primary] || null : null, k = t.cat(cat), fg = onFill(t, cat);
  const big = codes.length
    ? plain
      ? codes.map(c => M.codeText(c, ctx)).join(", ")
      : codes.map(c => `${M.codeLabel(c, ctx)} — ${M.codeText(c, ctx, false).split(" — ")[0]}`).join("; ")
    : "Nothing recorded yet";
  const who = whoBy(e, V);
  const meta = e ? [plain ? "" : `Code ${codes.map(c => M.codeLabel(c, ctx)).join(", ")}`, e.place ? "Where: " + e.place : ""].filter(Boolean).join(" · ") || "—" : "—";
  return (
    <View style={{ gap: 8 }}>
      <View style={styles.nowHead}>
        <LiveDot />
        <T v="eyebrow" color={t.c.ink}>What family see right now</T>
      </View>
      <View accessibilityLiveRegion="polite" style={[styles.now, { backgroundColor: k.a, borderRadius: t.r.lg }, t.colorful && t.shadowLg]}>
        <Text maxFontSizeMultiplier={1.4} style={[t.font("black"), { color: fg, fontSize: tablet ? 30 : 26, lineHeight: tablet ? 35 : 31 }]}>{big}</Text>
        {nowDetail(e) ? <Text maxFontSizeMultiplier={1.4} style={[t.font("semibold"), { color: fg, opacity: 0.92, fontSize: 15, lineHeight: 20 }]}>{nowDetail(e)}</Text> : null}
        <View style={[styles.hr, { backgroundColor: fg, opacity: 0.35 }]} />
        <View style={styles.meta}>
          <Text maxFontSizeMultiplier={1.3} style={[t.font("heavy"), { color: fg, fontSize: 13, flexShrink: 1 }]}>{meta}</Text>
          {e ? <Text maxFontSizeMultiplier={1.3} style={[t.font("heavy"), { color: fg, fontSize: 13, flexShrink: 1, textAlign: "right" }]}>{`Recorded ${M.agoText(e.markedAt, V.now)}${who ? " by " + who : ""}`}</Text> : null}
        </View>
      </View>
      <View style={styles.chips}>
        {V.live.length ? V.live.map(m => (
          <View key={m.id} style={[styles.chip, { backgroundColor: t.c.accent, borderRadius: t.colorful ? 999 : 0 }]}>
            <Text maxFontSizeMultiplier={1.3} style={[t.font("bold"), { color: t.c.onAccent, fontSize: 13 }]}>{m.name}{m.relation ? " · " + m.relation : ""}</Text>
          </View>
        )) : <T v="small">No family are watching at the moment</T>}
      </View>
    </View>
  );
}

type RowProps = { e: Entry; ctx: Ctx; plain: boolean; who: string; editable: boolean; t: Theme };

const FeedRow = memo(function FeedRow({ e, ctx, plain, who, editable, t }: RowProps) {
  const codes = M.entryCodes(e), fall = codes.includes("FL");
  return (
    <View style={[styles.feedRow, { backgroundColor: fall ? t.c.fallBg : t.c.panel, borderRadius: t.colorful ? 14 : 0 }, !t.colorful && { borderTopWidth: 1, borderTopColor: t.c.line }]}>
      <Text maxFontSizeMultiplier={1.3} style={[t.font("heavy"), styles.feedTime, { color: t.c.ink }]}>{M.hhmm(e.markedAt)}</Text>
      <View style={{ flex: 1, gap: 2 }}>
        {plain ? null : <Text maxFontSizeMultiplier={1.3} style={[t.font("black"), { color: fall ? t.c.dangerInk : t.c.ink, fontSize: 14 }]}>{codes.map(c => M.codeLabel(c, ctx)).join(", ")}</Text>}
        <Text maxFontSizeMultiplier={1.4} style={[t.font("semibold"), { color: t.c.ink, fontSize: 15, lineHeight: 20 }]}>{M.entryLine(e, ctx, plain)}</Text>
        {who ? <Text maxFontSizeMultiplier={1.3} style={[t.font("semibold"), { color: t.c.mute, fontSize: 13 }]}>{who}</Text> : null}
      </View>
      {editable ? (
        <Seg small title="Edit" hitSlop={6} accessibilityLabel={`Change or remove the ${M.hhmm(e.slotStart)} entry`} onPress={() => editEntry(e.sid, e.id)} />
      ) : null}
    </View>
  );
});

export function RailFeed({ V, t, canEditEntry }: { V: ViewModel; t: Theme; canEditEntry: (e: Entry) => boolean }) {
  return (
    <View style={{ gap: 6 }}>
      <T v="eyebrow" style={{ paddingVertical: 4 }}>{"What's been recorded"}</T>
      {V.feed.length ? V.feed.map(e => (
        <FeedRow key={`${e.sid}/${e.id}`} e={e} ctx={V.ctx} plain={V.plain} who={whoBy(e, V)} editable={canEditEntry(e)} t={t} />
      )) : <T v="small">Nothing yet. Your entries will show up here.</T>}
    </View>
  );
}

export function MessagesPreview({ V, t }: { V: ViewModel; t: Theme }) {
  const notes = V.messages.slice(0, 3), unread = V.unreadMsgs;
  return (
    <View
      style={[
        styles.msgs,
        { backgroundColor: t.c.panel, borderRadius: t.r.md },
        unread ? { borderWidth: 2, borderColor: t.c.danger } : { borderWidth: t.border, borderColor: t.c.edge },
      ]}
    >
      <View style={styles.msgHead}>
        <T v="eyebrow">Messages</T>
        <Seg small hitSlop={6} title={unread ? `${unread} new` : V.messages.length ? "Open messages" : "Write to family"} onPress={() => router.push("/messages")} />
      </View>
      {notes.length ? notes.map(n => {
        const mine = fromCaregiver(n), isNew = !mine && V.unreadIds.has(n.id);
        return (
          <Text key={n.id} maxFontSizeMultiplier={1.4} style={[t.font(isNew ? "heavy" : "semibold"), { color: isNew ? t.c.dangerInk : t.c.ink, fontSize: 15, lineHeight: 21 }]}>
            <Text style={t.font("heavy")}>{mine ? `${n.who} (you)` : n.who}:</Text> {n.text}
          </Text>
        );
      }) : <T v="small">No messages yet.</T>}
    </View>
  );
}

const styles = StyleSheet.create({
  nowHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  now: { paddingHorizontal: 18, paddingVertical: 16, gap: 8 },
  hr: { height: 1 },
  meta: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6 },
  feedRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  feedTime: { fontSize: 14, minWidth: 48, paddingTop: 1 },
  msgs: { padding: 14, gap: 6 },
  msgHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
});
