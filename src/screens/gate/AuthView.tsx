// Port of the PWA's authView (views.js ~485-502): sign in / sign up, or (practice mode) a caregiver/family
// role choice.
import { useState } from "react";
import { View } from "react-native";

import { APP_NAME, DEMO } from "@/lib/config";
import { demoSignIn, resetPassword, submitAuth, toggleAuthMode } from "@/state/actions";
import { useApp } from "@/state/app";
import { Button, Field, Row, Seg, T } from "@/ui/primitives";
import { useTheme } from "@/ui/theme";
import { ErrorText, GateLayout, LinkButton } from "./parts";

export function AuthView() {
  const t = useTheme();
  const authMode = useApp(s => s.authMode);
  const authError = useApp(s => s.authError);
  const authBusy = useApp(s => s.authBusy);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  if (DEMO) {
    return (
      <GateLayout>
        <T v="title">{APP_NAME}</T>
        <T color={t.c.mute}>
          This is practice mode. Nothing is sent anywhere — everything stays on this device. Choose who you&apos;d like to be:
        </T>
        <Button kind="primary" big title="The care iPad · caregivers start shifts here" onPress={() => demoSignIn("caregiver")} />
        <Button big title="Family · Ellen (on a phone)" onPress={() => demoSignIn("family")} />
      </GateLayout>
    );
  }

  const up = authMode === "signup";
  const submit = () => submitAuth(email, password);

  return (
    <GateLayout>
      <T v="title">{APP_NAME}</T>
      <T color={t.c.mute}>
        {up
          ? "Setting up the care iPad? Create one account for the person being cared for. Caregivers don't need their own. Family: use the email address you were invited with."
          : "Sign in to see how things are going. On the care iPad, sign in once with the account for the person being cared for and it stays signed in."}
      </T>
      <View style={{ gap: 14 }}>
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
        />
        <View style={{ gap: 6 }}>
          <T v="label" accessibilityElementsHidden importantForAccessibility="no">{up ? "Choose a password (at least 6 characters)" : "Password"}</T>
          <Row gap={8}>
            <Field
              style={{ flex: 1 }}
              value={password}
              onChangeText={setPassword}
              accessibilityLabel={up ? "Choose a password (at least 6 characters)" : "Password"}
              secureTextEntry={!showPw}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete={up ? "new-password" : "current-password"}
              textContentType={up ? "newPassword" : "password"}
              returnKeyType="go"
              onSubmitEditing={submit}
            />
            <Seg title={showPw ? "Hide" : "Show"} on={showPw} onPress={() => setShowPw(v => !v)} accessibilityLabel={showPw ? "Hide password" : "Show password"} />
          </Row>
        </View>
        <ErrorText>{authError}</ErrorText>
        <Button kind="primary" big disabled={authBusy} title={authBusy ? "One moment…" : up ? "Create my account" : "Sign in"} onPress={submit} />
      </View>
      <LinkButton title={up ? "I already have an account" : "New here? Create an account"} onPress={toggleAuthMode} />
      {up ? null : <LinkButton title="I forgot my password" onPress={() => resetPassword(email)} />}
    </GateLayout>
  );
}
