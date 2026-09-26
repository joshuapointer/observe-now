// Port of the PWA's authView (views.js ~485-502): sign in / sign up, or (practice mode) a caregiver/family
// role choice. The app adds Sign in with Apple (iOS) and signing in with a mobile number and a texted code.
import * as AppleAuthentication from "expo-apple-authentication";
import { useEffect, useState } from "react";
import { YStack } from "tamagui";

import { APP_NAME, DEMO } from "@/lib/config";
import {
  confirmPhoneCode, demoSignIn, resetPassword, sendPhoneCode, setAuthMethod, signInWithApple, submitAuth, toggleAuthMode,
} from "@/state/actions";
import { useApp } from "@/state/app";
import { Button, Field, Row, Rule, Seg, T } from "@/ui/primitives";
import { useNight } from "@/ui/theme";
import { ErrorText, GateLayout, LinkButton } from "./parts";

export function AuthView() {
  const authMode = useApp(s => s.authMode);
  const authError = useApp(s => s.authError);
  const authBusy = useApp(s => s.authBusy);
  const authMethod = useApp(s => s.authMethod);
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

  if (authMethod === "phone") return <PhoneSignIn />;

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
      <LinkButton title="Use my mobile number instead" onPress={() => setAuthMethod("phone")} />
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

// The default: mobile number → texted 6-digit code. The same two steps sign up a new person and sign in a
// returning one.
function PhoneSignIn() {
  const authError = useApp(s => s.authError);
  const authBusy = useApp(s => s.authBusy);
  const sentTo = useApp(s => s.phoneSentTo);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");

  return (
    <GateLayout>
      <T v="title">{APP_NAME}</T>
      {sentTo ? (
        <>
          <T color="$color11">
            We&apos;ve texted a 6-digit code to <T weight="heavy" color="$color12">{sentTo}</T>. Type it below.
          </T>
          <YStack gap={14}>
            <Field
              label="Code from the text"
              value={code}
              onChangeText={v => setCode(v.replace(/\D/g, "").slice(0, 6))}
              keyboardType="number-pad"
              autoComplete="sms-otp"
              textContentType="oneTimeCode"
              returnKeyType="go"
              onSubmitEditing={() => confirmPhoneCode(code)}
            />
            <ErrorText>{authError}</ErrorText>
            <Button kind="primary" big disabled={authBusy} title={authBusy ? "One moment…" : "Sign in"} onPress={() => confirmPhoneCode(code)} />
          </YStack>
          <LinkButton title="Send a new code" onPress={() => { setCode(""); sendPhoneCode(sentTo); }} />
          <LinkButton title="Use a different number" onPress={() => { setCode(""); setAuthMethod("phone"); }} />
        </>
      ) : (
        <>
          <T color="$color11">
            Sign in with your mobile number. We&apos;ll text you a code. Family: use the number you were invited with.
          </T>
          <YStack gap={14}>
            <Field
              label="Mobile number"
              hint="Include the country code if you're outside the US or Canada, like +44 7700 900123."
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              returnKeyType="go"
              onSubmitEditing={() => sendPhoneCode(phone)}
            />
            <ErrorText>{authError}</ErrorText>
            <Button kind="primary" big disabled={authBusy} title={authBusy ? "One moment…" : "Text me a code"} onPress={() => sendPhoneCode(phone)} />
          </YStack>
          <AppleSignIn />
        </>
      )}
      <LinkButton title="Use email instead" onPress={() => setAuthMethod("email")} />
    </GateLayout>
  );
}
