// The fall report: family were alerted when the fall was recorded; this page collects the answers and a
// narrative, then sends the full report. Who has seen the alert is shown alongside.
import { useRouter } from "expo-router";
import { Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Theme, XStack, YStack } from "tamagui";

import { FALL_QUESTIONS } from "@/lib/codes";
import * as M from "@/lib/model";
import { fallAnswer, fileFall, setFallNarrative } from "@/state/actions";
import { useApp } from "@/state/app";
import { notAsked, useView } from "@/state/view";
import { Check, Phone, Siren } from "@/ui/icons";
import { RAIL_WIDTH, useLayout } from "@/ui/layout";
import { Button, Card, Empty, Field, KeyboardArea, Screen, Scroll, Section, Seg, T } from "@/ui/primitives";

export function FallScreen() {
  const router = useRouter();
  const { isTablet } = useLayout();
  const insets = useSafeAreaInsets();
  const V = useView();
  const draftNarr = useApp(s => s.drafts.fallNarr);
  const onCallPhone = useApp(s => s.patient?.onCallPhone);
  const fall = V.day?.fall;
  const name = V.ctx.name;

  if (!fall) {
    return (
      <Screen>
        <Empty title="No fall recorded today" body={`If ${name} falls, tap + then Report a fall. Family are told straight away and you finish the report here.`}>
          <Button kind="primary" title="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/record"))} />
        </Empty>
      </Screen>
    );
  }

  const answers = fall.answers || {};
  const narr = draftNarr ?? fall.narrative ?? "";
  const al = V.alerts.find(a => a.kind === "fall" || a.kind === "fall-note");

  const banner = (
    <Theme name="red">
      <XStack bg="$color9" rounded={24} p={18} gap={14} items="center">
        <Siren size={30} color="$white1" />
        <YStack flex={1} gap={2}>
          <T v="eyebrow" color="$white1" opacity={0.9}>{`Fall recorded at ${M.hhmm(fall.at)}`}</T>
          <T v="big" color="$white1">{fall.filedAt ? `Report sent ${M.hhmm(fall.filedAt)}` : "Family have been told"}</T>
          {fall.filedAt ? null : <T v="small" color="$white1" opacity={0.9}>Please finish this report now. It becomes the official record.</T>}
        </YStack>
      </XStack>
    </Theme>
  );

  const form = (
    <YStack gap={20}>
      {FALL_QUESTIONS.map(([label, opts]) => (
        <Section key={label} title={label}>
          <XStack flexWrap="wrap" gap={6}>
            {opts.map(o => <Seg key={o} small title={notAsked(o)} on={answers[label] === o} onPress={() => fallAnswer(label, o)} />)}
          </XStack>
        </Section>
      ))}
      <Field
        label="What happened, in your own words"
        multiline
        minHeight={130}
        value={narr}
        onChangeText={setFallNarrative}
        placeholder={`Where you found ${name}, what was said, and what you did.`}
      />
      <YStack gap={10}>
        <Button kind="primary" big icon={fall.filedAt ? Check : undefined} title={fall.filedAt ? `Report sent ${M.hhmm(fall.filedAt)}` : "Send the report to family"} disabled={!!fall.filedAt} onPress={fileFall} />
        {onCallPhone ? (
          <Button big icon={Phone} title="Call the on-call nurse" onPress={() => Linking.openURL(`tel:${onCallPhone.replace(/[^\d+]/g, "")}`)} />
        ) : (
          <T v="small" fontSize={13}>{"Add the on-call nurse's number in Settings → Details to get a Call button here."}</T>
        )}
        <T v="small" fontSize={13}>Saved as you type.</T>
      </YStack>
    </YStack>
  );

  const seen = (
    <Section title={`Family told at ${M.hhmm(al?.at ?? fall.at)}`}>
      <Card pad={0}>
        {V.family.length ? V.family.map((m, i) => {
          const a = al?.acks?.[m.id];
          return (
            <XStack key={m.id} justify="space-between" items="center" gap={8} px={16} py={12} borderBottomWidth={i === V.family.length - 1 ? 0 : 1} borderBottomColor="$color4">
              <T v="label">{m.name}{m.relation ? ` · ${m.relation}` : ""}</T>
              <T v="small" fontSize={13} color={a ? "$green11" : "$color10"} weight="heavy">{a ? `Seen ${M.hhmm(a.at)}` : "Not seen yet"}</T>
            </XStack>
          );
        }) : <T v="small" p={16}>No family on this log yet.</T>}
      </Card>
    </Section>
  );

  return (
    <Screen>
      <KeyboardArea>
        <Scroll contentContainerStyle={{ padding: isTablet ? 24 : 16, paddingBottom: insets.bottom + 32, gap: 20 }}>
          {banner}
          {isTablet ? (
            <XStack gap={24} items="flex-start">
              <YStack flex={1}>{form}</YStack>
              <YStack width={RAIL_WIDTH}>{seen}</YStack>
            </XStack>
          ) : (
            <>
              {form}
              {seen}
            </>
          )}
        </Scroll>
      </KeyboardArea>
    </Screen>
  );
}
