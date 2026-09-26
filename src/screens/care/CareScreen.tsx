// Care: medicines (due ones first, one tap to mark given), a quick note for the current box, and the less
// frequent pages: the week's trends, what family see, and settings.
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Theme, XStack, YStack } from "tamagui";

import { PHRASES, type Med } from "@/lib/codes";
import * as M from "@/lib/model";
import { addPhrase, editMeds, giveMed, saveNote, setDraft } from "@/state/actions";
import { useApp } from "@/state/app";
import { useView } from "@/state/view";
import { Check, ChevronRight, Eye, Moon, NotebookPen, Settings } from "@/ui/icons";
import { useLayout } from "@/ui/layout";
import { NoteCard } from "@/ui/NoteCard";
import { Button, Card, Empty, Field, KeyboardArea, ListRow, Screen, Scroll, Section, Seg, T } from "@/ui/primitives";

type Given = Record<string, number | string | null>;

const isDue = (med: Med, given: Given, now: number) => !given[med.name] && !med.asNeeded && !!med.dueAt && M.hm24(now) >= med.dueAt;

function MedRow({ med, now, given, ok, last }: { med: Med; now: number; given: Given; ok: boolean; last: boolean }) {
  const g = given[med.name];
  const due = isDue(med, given, now);
  const gtxt = typeof g === "number" ? M.hhmm(g) : (g ?? "");
  const state = g ? `Given ${gtxt}` : due ? "Due now" : med.asNeeded ? "If needed" : med.dueAt ? `Due ${med.dueAt}` : "Not due yet";
  return (
    <XStack items="center" gap={12} px={16} py={12} borderBottomWidth={last ? 0 : 1} borderBottomColor="$color4">
      <YStack flex={1} gap={2}>
        <T v="label" fontSize={16}>{med.name}</T>
        <T v="small" fontSize={13}>{[med.dose, med.sched].filter(Boolean).join(" · ")}</T>
        <Theme name={g ? "green" : due ? "red" : null}>
          <T v="small" fontSize={13} weight="heavy" color={g || due ? "$color11" : "$color10"}>{state}</T>
        </Theme>
      </YStack>
      {g ? (
        <Theme name="green">
          <YStack width={44} height={44} rounded={22} bg="$color4" items="center" justify="center" aria-label="Given">
            <Check size={22} color="$color11" strokeWidth={3} />
          </YStack>
        </Theme>
      ) : (
        <Button kind={due ? "primary" : "soft"} small title="Give" disabled={!ok} onPress={() => giveMed(med.name)} />
      )}
    </XStack>
  );
}

function Medicines() {
  const V = useView();
  const given: Given = V.day?.meds || {};
  const ok = V.isToday;
  // Due now first, then not yet given, then the ones already given.
  const rank = (m: Med) => (isDue(m, given, V.now) ? 0 : given[m.name] ? 2 : 1);
  const meds = [...V.meds].sort((a, b) => rank(a) - rank(b));
  return (
    <Section title="Medicines" action={<Button kind="ghost" small title={meds.length ? "Edit" : "Add"} onPress={editMeds} />}>
      {meds.length ? (
        <Card pad={0}>
          {meds.map((m, i) => <MedRow key={m.name} med={m} now={V.now} given={given} ok={ok} last={i === meds.length - 1} />)}
        </Card>
      ) : (
        <Card pad={0}>
          <Empty title="No medicines yet" body={`Add ${V.ctx.name}'s medicines and they'll show here, ready to tick off.`}>
            <Button kind="primary" title="Add a medicine" onPress={editMeds} />
          </Empty>
        </Card>
      )}
      <T v="small" fontSize={13} px={4}>Refused or held back? Record “Not wanting help” and say why in the note.</T>
    </Section>
  );
}

function Note() {
  const V = useView();
  const draft = useApp(s => s.drafts.noteScreen || "");
  const ok = V.isToday;
  const cur = V.d.byKey[V.d.curKey];
  return (
    <Section title={`Note for ${M.hhmm(V.info.start + V.d.cur * M.SLOT_MS)}`} action={<Button kind="ghost" small title="All notes" onPress={() => router.push("/notes")} />}>
      <Card gap={12}>
        <XStack flexWrap="wrap" gap={6}>
          {PHRASES.map(p => <Seg key={p} title={p} small onPress={() => addPhrase(p)} />)}
        </XStack>
        <Field multiline minHeight={110} value={draft} onChangeText={text => setDraft("noteScreen", text)} placeholder="Anything worth remembering…" accessibilityLabel="Note" />
        {cur?.note ? <NoteCard text={cur.note} meta="Already saved for this time" /> : null}
        <XStack gap={8} flexWrap="wrap">
          <Button kind="primary" title="Save · family see it" grow disabled={!ok || !draft.trim()} onPress={() => saveNote(false)} />
          <Button title="Caregivers only" grow disabled={!ok || !draft.trim()} onPress={() => saveNote(true)} />
        </XStack>
      </Card>
    </Section>
  );
}

function More() {
  return (
    <Section title="More">
      <Card pad={0}>
        <ListRow icon={NotebookPen} title="Notes" detail="Every note, any day" onPress={() => router.push("/notes")} right={<ChevronRight size={20} color="$color10" />} />
        <ListRow icon={Moon} title="The last seven nights" detail="Sleep, restlessness and falls" onPress={() => router.push("/week")} right={<ChevronRight size={20} color="$color10" />} />
        <ListRow icon={Eye} title="What family see" detail="A preview of their screen" onPress={() => router.push("/preview")} right={<ChevronRight size={20} color="$color10" />} />
        <ListRow icon={Settings} title="Settings" detail="People, codes, medicines, display" onPress={() => router.push("/settings")} right={<ChevronRight size={20} color="$color10" />} last />
      </Card>
    </Section>
  );
}

export function CareScreen() {
  const { isTablet } = useLayout();
  const insets = useSafeAreaInsets();
  const pad = isTablet ? 24 : 16;
  return (
    <Screen>
      <KeyboardArea>
        <Scroll contentContainerStyle={{ padding: pad, paddingLeft: pad + insets.left, paddingRight: pad + insets.right, paddingBottom: 40, gap: 22 }}>
          {isTablet ? (
            <XStack gap={24} items="flex-start">
              <YStack flex={1} gap={22}><Medicines /></YStack>
              <YStack flex={1} gap={22}><Note /><More /></YStack>
            </XStack>
          ) : (
            <>
              <Medicines />
              <Note />
              <More />
            </>
          )}
        </Scroll>
      </KeyboardArea>
    </Screen>
  );
}
