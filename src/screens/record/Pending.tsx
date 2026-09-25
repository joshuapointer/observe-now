// Step 2: what's been chosen, optional details (where, pain, a note) and Save / Cancel.
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { PAINS, PLACES } from "@/lib/codes";
import * as M from "@/lib/model";
import { cancelPending, commit, setDraft, setPain, setPlace, toggleDetails, unpick } from "@/state/actions";
import { notAsked, type View as ViewModel } from "@/state/view";
import { Button, Field, Seg, T } from "@/ui/primitives";
import type { Theme } from "@/ui/theme";
import { onFill, StepBadge } from "./Codes";

type Props = {
  V: ViewModel; t: Theme; selected: string[]; when: string; place: string; pain: string; note: string; details: boolean;
  maxDetailsHeight?: number; tablet: boolean;
};

export function Pending({ V, t, selected, when, place, pain, note, details, maxDetailsHeight, tablet }: Props) {
  const { ctx, plain } = V;
  const cat = ctx.reg.CAT[selected[0]] || null, k = t.cat(cat);
  const kind = V.pendingAlertKind;
  // Show details for pain codes, or once anything is filled in.
  const open = details || selected.some(c => ["PN", "US"].includes(c)) || pain !== "—" || !!place || !!note;
  const whatText = selected.map(c => M.codeText(c, ctx, plain)).join(", ");

  return (
    <View
      style={[
        styles.panel,
        { backgroundColor: t.colorful ? k.bg : t.c.panel, borderTopColor: t.colorful ? k.cat : t.c.edge, borderTopWidth: t.colorful ? 3 : 2, paddingHorizontal: tablet ? 20 : 16 },
        t.colorful && { borderTopLeftRadius: t.r.lg, borderTopRightRadius: t.r.lg },
        t.shadowLg,
      ]}
    >
      <ScrollView style={{ flexShrink: 1, maxHeight: maxDetailsHeight }} contentContainerStyle={{ gap: 12 }} keyboardShouldPersistTaps="handled">
        <View style={styles.chipRow}>
          <StepBadge title="Step 2 of 2" t={t} />
          {selected.map(c => {
            const cc = ctx.reg.CAT[c] || null, kc = t.cat(cc);
            return (
              <Pressable
                key={c}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${M.codeText(c, ctx)}`}
                onPress={() => unpick(c)}
                hitSlop={6}
                style={({ pressed }) => [styles.chip, { backgroundColor: kc.b, borderRadius: t.colorful ? 14 : 0 }, pressed && { opacity: 0.7 }]}
              >
                <Text maxFontSizeMultiplier={1.4} style={[t.font("heavy"), { color: onFill(t, cc), fontSize: 15 }]}>
                  {M.codeLabel(c, ctx)}<Text style={t.font("black")}>{"  ×"}</Text>
                </Text>
              </Pressable>
            );
          })}
        </View>
        <T v="lede" weight="heavy">{whatText}</T>
        {kind ? (
          <T v="label" color={t.c.dangerInk} weight="black">This also sends a red alert to family.</T>
        ) : V.familyCount ? (
          <T v="small">Family will see this straight away.</T>
        ) : null}

        {open ? (
          <View style={{ gap: 12 }}>
            <View style={{ gap: 6 }}>
              <T v="eyebrow">{`Where is ${ctx.name}? (optional)`}</T>
              <View style={styles.wrap}>
                {PLACES.map(o => <Seg key={o} title={o} on={place === o} onPress={() => setPlace(o)} />)}
              </View>
            </View>
            <View style={{ gap: 6 }}>
              <T v="eyebrow">Pain level (optional)</T>
              <View style={styles.wrap}>
                {PAINS.map(o => <Seg key={o} title={notAsked(o)} wide={o === "—"} on={pain === o} onPress={() => setPain(o)} accessibilityLabel={o === "—" ? "Pain not asked" : `Pain ${o}`} />)}
              </View>
            </View>
            <View style={{ gap: 6 }}>
              <T v="eyebrow">Anything to add? (optional)</T>
              <Field
                value={note}
                onChangeText={v => setDraft("note", v)}
                placeholder="For example: asked the time twice, settled with the radio on"
                autoComplete="off"
                autoCorrect
                returnKeyType="done"
                accessibilityLabel="Anything to add? (optional)"
              />
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.wrap}>
        <Button kind="primary" big title={`Save ${when}`} onPress={commit} grow={!tablet} />
        {open ? null : <Button big title="Add details" sub="(where, pain, a note)" onPress={toggleDetails} grow={!tablet} />}
        <Button big title="Cancel" onPress={cancelPending} grow={!tablet} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { paddingTop: 14, paddingBottom: 14, gap: 12, flexShrink: 1 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  chip: { paddingHorizontal: 14, minHeight: 40, justifyContent: "center" },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
