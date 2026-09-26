// Subscribe for a care log: what it covers, the plans (yearly first), Subscribe, Restore purchases, and the renewal
// terms and links the App Store and Google Play require. Family never see this; they never pay.
import * as Linking from "expo-linking";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform } from "react-native";
import { Theme, XStack, YStack } from "tamagui";

import { TRIAL_DAYS } from "@/lib/billing";
import { buy, loadPlans, PURCHASES_AVAILABLE, restore, type Plan } from "@/lib/purchases";
import { closeModal } from "@/state/actions";
import { useApp } from "@/state/app";
import { toast } from "@/state/feedback";
import { useView } from "@/state/view";
import { Check } from "@/ui/icons";
import { Button, T } from "@/ui/primitives";
import { Sheet } from "@/ui/Sheet";

const TERMS = "https://observenow.joshpointer.com/terms/";
const PRIVACY = "https://observenow.joshpointer.com/privacy/";

function Benefit({ text }: { text: string }) {
  return (
    <XStack gap={10} items="flex-start">
      <Theme name="green">
        <YStack width={22} height={22} rounded={11} bg="$color4" items="center" justify="center" mt={1}>
          <Check size={14} color="$color11" strokeWidth={3} />
        </YStack>
      </Theme>
      <T flex={1} fontSize={16} lineHeight={22}>{text}</T>
    </XStack>
  );
}

function PlanCard({ plan, on, best, onPress }: { plan: Plan; on: boolean; best: string | null; onPress: () => void }) {
  return (
    <XStack
      role="radio"
      aria-checked={on}
      aria-label={`${plan.title}, ${plan.price}${plan.perMonth ? `, ${plan.perMonth} a month` : ""}`}
      onPress={onPress}
      items="center"
      gap={12}
      p={16}
      rounded={20}
      bg={on ? "$accent3" : "$card"}
      borderWidth={2}
      borderColor={on ? "$accent9" : "$color5"}
      pressStyle={{ scale: 0.98 }}
      transition="quick"
    >
      <YStack width={24} height={24} rounded={12} borderWidth={2} borderColor={on ? "$accent9" : "$color7"} items="center" justify="center">
        {on ? <YStack width={12} height={12} rounded={6} bg="$accent9" /> : null}
      </YStack>
      <YStack flex={1} gap={2}>
        <XStack items="center" gap={8}>
          <T v="label" fontSize={17}>{plan.title}</T>
          {best ? (
            <Theme name="green">
              <YStack bg="$color4" px={8} py={2} rounded={8}><T fontSize={12} lineHeight={15} weight="heavy" color="$color11">{best}</T></YStack>
            </Theme>
          ) : null}
        </XStack>
        {plan.perMonth ? <T v="small" fontSize={13}>{`${plan.perMonth} a month, billed yearly`}</T> : null}
      </YStack>
      <T v="label" fontSize={17}>{plan.price}</T>
    </XStack>
  );
}

export function Paywall({ open }: { open: boolean }) {
  const V = useView();
  const pid = useApp(s => s.pid);
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [busy, setBusy] = useState<"" | "buy" | "restore">("");
  const [error, setError] = useState("");
  const b = V.billing;

  useEffect(() => {
    if (!open || !pid || !PURCHASES_AVAILABLE) return;
    let live = true;
    loadPlans(pid).then(p => { if (live) { setPlans(p); setChosen(p[0]?.id || null); } }, e => { if (live) setError(String(e?.message || e)); });
    return () => { live = false; };
  }, [open, pid]);

  const monthly = plans?.find(p => p.period === "month");
  const yearly = plans?.find(p => p.period === "year");
  // "Save 17%" from the real store prices, so it's right in every currency.
  const saving = monthly && yearly ? Math.round((1 - yearly.pkg.product.price / (monthly.pkg.product.price * 12)) * 100) : 0;
  const plan = plans?.find(p => p.id === chosen) || null;

  const status =
    b.kind === "trial" ? `Your free trial ends in ${b.daysLeft} ${b.daysLeft === 1 ? "day" : "days"}.`
    : b.kind === "lapsed" ? "Recording is paused until the subscription is renewed. Everything recorded is safe, and falls can always be reported."
    : b.kind === "active" ? "This log is subscribed." : "";

  const doBuy = async () => {
    if (!pid || !plan) return;
    setBusy("buy"); setError("");
    try {
      const ok = await buy(pid, plan);
      if (ok) { closeModal(); toast(`Thank you. ${V.ctx.name}'s log is subscribed.`); }
    } catch (e) { setError("The purchase didn't go through. Nothing was charged. Try again in a moment."); if (__DEV__) console.warn(e); }
    setBusy("");
  };
  const doRestore = async () => {
    if (!pid) return;
    setBusy("restore"); setError("");
    try {
      const ok = await restore(pid);
      if (ok) { closeModal(); toast("Subscription restored."); } else setError(`No subscription was found for ${V.ctx.name}'s log on this ${Platform.OS === "ios" ? "Apple ID" : "Google account"}.`);
    } catch (e) { setError("Couldn't restore right now. Check the connection and try again."); if (__DEV__) console.warn(e); }
    setBusy("");
  };

  const footer = PURCHASES_AVAILABLE ? (
    <>
      <Button kind="primary" big title={busy === "buy" ? "One moment…" : plan ? `Subscribe · ${plan.price}` : "Subscribe"} disabled={!plan || !!busy} onPress={doBuy} />
      <XStack justify="center">
        <Button kind="ghost" small title={busy === "restore" ? "Checking…" : "Restore purchases"} disabled={!!busy} onPress={doRestore} />
      </XStack>
    </>
  ) : null;

  return (
    <Sheet open={open} onClose={closeModal} title={`Keep ${V.ctx.name}'s log going`} subtitle={status} footer={footer}>
      <YStack gap={12}>
        <Benefit text="Record every 15 minutes, with medicines, notes and fall reports" />
        <Benefit text="Family see everything in plain words, free, on their own phones" />
        <Benefit text="Every caregiver's phone and tablet, one subscription per person cared for" />
        <Benefit text="The week's sleep and restlessness, ready for the nurse or doctor" />
      </YStack>

      {!PURCHASES_AVAILABLE ? (
        <T v="small">Subscriptions aren&apos;t available in this version of the app.</T>
      ) : !plans && !error ? (
        <XStack justify="center" py={20}><ActivityIndicator /></XStack>
      ) : (
        <YStack gap={10}>
          {(plans || []).map(p => (
            <PlanCard key={p.id} plan={p} on={p.id === chosen} best={p.period === "year" && saving > 0 ? `Save ${saving}%` : null} onPress={() => setChosen(p.id)} />
          ))}
        </YStack>
      )}

      {error ? <T v="small" color="$red11">{error}</T> : null}

      <T v="small" fontSize={12} lineHeight={17}>
        {`${b.kind === "trial" || b.kind === "off" ? `Includes a ${TRIAL_DAYS}-day free trial for each new log. ` : ""}Payment is charged to your ${Platform.OS === "ios" ? "Apple ID" : "Google Play"} account. The subscription renews automatically unless it's cancelled at least 24 hours before the end of the period, and you can manage or cancel it in your ${Platform.OS === "ios" ? "App Store" : "Google Play"} settings.`}
      </T>
      <XStack gap={16} justify="center">
        <T v="small" fontSize={13} color="$accent11" onPress={() => Linking.openURL(TERMS)} role="link">Terms of use</T>
        <T v="small" fontSize={13} color="$accent11" onPress={() => Linking.openURL(PRIVACY)} role="link">Privacy policy</T>
      </XStack>
    </Sheet>
  );
}
