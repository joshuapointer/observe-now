// Sign in or sign up with email and password, or Sign in with Apple (iOS); in practice mode, a caregiver/family
// role choice instead.
import * as AppleAuthentication from "expo-apple-authentication";
import { useEffect, useState } from "react";
import { YStack } from "tamagui";

import { APP_NAME, DEMO } from "@/lib/config";
import {
  demoSignIn, resetPassword, signInWithApple, submitAuth, toggleAuthMode,
} from "@/state/actions";
import { useApp } from "@/state/app";
import { Button, Field, Row, Rule, Seg, T } from "@/ui/primitives";
import { useNight } from "@/ui/theme";
import { ErrorText, GateLayout, LinkButton } from "./parts";

export function AuthView() {
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
        <T color="$color11">
          Practice mode. Nothing leaves this device. Who would you like to be?
        </T>
        <Button kind="primary" big title="The care device" onPress={() => demoSignIn("caregiver")} />
        <Button big title="Family (Ellen)" onPress={() => demoSignIn("family")} />
      </GateLayout>
    );
  }

  const up = authMode === "signup";
  const submit = () => submitAuth(email, password);

  return (
    <GateLayout>
      <T v="title">{APP_NAME}</T>
      <T color="$color11">
        {up
          ? "One account for the person being cared for, signed in on the phones and tablets caregivers share. Family: use the email you were invited with."
          : "Welcome back."}
      </T>
      <YStack gap={14}>
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
        <YStack gap={6}>
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
        </YStack>
        <ErrorText>{authError}</ErrorText>
        <Button kind="primary" big disabled={authBusy} title={authBusy ? "One moment…" : up ? "Create my account" : "Sign in"} onPress={submit} />
      </YStack>
      <LinkButton title={up ? "I already have an account" : "New here? Create an account"} onPress={toggleAuthMode} />
      {up ? null : <LinkButton title="I forgot my password" onPress={() => resetPassword(email)} />}
      <AppleSignIn />
    </GateLayout>
  );
}

// Sign in with Apple, below a rule, on devices that offer it (iOS); nothing elsewhere.
function AppleSignIn() {
  const night = useNight();
  const authBusy = useApp(s => s.authBusy);
  const [apple, setApple] = useState(false);
  useEffect(() => { AppleAuthentication.isAvailableAsync().then(setApple, () => setApple(false)); }, []);
  if (!apple) return null;

  return (
    <YStack gap={12}>
      <Rule />
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={night ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={16}
        style={{ height: 56, opacity: authBusy ? 0.5 : 1 }}
        onPress={() => { if (!authBusy) signInWithApple(); }}
      />
    </YStack>
  );
}
