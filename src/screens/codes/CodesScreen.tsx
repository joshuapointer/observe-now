// The codes offered in the record sheet, by group, and the add/change form. Reached from Settings → Codes.
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { XStack, YStack } from "tamagui";

import { activeCodes, SECTIONS, SYSTEM_CODES, type Code } from "@/lib/codes";
import * as M from "@/lib/model";
import type { Ctx } from "@/lib/types";
import { codeCancel, codeEdit, codeNew, codeRemove, codeRestore, codeSave } from "@/state/actions";
import type { CodeForm } from "@/state/app";
import { useApp } from "@/state/app";
import { useView } from "@/state/view";
import { Plus } from "@/ui/icons";
import { useLayout } from "@/ui/layout";
import { Button, Card, Chip, Field, Scroll, Screen, Section, Seg, T } from "@/ui/primitives";

function CodeRow({ c, ctx, last }: { c: Code; ctx: Ctx; last: boolean }) {
  const sys = SYSTEM_CODES[c.id];
  return (
    <XStack items="center" gap={12} px={14} py={12} borderBottomWidth={last ? 0 : 1} borderBottomColor="$color4">
      <Chip title={M.codeLabel(c.id, ctx)} cat={ctx.reg.CAT[c.id] || null} />
      <YStack flex={1} gap={2}>
        <T v="label">{M.codeText(c.id, ctx)}</T>
        {c.long ? <T v="small" fontSize={13}>{M.codeText(c.id, ctx, false)}</T> : null}
        {sys ? <T v="small" fontSize={13} color="$red11">{`Can't be removed: ${sys}`}</T> : null}
      </YStack>
      <XStack gap={6}>
        <Seg title="Change" small onPress={() => codeEdit(c.id)} />
        {sys ? null : <Seg title="Remove" small onPress={() => codeRemove(c.id)} />}
      </XStack>
    </XStack>
  );
}

function CodeFormBody({ form, ctx }: { form: CodeForm; ctx: Ctx }) {
  const [short, setShort] = useState(form.short);
  const [abbr, setAbbr] = useState(form.abbr);
  const [long, setLong] = useState(form.long);
  const [section, setSection] = useState(form.section);
  return (
    <Card gap={14} transition="quick" enterStyle={{ opacity: 0, y: -8 }}>
      <T v="h2">{form.id ? "Change this code" : "Add a code"}</T>
      <Field label="What family read" hint="For example “Asking for a drink”." value={short} onChangeText={setShort} maxLength={60} autoComplete="off" autoCorrect={false} />
      <Field label="Abbreviation (optional, up to 4 letters)" hint="Shown in the day's boxes." value={abbr} onChangeText={v => setAbbr(v.slice(0, 4))} maxLength={4} autoCapitalize="characters" autoComplete="off" autoCorrect={false} />
      <Field label="Clinical description (optional)" hint="Shown when Everyday words is off." value={long} onChangeText={setLong} multiline minHeight={70} maxLength={200} />
      <Section title="Group">
        <XStack flexWrap="wrap" gap={8}>
          {SECTIONS.map(sec => <Seg key={sec.id} small title={sec.plain} cat={sec.id} on={section === sec.id} onPress={() => setSection(sec.id)} />)}
        </XStack>
      </Section>
      <T v="small" fontSize={13}>{`Tip: write {he}, {him}, {his} or {himself} and it's filled in with the right word for ${ctx.name}.`}</T>
      <XStack gap={10}>
        <Button kind="ghost" title="Cancel" onPress={codeCancel} />
        <Button kind="primary" grow title={form.id ? "Save" : "Add code"} onPress={() => codeSave({ short, abbr, long, section })} />
      </XStack>
    </Card>
  );
}

export function CodesScreen() {
  const reg = useApp(s => s.reg);
  const codeForm = useApp(s => s.codeForm);
  const V = useView();
  const { isTablet } = useLayout();
  const insets = useSafeAreaInsets();
  const active = activeCodes(reg);
  const removed = reg.LIST.filter(c => c.archived);

  return (
    <Screen>
      <Scroll contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}>
        <YStack width="100%" maxW={isTablet ? 820 : undefined} self="center" gap={22}>
          <T v="small">These are the choices in the record sheet. Changes show up straight away for everyone.</T>
          {codeForm ? <CodeFormBody key={codeForm.id ?? "new"} form={codeForm} ctx={V.ctx} /> : <Button kind="primary" icon={Plus} title="Add a code" onPress={codeNew} self="flex-start" />}
          {SECTIONS.map(sec => {
            const list = active.filter(c => c.section === sec.id);
            return (
              <Section key={sec.id} title={sec.plain}>
                <Card pad={0}>
                  {list.length ? list.map((c, i) => <CodeRow key={c.id} c={c} ctx={V.ctx} last={i === list.length - 1} />) : <T v="small" p={16}>Nothing in this group.</T>}
                </Card>
              </Section>
            );
          })}
          {removed.length ? (
            <Section title="Removed · past entries still show these">
              <Card pad={0}>
                {removed.map((c, i) => (
                  <XStack key={c.id} items="center" gap={12} px={14} py={12} borderBottomWidth={i === removed.length - 1 ? 0 : 1} borderBottomColor="$color4">
                    <Chip title={M.codeLabel(c.id, V.ctx)} cat={V.ctx.reg.CAT[c.id] || null} />
                    <T v="label" flex={1}>{M.codeText(c.id, V.ctx)}</T>
                    <Seg title="Put back" small onPress={() => codeRestore(c.id)} />
                  </XStack>
                ))}
              </Card>
            </Section>
          ) : null}
        </YStack>
      </Scroll>
    </Screen>
  );
}
