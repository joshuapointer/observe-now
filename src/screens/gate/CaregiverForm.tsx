import { useState } from "react";
import { View } from "react-native";

import { cgCancel, cgSave } from "@/state/actions";
import type { CgForm } from "@/state/app";
import { Button, Field, Row, T } from "@/ui/primitives";

// Add or change a caregiver (name + 4-digit PIN). Used by the shift screen and by Settings → Caregivers.
export function CaregiverForm({ form, cancellable }: { form: CgForm; cancellable: boolean }) {
  const [name, setName] = useState(form.name);
  const [pin, setPin] = useState("");
  return (
    <View style={{ gap: 14 }}>
      <T v="eyebrow">{form.id ? "Change this caregiver" : "Add a caregiver"}</T>
      <Field label="Name" value={name} onChangeText={setName} placeholder="For example: Dana R." autoComplete="off" autoCorrect={false} returnKeyType="next" />
      <Field
        label={form.id ? "New 4-digit PIN (leave empty to keep the current one)" : "Choose a 4-digit PIN"}
        value={pin}
        onChangeText={v => setPin(v.replace(/\D/g, "").slice(0, 4))}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={4}
        autoComplete="off"
        hint="They type this PIN when they start a shift, so nobody records under someone else's name by mistake."
      />
      <Row wrap gap={10}>
        <Button kind="primary" big title={form.id ? "Save" : "Add caregiver"} onPress={() => cgSave(name, pin)} />
        {cancellable ? <Button big title="Cancel" onPress={cgCancel} /> : null}
      </Row>
    </View>
  );
}
