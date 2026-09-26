// Port of the PWA's pickerView (views.js ~512-528): choose who you're caring for, accept an invitation, or add
// the first person.
import { useState } from "react";
import { YStack } from "tamagui";

import { acceptInvite, addPatient, closePicker, openPatient, signOut, toggleAddPerson } from "@/state/actions";
import { useApp } from "@/state/app";
import { Button, Field, T } from "@/ui/primitives";
import { LoadingView } from "./LoadingView";
import { ErrorText, GateLayout, LinkButton, PersonButton } from "./parts";

export function PickerView() {
  const allLinks = useApp(s => s.links) || [];
  const pickerFor = useApp(s => s.pickerFor);
  // Opened from family mode: only the people you were invited to follow. From caregiver mode: the ones you care for.
  const links = pickerFor ? allLinks.filter(l => (l.role === "family") === (pickerFor === "family")) : allLinks;
  const pendingInvites = useApp(s => s.pendingInvites);
  const pid = useApp(s => s.pid);
  const addingPatient = useApp(s => s.addingPatient);
  const authError = useApp(s => s.authError);
  const [name, setName] = useState("");

  if (!links.length && pendingInvites === undefined) return <LoadingView />;

  const invites = (pendingInvites || []).filter(i => !allLinks.some(l => l.id === i.id));
  // Family mode only ever offers the people you were invited to (and invitations waiting); adding someone to care
  // for belongs to caregiver mode.
  const familyOnly = pickerFor === "family";
  const first = !familyOnly && !allLinks.length && !invites.length;
  const showForm = !familyOnly && (first || addingPatient);
  const title = links.length
    ? pickerFor === "family" ? "Who are you following?" : "Who are you caring for?"
    : invites.length ? "You've been invited" : "Let's get started";
  const cur = allLinks.find(l => l.id === pid);
  const submit = () => { addPatient(name); setName(""); };

  return (
    <GateLayout>
      <T v="title">{title}</T>
      {links.length ? (
        <YStack gap={10}>
          <T color="$color11">Choose a person to open.</T>
          <YStack gap={8}>
            {links.map(l => (
              <PersonButton
                key={l.id}
                name={l.name}
                detail={`${l.role === "caregiver" ? "You're a caregiver" : "You're family"}${l.id === pid ? " · open now" : ""}`}
                onPress={() => openPatient(l.id)}
              />
            ))}
          </YStack>
        </YStack>
      ) : null}
      {invites.map(i => (
        <YStack key={i.id} gap={8} rounded={22} p={16} bg="$accent3">
          <T weight="black" fontSize={20}>{i.patientName || "A new person"}</T>
          <T v="small">You&apos;ve been invited to join as {i.role === "caregiver" ? "a caregiver" : "family"}.</T>
          <Button kind="primary" big title="Join" onPress={() => acceptInvite(i.id)} />
        </YStack>
      ))}
      {first ? (
        <T color="$color11">
          No one here yet. Family: sign in with the email or number you were invited with and the invitation
          appears here. Setting up care? Add the person being cared for:
        </T>
      ) : null}
      {showForm ? (
        <YStack gap={10}>
          <Field
            label="Who is being cared for?"
            value={name}
            onChangeText={setName}
            placeholder="Their first name"
            autoComplete="off"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          <Button kind="primary" big title="Add this person" onPress={submit} />
        </YStack>
      ) : familyOnly ? null : (
        <Button big title="Add another person" onPress={toggleAddPerson} />
      )}
      <ErrorText>{authError}</ErrorText>
      {pid && cur ? <LinkButton title={`Back to ${cur.name}`} onPress={closePicker} /> : null}
      <LinkButton title="Sign out" onPress={signOut} />
    </GateLayout>
  );
}
