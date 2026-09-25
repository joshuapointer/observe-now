import { useRouter } from "expo-router";
import { Linking, StyleSheet, Text, View } from "react-native";

import { FALL_QUESTIONS } from "@/lib/codes";
import * as M from "@/lib/model";
import { fallAnswer, fileFall, setFallNarrative } from "@/state/actions";
import { useApp } from "@/state/app";
import { notAsked, useView } from "@/state/view";
import { RAIL_WIDTH, useLayout } from "@/ui/layout";
import { Button, Empty, Field, KeyboardArea, Row, Screen, Scroll, Seg, T } from "@/ui/primitives";
import { useTheme } from "@/ui/theme";

export function FallScreen() {
  const t = useTheme();
  const router = useRouter();
  const { isTablet } = useLayout();
  const V = useView();
  const draftNarr = useApp(s => s.drafts.fallNarr);
  const onCallPhone = useApp(s => s.patient?.onCallPhone);
  const fall = V.day?.fall;
  const name = V.ctx.name;
  const hair = t.colorful ? StyleSheet.hairlineWidth * 2 : 2;

  if (!fall) {
    const goRecord = () => (router.canGoBack() ? router.back() : router.replace("/record"));
    return (
      <Screen>
        <Scroll contentContainerStyle={{ flexGrow: 1, padding: 24, gap: 16 }}>
          <Empty title="No fall recorded today">
            <T v="lede">
              If {name} falls, go to <Text style={t.font("black")}>Record</Text> and tap <Text style={t.font("black")}>A fall</Text>. Family are told straight away, and you finish the report on this page.
            </T>
            <Button title="Go to Record" kind="primary" onPress={goRecord} />
          </Empty>
          <T v="small" style={{ paddingHorizontal: 24 }}>Nothing has been sent.</T>
        </Scroll>
      </Screen>
    );
  }

  const answers = fall.answers || {};
  const narr = draftNarr ?? fall.narrative ?? "";
  const al = V.alerts.find(a => a.kind === "fall" || a.kind === "fall-note");

  const dangerBanner = (
    <View style={[styles.fallbar, { backgroundColor: t.c.danger, flexDirection: isTablet ? "row" : "column" }]}>
      <View style={{ gap: 4 }}>
        <T v="eyebrow" color={t.c.onDanger}>Fall recorded at {M.hhmm(fall.at)}</T>
        <T v="big" color={t.c.onDanger}>Fall or found on the floor</T>
      </View>
      <T v="small" color={t.c.onDanger} style={{ maxWidth: isTablet ? 300 : undefined }}>
        Family have been told. Please finish this report now — it becomes the official record.
      </T>
    </View>
  );

  const mainContent = (
    <View style={{ gap: 20, padding: isTablet ? 24 : 16 }}>
      <View style={{ gap: 16 }}>
        {FALL_QUESTIONS.map(([label, opts]) => (
          <View key={label} style={{ gap: 6 }}>
            <T v="eyebrow">{label}</T>
            <Row wrap gap={4}>
              {opts.map(o => (
                <Seg key={o} title={notAsked(o)} on={answers[label] === o} onPress={() => fallAnswer(label, o)} />
              ))}
            </Row>
          </View>
        ))}
      </View>

      <View style={{ gap: 6 }}>
        <T v="eyebrow">What happened, in your own words</T>
        <Field
          multiline
          minHeight={120}
          value={narr}
          onChangeText={setFallNarrative}
          placeholder={`Where you found ${name}, what was said, and what you did.`}
        />
      </View>

      <View style={{ gap: 10 }}>
        <Button
          title={fall.filedAt ? `Report sent ${M.hhmm(fall.filedAt)}` : "Send fall report to family"}
          kind="primary"
          disabled={!!fall.filedAt}
          onPress={fileFall}
        />
        {onCallPhone ? (
          <Button title="Call the on-call nurse" onPress={() => Linking.openURL(`tel:${onCallPhone.replace(/[^\d+]/g, "")}`)} />
        ) : (
          <View style={{ gap: 4 }}>
            <Button title="Call the on-call nurse" disabled onPress={() => {}} />
            <T v="small">Add onCallPhone to the patient record</T>
          </View>
        )}
        <Button title="Back to Record" onPress={() => router.back()} />
        <T v="small">Saved automatically as you type</T>
      </View>
    </View>
  );

  const rail = (
    <View style={{ gap: 12, padding: 16 }}>
      <T v="eyebrow">Family told at {M.hhmm(al?.at ?? fall.at)}</T>
      <View style={{ backgroundColor: t.c.danger, borderRadius: t.r.lg, padding: 14, gap: 6 }}>
        <T v="eyebrow" color={t.c.onChromeAlert}>Urgent · {name}</T>
        <T v="big" color="#fff">{al?.text || ""}</T>
        <T v="small" color={t.c.onChromeDim}>
          {fall.filedAt ? "The full report has been sent to family." : "A full report will follow once you send it."}
        </T>
      </View>
      <View>
        {V.family.map(m => {
          const a = al?.acks?.[m.id];
          return (
            <View key={m.id} style={[styles.ackRow, { borderBottomColor: t.c.line }]}>
              <T v="label">{m.name}{m.relation ? ` · ${m.relation}` : ""}</T>
              <T v="small">{a ? `Seen ${M.hhmm(a.at)}` : "Not seen yet"}</T>
            </View>
          );
        })}
      </View>
    </View>
  );

  return (
    <Screen>
      <KeyboardArea>
        {isTablet ? (
          <View style={{ flex: 1 }}>
            {dangerBanner}
            <View style={{ flex: 1, flexDirection: "row" }}>
              <Scroll style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>{mainContent}</Scroll>
              <View style={{ width: RAIL_WIDTH, borderLeftWidth: hair, borderLeftColor: t.c.faint, backgroundColor: t.c.panel }}>
                <Scroll contentContainerStyle={{ flexGrow: 1 }}>{rail}</Scroll>
              </View>
            </View>
          </View>
        ) : (
          <Scroll contentContainerStyle={{ paddingBottom: 24 }}>
            {dangerBanner}
            {mainContent}
            <View style={{ borderTopWidth: hair, borderTopColor: t.c.faint, backgroundColor: t.c.panel }}>{rail}</View>
          </Scroll>
        )}
      </KeyboardArea>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fallbar: { padding: 16, paddingHorizontal: 24, justifyContent: "space-between", gap: 12, alignItems: "flex-start" },
  ackRow: { flexDirection: "row", justifyContent: "space-between", gap: 8, paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth },
});
