// Port of the PWA's codesView (views.js ~378-403): the list of codes offered on the Record screen, and the
// add/change form. Reached from Settings → Codes → Edit.
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { activeCodes, SECTIONS, SYSTEM_CODES, type Code } from "@/lib/codes";
import * as M from "@/lib/model";
import type { Ctx } from "@/lib/types";
import { codeCancel, codeEdit, codeNew, codeRemove, codeRestore, codeSave } from "@/state/actions";
import type { CodeForm } from "@/state/app";
import { useApp } from "@/state/app";
import { useView } from "@/state/view";
import { useLayout } from "@/ui/layout";
import { Button, Chip, Field, Row, Scroll, Screen, Seg, T } from "@/ui/primitives";
import { useTheme } from "@/ui/theme";

function CodeRow({ c, ctx }: { c: Code; ctx: Ctx }) {
  const t = useTheme();
  const sys = SYSTEM_CODES[c.id];
  return (
    <View style={[styles.row, { borderBottomColor: t.c.line }]}>
      <Chip title={M.codeLabel(c.id, ctx)} cat={ctx.reg.CAT[c.id]} />
      <View style={{ flex: 1, gap: 2 }}>
        <T v="label">{M.codeText(c.id, ctx)}</T>
        <T v="small">
          {(c.long ? M.codeText(c.id, ctx, false) : "No long description") + (c.abbr ? "" : " · no abbreviation, so the boxes show the short description")}
        </T>
        {sys ? <T v="small" color={t.c.dangerInk}>{`Can't be removed: ${sys}`}</T> : null}
      </View>
      <Row gap={8}>
        <Seg title="Change" small onPress={() => codeEdit(c.id)} />
        {sys ? null : <Seg title="Remove" small onPress={() => codeRemove(c.id)} />}
      </Row>
    </View>
  );
}

function RemovedRow({ c, ctx }: { c: Code; ctx: Ctx }) {
  const t = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: t.c.line }]}>
      <Chip title={M.codeLabel(c.id, ctx)} cat={ctx.reg.CAT[c.id]} />
      <View style={{ flex: 1 }}>
        <T v="label">{M.codeText(c.id, ctx)}</T>
      </View>
      <Seg title="Put back" small onPress={() => codeRestore(c.id)} />
    </View>
  );
}

function CodeFormBody({ form, ctx }: { form: CodeForm; ctx: Ctx }) {
  const [short, setShort] = useState(form.short);
  const [abbr, setAbbr] = useState(form.abbr);
  const [long, setLong] = useState(form.long);
  const [section, setSection] = useState(form.section);
  return (
    <View style={{ gap: 14, paddingVertical: 10 }}>
      <T v="eyebrow">{form.id ? "Change this code" : "Add a code"}</T>
      <Field
        label="Short description — what family read, e.g. “Asking for a drink”"
        value={short}
        onChangeText={setShort}
        maxLength={60}
        autoComplete="off"
        autoCorrect={false}
      />
      <Field
        label="Abbreviation (optional, up to 4 letters) — shown in the boxes at the top"
        value={abbr}
        onChangeText={v => setAbbr(v.slice(0, 4))}
        maxLength={4}
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect={false}
        style={{ maxWidth: 160 }}
      />
      <Field
        label="Long description (optional) — shown when Everyday words is off"
        value={long}
        onChangeText={setLong}
        multiline
        minHeight={64}
        maxLength={200}
      />
      <View style={{ gap: 6 }}>
        <T v="label">Group</T>
        <Row wrap gap={8}>
          {SECTIONS.map(sec => (
            <Seg key={sec.id} title={sec.plain} on={section === sec.id} onPress={() => setSection(sec.id)} />
          ))}
        </Row>
      </View>
      <T v="small">{`Tip: write {he}, {him}, {his} or {himself} and it's filled in with the right word for ${ctx.name}.`}</T>
      <Row wrap gap={10}>
        <Button kind="primary" big title={form.id ? "Save" : "Add code"} onPress={() => codeSave({ short, abbr, long, section })} />
        <Button big title="Cancel" onPress={codeCancel} />
      </Row>
    </View>
  );
}

export function CodesScreen() {
  const reg = useApp(s => s.reg);
  const codeForm = useApp(s => s.codeForm);
  const V = useView();
  const { isTablet } = useLayout();
  const active = activeCodes(reg);
  const removed = reg.LIST.filter(c => c.archived);

  return (
    <Screen>
      <Scroll contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={{ width: "100%", maxWidth: isTablet ? 880 : undefined, alignSelf: "center", gap: 4 }}>
          <T v="lede">These are the squares you tap on the Record screen. Changes show up straight away for everyone.</T>

          {codeForm ? (
            <CodeFormBody key={codeForm.id ?? "new"} form={codeForm} ctx={V.ctx} />
          ) : (
            <Row style={{ paddingTop: 10 }}>
              <Button kind="primary" big title="Add a code" onPress={codeNew} />
            </Row>
          )}

          {SECTIONS.map(sec => {
            const list = active.filter(c => c.section === sec.id);
            return (
              <View key={sec.id}>
                <T v="eyebrow" style={{ marginTop: 16, marginBottom: 4 }}>{sec.plain}</T>
                {list.length ? list.map(c => <CodeRow key={c.id} c={c} ctx={V.ctx} />) : <T v="small">Nothing in this group.</T>}
              </View>
            );
          })}

          {removed.length ? (
            <View>
              <T v="eyebrow" style={{ marginTop: 20, marginBottom: 4 }}>Removed — past entries still show these</T>
              {removed.map(c => <RemovedRow key={c.id} c={c} ctx={V.ctx} />)}
            </View>
          ) : null}
        </View>
      </Scroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
});
