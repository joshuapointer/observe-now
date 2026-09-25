// Port of the PWA's pickerView (views.js ~512-528): choose who you're caring for, accept an invitation, or add
// the first person.
import { useState } from "react";
import { View } from "react-native";

import { acceptInvite, addPatient, closePicker, openPatient, signOut, toggleAddPerson } from "@/state/actions";
import { useApp } from "@/state/app";
import { Button, Field, T } from "@/ui/primitives";
import { useTheme } from "@/ui/theme";
import { LoadingView } from "./LoadingView";
import { ErrorText, GateLayout, LinkButton, PersonButton } from "./parts";

export function PickerView() {
  const t = useTheme();
  const links = useApp(s => s.links) || [];
  const pendingInvites = useApp(s => s.pendingInvites);
  const pid = useApp(s => s.pid);
  const addingPatient = useApp(s => s.addingPatient);
  const authError = useApp(s => s.authError);
  const [name, setName] = useState("");

  if (!links.length && pendingInvites === undefined) return <LoadingView />;

  const invites = (pendingInvites || []).filter(i => !links.some(l => l.id === i.id));
  const first = !links.length && !invites.length;
  const showForm = first || addingPatient;
  const title = links.length ? "Who are you caring for?" : invites.length ? "You've been invited" : "Let's get started";
  const cur = links.find(l => l.id === pid);
  const submit = () => { addPatient(name); setName(""); };

  return (
    <GateLayout>
      <T v="title">{title}</T>
      {links.length ? (
        <View style={{ gap: 10 }}>
          <T color={t.c.mute}>Choose a person to open.</T>
          <View style={{ gap: 8 }}>
            {links.map(l => (
              <PersonButton
                key={l.id}
                name={l.name}
                detail={`${l.role === "caregiver" ? "You're a caregiver" : "You're family"}${l.id === pid ? " · open now" : ""}`}
                onPress={() => openPatient(l.id)}
              />
            ))}
          </View>
        </View>
      ) : null}
      {invites.map(i => (
        <View
          key={i.id}
          style={{
            gap: 8, borderRadius: t.r.md, padding: 14,
            backgroundColor: t.colorful ? t.c.panel : t.c.ground,
            borderWidth: t.colorful ? 0 : 2, borderColor: t.c.edge,
          }}
        >
          <T weight="black" style={{ fontSize: 18 }}>{i.patientName || "A new person"}</T>
          <T v="small">You&apos;ve been invited to join as {i.role === "caregiver" ? "a caregiver" : "family"}.</T>
          <Button kind="primary" big title="Join" onPress={() => acceptInvite(i.id)} />
        </View>
      ))}
      {first ? (
        <T color={t.c.mute}>
          This account isn&apos;t on anyone&apos;s log yet. Family: if someone invited you, make sure you signed in with
          the email address they used and the invitation will appear here. Setting up the care iPad? Add the
          person being cared for:
        </T>
      ) : null}
      {showForm ? (
        <View style={{ gap: 10 }}>
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
        </View>
      ) : (
        <Button big title="Add another person" onPress={toggleAddPerson} />
      )}
      <ErrorText>{authError}</ErrorText>
      {pid && cur ? <LinkButton title={`Back to ${cur.name}`} onPress={closePicker} /> : null}
      <LinkButton title="Sign out" onPress={signOut} />
    </GateLayout>
  );
}
