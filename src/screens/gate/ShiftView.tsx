// Port of the PWA's shiftView (views.js ~539-561): the shared device between shifts. Pick your name, type
// your PIN, or add yourself to the roster.
import { Pressable, StyleSheet, View } from "react-native";

import { DEMO } from "@/lib/config";
import { firstName } from "@/lib/model";
import type { Caregiver } from "@/lib/types";
import { cgNew, pickCaregiver, pinBack, pinCancel, pinKey, signOut } from "@/state/actions";
import { useApp, type CgForm } from "@/state/app";
import { Button, T } from "@/ui/primitives";
import { useTheme } from "@/ui/theme";
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
  const t = useTheme();
  const patient = useApp(s => s.patient);
  const name = patient?.name || "them";
  return (
    <GateLayout>
      <T v="title">Start a shift</T>
      <T color={t.c.mute}>Who&apos;s looking after {name}? Tap your name.</T>
      <View style={{ gap: 8 }}>
        {roster.map(c => <PersonButton key={c.id} name={c.name} onPress={() => pickCaregiver(c.id)} />)}
      </View>
      <Button big title="I'm not on the list" onPress={cgNew} />
      <LinkButton title="Sign this device out" onPress={signOut} />
    </GateLayout>
  );
}

function AddCaregiverScreen({ roster, cgForm }: { roster: Caregiver[]; cgForm: CgForm | null }) {
  const t = useTheme();
  const patient = useApp(s => s.patient);
  const name = patient?.name || "them";
  return (
    <GateLayout>
      <T v="title">{roster.length ? "Add a caregiver" : `Who looks after ${name}?`}</T>
      {roster.length ? null : (
        <T color={t.c.mute}>
          Add each caregiver once. From then on they tap their name here to start a shift. Nobody needs their own account.
        </T>
      )}
      <CaregiverForm form={cgForm || { id: null, name: "" }} cancellable={roster.length > 0} />
      <LinkButton title="Sign this device out" onPress={signOut} />
    </GateLayout>
  );
}

function PinScreen({ cg }: { cg: Caregiver }) {
  const t = useTheme();
  const pin = useApp(s => s.pin);
  const pinError = useApp(s => s.pinError);
  const dots = Array.from({ length: 4 }, (_, i) => i < pin.length);

  return (
    <GateLayout>
      <T v="title">Hello, {firstName(cg.name)}</T>
      <T color={t.c.mute}>Type your 4-digit PIN to start your shift.</T>
      <View
        accessibilityRole="text"
        accessibilityLabel={`${pin.length} of 4 digits entered`}
        accessibilityLiveRegion="polite"
        style={{ flexDirection: "row", justifyContent: "center", gap: 16, paddingVertical: 4 }}
      >
        {dots.map((on, i) => (
          <View key={i} style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: t.c.ink, backgroundColor: on ? t.c.ink : "transparent" }} />
        ))}
      </View>
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
    <View style={{ gap: 10 }} accessibilityLabel="PIN pad">
      {PIN_ROWS.map((row, i) => (
        <View key={i} style={{ flexDirection: "row", gap: 10 }}>
          {row.map(k => <PinKey key={k} k={k} />)}
        </View>
      ))}
    </View>
  );
}

function PinKey({ k }: { k: string }) {
  const t = useTheme();
  const isDigit = k !== "cancel" && k !== "back";
  const label = k === "cancel" ? "Not me" : k === "back" ? "⌫" : k;
  const a11y = k === "cancel" ? "Not me, cancel" : k === "back" ? "Delete last digit" : `Digit ${k}`;
  const onPress = k === "cancel" ? pinCancel : k === "back" ? pinBack : () => pinKey(k);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={onPress}
      style={({ pressed }) => [
        {
          flex: 1, minHeight: 72, borderRadius: t.r.md, alignItems: "center", justifyContent: "center",
          backgroundColor: pressed ? t.c.press : t.c.ground,
          borderWidth: t.colorful ? StyleSheet.hairlineWidth * 2 : 2,
          borderColor: t.colorful ? t.c.faint : t.c.edge,
        },
        t.colorful && t.shadow,
      ]}
    >
      <T weight="heavy" style={{ fontSize: isDigit ? 28 : k === "back" ? 24 : 15, lineHeight: isDigit || k === "back" ? 34 : 20 }}>{label}</T>
    </Pressable>
  );
}
