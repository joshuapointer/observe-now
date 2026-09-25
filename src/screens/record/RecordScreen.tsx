// Record: the caregiver's main screen, used every 15 minutes. Pick what's happening (Step 1), then save it
// into the current box — or a missed one (Step 2). Tablets add the rail showing what family see.
import { router } from "expo-router";
import { useCallback, useRef, useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import * as M from "@/lib/model";
import type { Entry } from "@/lib/types";
import { backfillNext } from "@/state/actions";
import { useApp } from "@/state/app";
import { canEdit, useView, type View as ViewModel } from "@/state/view";
import { RAIL_WIDTH, useLayout } from "@/ui/layout";
import { Button, KeyboardArea, Screen } from "@/ui/primitives";
import { useTheme, type Theme } from "@/ui/theme";
import { Coach, Recents, Sections } from "./Codes";
import { Pending } from "./Pending";
import { MessagesPreview, RailFeed, RailNow } from "./Rail";
import { Strip } from "./Strip";

function AlertBar({ t, text, bold, children }: { t: Theme; text: string; bold?: boolean; children: ReactNode }) {
  return (
    <View style={[styles.bar, { backgroundColor: t.c.fallBg, borderColor: t.colorful ? t.c.danger : t.c.dangerInk, borderRadius: t.r.md, borderWidth: t.colorful ? 1.5 : 2 }]}>
      <Text maxFontSizeMultiplier={1.4} style={[t.font(bold ? "black" : "bold"), { color: bold ? t.c.dangerInk : t.c.ink, fontSize: 16, lineHeight: 21, flexGrow: 1, flexShrink: 1, minWidth: 180 }]}>{text}</Text>
      {children}
    </View>
  );
}

function Bars({ V, t, canLog }: { V: ViewModel; t: Theme; canLog: boolean }) {
  if (!canLog) return null;
  const f = V.day?.fall;
  return (
    <>
      {f && !f.filedAt ? (
        <AlertBar t={t} bold text={`The fall report from ${M.hhmm(f.at)} hasn't been sent yet.`}>
          <Button kind="danger" title="Finish the fall report" onPress={() => router.push("/fall")} />
        </AlertBar>
      ) : null}
      {V.missed.length ? (
        <AlertBar t={t} text={`${V.missed.length === 1 ? "1 box was left empty" : V.missed.length + " boxes were left empty"}: ${V.missedTimes.slice(0, 4).join(", ")}${V.missedTimes.length > 4 ? "…" : ""}`}>
          <Button title={`Fill in ${V.missedTimes[0] || ""}`} onPress={backfillNext} />
        </AlertBar>
      ) : null}
    </>
  );
}

export function RecordScreen() {
  const t = useTheme(), V = useView(), S = useApp();
  const { width, height, isTablet } = useLayout();
  const insets = useSafeAreaInsets();
  const canLog = V.isToday;
  const selected = S.pendingCodes;
  const when = M.hhmm(V.info.start + V.targetIdx * M.SLOT_MS);
  const saved = V.d.byKey[V.key] || null;
  const savedEditable = canEdit(S, V, saved) && M.entryCodes(saved).length ? saved : null;
  const canEditEntry = useCallback((e: Entry) => canEdit(S, V, e), [S, V]);

  // KeyboardAvoidingView measures itself relative to its parent, so tell it where the screen starts.
  const wrap = useRef<View>(null);
  const [kbOffset, setKbOffset] = useState(0);
  const measure = () => wrap.current?.measureInWindow((_x, y) => setKbOffset(y));

  const side = { paddingLeft: insets.left, paddingRight: insets.right };
  const pad = isTablet ? 20 : 16;
  const colWidth = (isTablet ? width - RAIL_WIDTH : width) - insets.left - insets.right;
  const innerWidth = colWidth - pad * 2;

  const step1 = (
    <>
      {canLog && !selected.length ? <Coach V={V} t={t} target={!!S.target} when={when} saved={savedEditable} /> : null}
      {canLog && V.recents.length ? <Recents V={V} selected={selected} /> : null}
      <Sections V={V} t={t} selected={selected} open={S.openSection} canLog={canLog} width={innerWidth} minTile={isTablet ? 150 : 118} />
    </>
  );
  const strip = <Strip V={V} target={S.target} collapsed={S.stripCollapsed} grid={isTablet} width={innerWidth} t={t} />;
  const pending = selected.length ? (
    <Pending
      V={V} t={t} selected={selected} when={when} place={S.place} pain={S.pain} note={S.drafts.note || ""} details={S.details}
      tablet={isTablet} maxDetailsHeight={isTablet ? height * 0.45 : height * 0.4}
    />
  ) : null;

  if (isTablet) {
    return (
      <Screen>
        <View ref={wrap} onLayout={measure} style={[styles.fill, side]}>
          <KeyboardArea offset={kbOffset}>
            <View style={styles.row}>
              <View style={styles.fill}>
                {canLog && (V.missed.length || (V.day?.fall && !V.day.fall.filedAt)) ? (
                  <View style={[styles.bars, { paddingHorizontal: pad }]}><Bars V={V} t={t} canLog={canLog} /></View>
                ) : null}
                {strip}
                <ScrollView style={styles.fill} contentContainerStyle={[styles.codes, { padding: pad }]} keyboardShouldPersistTaps="handled">
                  {step1}
                </ScrollView>
                {pending}
              </View>
              <View style={[styles.rail, { width: RAIL_WIDTH, borderLeftColor: t.colorful ? t.c.line : t.c.edge, borderLeftWidth: t.colorful ? 1 : 2, backgroundColor: t.c.ground }]}>
                <View style={[styles.railNow, { borderBottomColor: t.c.faint }]}><RailNow V={V} t={t} tablet /></View>
                <ScrollView style={styles.fill} contentContainerStyle={styles.railFeed}>
                  <RailFeed V={V} t={t} canEditEntry={canEditEntry} />
                </ScrollView>
                <View style={styles.railMsgs}><MessagesPreview V={V} t={t} /></View>
              </View>
            </View>
          </KeyboardArea>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View ref={wrap} onLayout={measure} style={[styles.fill, side]}>
        <KeyboardArea offset={kbOffset}>
          {strip}
          <ScrollView style={styles.fill} contentContainerStyle={[styles.codes, { padding: pad }]} keyboardShouldPersistTaps="handled">
            <Bars V={V} t={t} canLog={canLog} />
            {step1}
            <View style={[styles.phoneRail, { borderTopColor: t.colorful ? t.c.line : t.c.edge, borderTopWidth: t.colorful ? 1 : 2 }]}>
              <RailNow V={V} t={t} tablet={false} />
              <RailFeed V={V} t={t} canEditEntry={canEditEntry} />
              <MessagesPreview V={V} t={t} />
            </View>
          </ScrollView>
          {pending}
        </KeyboardArea>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, minHeight: 0 },
  row: { flex: 1, flexDirection: "row" },
  bars: { paddingTop: 12, gap: 10 },
  bar: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  codes: { gap: 14, paddingBottom: 24 },
  rail: { flexShrink: 0 },
  railNow: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 2 },
  railFeed: { paddingHorizontal: 12, paddingVertical: 10 },
  railMsgs: { padding: 12 },
  phoneRail: { marginTop: 12, paddingTop: 18, gap: 20 },
});
