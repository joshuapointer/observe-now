// Settings: the care team, what can be recorded, how the app looks, and signing out. Used both as the
// caregiver's /settings page and as family's /family-settings; rows are mode-aware. Switching people, modes and
// ending a shift live in the account sheet (the person button in the header).
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { XStack, YStack } from "tamagui";

import { DEMO } from "@/lib/config";
import { activeCodes } from "@/lib/codes";
import * as M from "@/lib/model";
import { editMeds, openModal, setSetting, signOut } from "@/state/actions";
import { actingAs, useApp, type Settings } from "@/state/app";
import { useView } from "@/state/view";
import { ChevronRight, CircleHelp, ListChecks, LogOut, Pill, Stethoscope, Users } from "@/ui/icons";
import { useLayout } from "@/ui/layout";
import { Button, Card, ListRow, Scroll, Screen, Section, Seg, T } from "@/ui/primitives";

const chevron = <ChevronRight size={20} color="$color10" />;

function Choice<K extends keyof Settings>({ k, title, detail, options, last }: {
  k: K; title: string; detail?: string; options: [Settings[K], string][]; last?: boolean;
}) {
  const value = useApp(s => s.settings[k]);
  return (
    <YStack px={16} py={12} gap={10} borderBottomWidth={last ? 0 : 1} borderBottomColor="$color4">
      <YStack gap={2}>
        <T v="label">{title}</T>
        {detail ? <T v="small" fontSize={13}>{detail}</T> : null}
      </YStack>
      <XStack flexWrap="wrap" gap={8}>
        {options.map(([id, label]) => <Seg key={String(id)} small title={label} on={value === id} onPress={() => setSetting(k, id)} />)}
      </XStack>
    </YStack>
  );
}

function Toggle({ k, title, detail, last }: { k: "plain" | "nudge" | "wake"; title: string; detail?: string; last?: boolean }) {
  const on = useApp(s => s.settings[k]);
  return (
    <ListRow
      title={title}
      detail={detail}
      last={last}
      right={<Seg small title={on ? "On" : "Off"} on={on} onPress={() => setSetting(k, !on)} accessibilityLabel={`${title}: ${on ? "on" : "off"}`} />}
    />
  );
}

export function SettingsScreen() {
  const { isTablet } = useLayout();
  const insets = useSafeAreaInsets();
  const V = useView();
  const reg = useApp(s => s.reg);
  const user = useApp(s => s.user);
  const plain = useApp(s => s.settings.plain);
  const isFamily = useApp(s => actingAs(s)) === "family";
  const who = user?.email || user?.phone || "";

  return (
    <Screen>
      <Scroll contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}>
        <YStack width="100%" maxW={isTablet ? 680 : undefined} self="center" gap={24}>
          {isFamily ? null : (
            <Section title={`Looking after ${V.ctx.name}`}>
              <Card pad={0}>
                <ListRow icon={Users} title="Caregivers" detail={`${V.roster.length} can start a shift here`} onPress={() => openModal("caregivers")} right={chevron} />
                <ListRow icon={Users} title="Family" detail={`${V.family.length} following along`} onPress={() => openModal("people")} right={chevron} />
                <ListRow icon={Stethoscope} title="Details" detail="Name and on-call number" onPress={() => openModal("details")} right={chevron} last />
              </Card>
            </Section>
          )}

          {isFamily ? null : (
            <Section title="What gets recorded">
              <Card pad={0}>
                <ListRow icon={ListChecks} title="Codes" detail={`${activeCodes(reg).length} to choose from`} onPress={() => router.push("/codes")} right={chevron} />
                <ListRow icon={Pill} title="Medicines" detail={`${V.meds.length} on the list`} onPress={editMeds} right={chevron} last />
              </Card>
            </Section>
          )}

          <Section title="Display">
            <Card pad={0}>
              <Choice k="theme" title="Screen" detail="Night is easier on the eyes in the dark" options={[["auto", "Auto"], ["light", "Light"], ["night", "Night"]]} />
              <Choice k="clock" title="Clock" detail={M.clock.h12 ? "For example 11:30 pm" : "For example 23:30"} options={[["auto", "Auto"], ["12", "12-hour"], ["24", "24-hour"]]} />
              <Toggle k="plain" title="Everyday words" detail={plain ? "Plain sentences" : "Clinical codes"} last={isFamily} />
              {isFamily ? null : <Toggle k="nudge" title="Countdown to the next box" />}
              {isFamily ? null : <Toggle k="wake" title="Keep the screen on" detail="While the log is open" last />}
            </Card>
          </Section>

          <Section title="Help">
            <Card pad={0}>
              <ListRow icon={CircleHelp} title="Tour" detail="See the welcome again" onPress={() => openModal("welcome")} right={chevron} last />
            </Card>
          </Section>

          <Section title="Account">
            <Card gap={12}>
              <T v="small">{`Signed in as ${who}${DEMO ? " · practice mode" : ""}${isFamily ? "" : ". This device stays signed in between shifts."}`}</T>
              <Button icon={LogOut} title={isFamily ? "Sign out" : "Sign this device out"} onPress={signOut} />
            </Card>
          </Section>
        </YStack>
      </Scroll>
    </Screen>
  );
}
