// Settings: the care team, what can be recorded, how the app looks, and signing out. Used both as the
// caregiver's /settings page and as family's /family-settings; rows are mode-aware. Switching people, modes and
// ending a shift live in the account sheet (the person button in the header).
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { XStack, YStack } from "tamagui";

import { DEMO } from "@/lib/config";
import { activeCodes } from "@/lib/codes";
import { manageUrl, PURCHASES_AVAILABLE, restore } from "@/lib/purchases";
import * as M from "@/lib/model";
import { deleteAccount, editMeds, openModal, setSetting, signOut } from "@/state/actions";
import { actingAs, useApp, type Settings } from "@/state/app";
import { toast } from "@/state/feedback";
import { useView } from "@/state/view";
import { ChevronRight, CircleHelp, ListChecks, LogOut, Pill, Sparkles, Stethoscope, Users } from "@/ui/icons";
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

// The log's subscription, for caregivers: where it stands, and subscribing, managing or restoring it.
function SubscriptionSection() {
  const V = useView();
  const pid = useApp(s => s.pid);
  const b = V.billing;
  const date = (ms: number) => new Date(ms).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
  const detail =
    b.kind === "trial" ? `Free trial · ${b.daysLeft} ${b.daysLeft === 1 ? "day" : "days"} left`
    : b.kind === "active" ? (b.willRenew ? `Subscribed · renews ${date(b.until)}` : `Subscribed until ${date(b.until)} · won't renew`)
    : b.kind === "lapsed" ? "Ended · recording is paused" : "";
  const manage = async () => {
    const url = pid ? await manageUrl(pid).catch(() => null) : null;
    Linking.openURL(url || (Platform.OS === "ios" ? "https://apps.apple.com/account/subscriptions" : "https://play.google.com/store/account/subscriptions"));
  };
  const doRestore = async () => {
    if (!pid) return;
    const ok = await restore(pid).catch(() => false);
    toast(ok ? "Subscription restored." : `No subscription found for ${V.ctx.name}'s log.`);
  };
  return (
    <Section title="Subscription">
      <Card pad={0}>
        <ListRow
          icon={Sparkles}
          title={`${V.ctx.name}'s log`}
          detail={detail}
          right={b.kind === "active"
            ? <Seg small title="Manage" onPress={manage} />
            : <Seg small title="Subscribe" onPress={() => openModal("paywall")} />}
        />
        {PURCHASES_AVAILABLE ? <ListRow title="Restore purchases" detail="Already subscribed on another phone?" onPress={doRestore} right={chevron} last /> : null}
      </Card>
    </Section>
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

          {isFamily || V.billing.kind === "off" ? null : <SubscriptionSection />}

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
              <Button kind="destructive" title="Delete my account" onPress={deleteAccount} />
              <T v="small" fontSize={13}>
                {isFamily
                  ? "Removes your sign-in and takes you off every log you follow."
                  : "Removes this sign-in, and deletes any log it set up, with everything recorded in it, for everyone on it."}
              </T>
            </Card>
          </Section>
        </YStack>
      </Scroll>
    </Screen>
  );
}
