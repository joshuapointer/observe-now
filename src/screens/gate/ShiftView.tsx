// Port of the PWA's shiftView (views.js ~539-561): the shared device between shifts. Pick your name, type
// your PIN, or add yourself to the roster.
import { XStack, YStack } from "tamagui";

import { DEMO } from "@/lib/config";
import { firstName } from "@/lib/model";
import type { Caregiver } from "@/lib/types";
import { cgNew, openPicker, pickCaregiver, pinBack, pinCancel, pinKey, setViewAs, signOut } from "@/state/actions";
import { useApp, type CgForm } from "@/state/app";
import { Button, T } from "@/ui/primitives";
import { Delete } from "@/ui/icons";
import { CaregiverForm } from "./CaregiverForm";
import { LoadingView } from "./LoadingView";
import { ErrorText, GateLayout, LinkButton, PersonButton } from "./parts";

export function ShiftView() {
  const roster = useApp(s => s.roster);
  const pinFor = useApp(s => s.pinFor);
  const cgForm = useApp(s => s.cgForm);

  if (!roster) return <LoadingView />;
  const cg = pinFor ? roster.find(c => c.id === pinFor) : undefined;
  if (cg) return <PinScreen cg={cg} />;
  if (!roster.length || cgForm) return <AddCaregiverScreen roster={roster} cgForm={cgForm} />;
  return <RosterScreen roster={roster} />;
}

function RosterScreen({ roster }: { roster: Caregiver[] }) {
  const patient = useApp(s => s.patient);
  const name = patient?.name || "them";
  return (
    <GateLayout>
      <T v="title">Start a shift</T>
      <T color="$color11">Who&apos;s looking after {name}? Tap your name.</T>
      <YStack gap={10}>
        {roster.map(c => <PersonButton key={c.id} name={c.name} onPress={() => pickCaregiver(c.id)} />)}
      </YStack>
      <Button big title="I'm not on the list" onPress={cgNew} />
      <FamilyMode />
      <SwitchPerson />
      <LinkButton title="Sign this device out" onPress={signOut} />
    </GateLayout>
  );
}

// No shift running: anyone with the caregiver role can look at this person's day the way family do instead.
function FamilyMode() {
  const member = useApp(s => s.member);
  if (member?.role !== "caregiver") return null;
  return <LinkButton title="See it as family instead" onPress={() => setViewAs("family")} />;
}

// Back to the list of people this account is linked to, when there's more than one (or an invitation waiting).
function SwitchPerson() {
  const links = useApp(s => s.links);
  const invites = useApp(s => s.pendingInvites);
  if ((links?.length || 0) < 2 && !invites?.length) return null;
  return <LinkButton title="Switch to someone else" onPress={() => openPicker(null)} />;
}

function AddCaregiverScreen({ roster, cgForm }: { roster: Caregiver[]; cgForm: CgForm | null }) {
  const patient = useApp(s => s.patient);
  const name = patient?.name || "them";
  return (
    <GateLayout>
      <T v="title">{roster.length ? "Add a caregiver" : `Who looks after ${name}?`}</T>
      {roster.length ? null : (
        <T color="$color11">
          Add each caregiver once. From then on they tap their name here to start a shift. Nobody needs their own account.
        </T>
      )}
      <CaregiverForm form={cgForm || { id: null, name: "" }} cancellable={roster.length > 0} />
      <FamilyMode />
      <SwitchPerson />
      <LinkButton title="Sign this device out" onPress={signOut} />
    </GateLayout>
  );
}

function PinScreen({ cg }: { cg: Caregiver }) {
  const pin = useApp(s => s.pin);
  const pinError = useApp(s => s.pinError);
  const dots = Array.from({ length: 4 }, (_, i) => i < pin.length);

  return (
    <GateLayout>
      <T v="title" center>Hello, {firstName(cg.name)}</T>
      <T color="$color11" center>Type your PIN to start your shift.</T>
      <XStack
        aria-label={`${pin.length} of 4 digits entered`}
        accessibilityLiveRegion="polite"
        justify="center"
        gap={18}
        py={6}
      >
        {dots.map((on, i) => (
          <YStack
            key={i}
            width={18}
            height={18}
            rounded={9}
            borderWidth={2}
            borderColor={pinError ? "$red9" : "$color12"}
            bg={on ? (pinError ? "$red9" : "$color12") : "transparent"}
            scale={on ? 1.1 : 1}
            transition="bouncy"
          />
        ))}
      </XStack>
      <ErrorText>{pinError}</ErrorText>
      <PinPad />
      {DEMO ? <T v="small">Practice mode: every PIN is 1234.</T> : null}
    </GateLayout>
  );
}

const PIN_ROWS: string[][] = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["cancel", "0", "back"],
];

function PinPad() {
  return (
    <YStack gap={12} aria-label="PIN pad">
      {PIN_ROWS.map((row, i) => (
        <XStack key={i} gap={12}>
          {row.map(k => <PinKey key={k} k={k} />)}
        </XStack>
      ))}
    </YStack>
  );
}

function PinKey({ k }: { k: string }) {
  const isDigit = k !== "cancel" && k !== "back";
  const a11y = k === "cancel" ? "Not me, cancel" : k === "back" ? "Delete last digit" : `Digit ${k}`;
  const onPress = k === "cancel" ? pinCancel : k === "back" ? pinBack : () => pinKey(k);
  return (
    <YStack
      role="button"
      aria-label={a11y}
      onPress={onPress}
      flex={1}
      height={72}
      rounded={24}
      items="center"
      justify="center"
      bg={isDigit ? "$card" : "transparent"}
      shadowColor="$shadowColor"
      shadowOpacity={isDigit ? 0.08 : 0}
      shadowRadius={10}
      shadowOffset={{ width: 0, height: 3 }}
      transition="quick"
      pressStyle={{ scale: 0.94, bg: "$color4" }}
    >
      {k === "back" ? <Delete size={26} color="$color12" /> : (
        <T weight={isDigit ? "heavy" : "bold"} fontSize={isDigit ? 30 : 16} lineHeight={isDigit ? 36 : 20} color={isDigit ? "$color12" : "$accent11"}>
          {k === "cancel" ? "Not me" : k}
        </T>
      )}
    </YStack>
  );
}
