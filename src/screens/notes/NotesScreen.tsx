import { StyleSheet, View } from "react-native";

import { PHRASES, type Med } from "@/lib/codes";
import * as M from "@/lib/model";
import { addPhrase, editMeds, giveMed, saveNote, setDraft } from "@/state/actions";
import { useApp } from "@/state/app";
import { useView } from "@/state/view";
import { useLayout } from "@/ui/layout";
import { Bar, Button, Empty, Field, KeyboardArea, Row, Screen, Scroll, Seg, T } from "@/ui/primitives";
import { useTheme, type Theme } from "@/ui/theme";

function MedRow({ med, now, given, ok }: { med: Med; now: number; given: Record<string, number | string | null>; ok: boolean }) {
  const t = useTheme();
  const g = given[med.name];
  const due = !g && !med.asNeeded && !!med.dueAt && M.hm24(now) >= med.dueAt;
  const gtxt = typeof g === "number" ? M.hhmm(g) : (g ?? "");
  const state = g ? `Given ${gtxt}` : due ? "Due now" : med.asNeeded ? "If needed" : "Not due yet";
  return (
    <View style={[styles.medRow, { borderBottomColor: t.c.line }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <T v="label">{med.name}</T>
        <T v="small">{med.dose} · {med.sched}</T>
      </View>
      <T v="small" color={due ? t.c.dangerInk : t.c.mute} style={{ width: 96, textAlign: "center" }}>{state}</T>
      <Button
        title={g ? "Given ✓" : "Give now"}
        kind={g ? "done" : "primary"}
        small
        disabled={!!g || !ok}
        onPress={() => giveMed(med.name)}
      />
    </View>
  );
}

function borderTop(t: Theme) {
  return { borderTopWidth: t.colorful ? StyleSheet.hairlineWidth * 2 : 2, borderTopColor: t.c.faint };
}

export function NotesScreen() {
  const t = useTheme();
  const { isTablet, width } = useLayout();
  const V = useView();
  const draft = useApp(s => s.drafts.noteScreen || "");
  const ok = V.isToday;
  const given = V.day?.meds || {};
  const cur = V.d.byKey[V.d.curKey];
  const medsWidth = Math.min(520, width / 2);

  const medsRows = V.meds.length ? (
    V.meds.map(m => <MedRow key={m.name} med={m} now={V.now} given={given} ok={ok} />)
  ) : (
    <Empty title="No medicines yet" body={`Add ${V.ctx.name}'s medicines and they'll show up here, ready to tick off when given.`}>
      <Button title="Add a medicine" kind="primary" onPress={editMeds} />
    </Empty>
  );

  const medsFooter = V.meds.length ? (
    <View style={[{ padding: 10, paddingHorizontal: 24 }, borderTop(t)]}>
      <Button title="Add or change medicines" onPress={editMeds} />
    </View>
  ) : null;

  const medsHint = (
    <View style={[{ padding: 12, paddingHorizontal: 24 }, borderTop(t)]}>
      <T v="small">Medicine refused or held back? Go to Record, tap “Not wanting help”, and write why in the note — family will see the reason, not just a gap.</T>
    </View>
  );

  const notePaneBody = (
    <View style={{ padding: 16, paddingHorizontal: 24, gap: 12 }}>
      <T v="lede">Tap a phrase to add it, or type your own.</T>
      <Row wrap gap={8}>
        {PHRASES.map(p => <Seg key={p} title={p} small onPress={() => addPhrase(p)} />)}
      </Row>
      <Field
        multiline
        minHeight={140}
        value={draft}
        onChangeText={text => setDraft("noteScreen", text)}
        placeholder="Write anything worth remembering…"
      />
      {cur?.note ? <T v="small">Already saved for this time: “{cur.note}”</T> : null}
      <Row wrap gap={8}>
        <Button title="Save note (family can see it)" kind="primary" grow disabled={!ok} onPress={() => saveNote(false)} />
        <Button title="Save note (family can't see it)" grow disabled={!ok} onPress={() => saveNote(true)} />
      </Row>
    </View>
  );

  const noteBarTitle = `Note for ${M.hhmm(V.info.start + V.d.cur * M.SLOT_MS)}`;

  return (
    <Screen>
      <KeyboardArea>
        {isTablet ? (
          <View style={{ flex: 1, flexDirection: "row" }}>
            <View style={{ width: medsWidth, borderRightWidth: t.colorful ? StyleSheet.hairlineWidth * 2 : 2, borderRightColor: t.c.faint }}>
              <Bar title="Medicines · press “Give now” when you've given one" />
              <Scroll contentContainerStyle={{ flexGrow: 1 }}>{medsRows}</Scroll>
              {medsFooter}
              {medsHint}
            </View>
            <View style={{ flex: 1 }}>
              <Bar title={noteBarTitle} />
              <Scroll contentContainerStyle={{ flexGrow: 1 }}>{notePaneBody}</Scroll>
            </View>
          </View>
        ) : (
          <Scroll contentContainerStyle={{ paddingBottom: 24 }}>
            <Bar title="Medicines · press “Give now” when you've given one" />
            <View>{medsRows}</View>
            {medsFooter}
            {medsHint}
            <Bar title={noteBarTitle} />
            {notePaneBody}
          </Scroll>
        )}
      </KeyboardArea>
    </Screen>
  );
}

const styles = StyleSheet.create({
  medRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 24, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth * 2 },
});
