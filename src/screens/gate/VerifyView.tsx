// Port of the PWA's verifyView (views.js ~504-510).
import { View } from "react-native";

import { refreshVerification, resendVerification, signOut } from "@/state/actions";
import { useApp } from "@/state/app";
import { Button, T } from "@/ui/primitives";
import { useTheme } from "@/ui/theme";
import { ErrorText, GateLayout, LinkButton, Steps } from "./parts";

export function VerifyView() {
  const t = useTheme();
  const email = useApp(s => s.user?.email ?? "");
  const authError = useApp(s => s.authError);

  return (
    <GateLayout>
      <T v="title">Check your email</T>
      <T color={t.c.mute}>
        We&apos;ve sent a message to <T weight="heavy" color={t.c.ink}>{email}</T>. To finish signing up:
      </T>
      <Steps
        items={[
          "Open the email (check your spam folder if it isn't there).",
          "Tap the link inside it.",
          "Come back here and press the button below.",
        ]}
      />
      <ErrorText>{authError}</ErrorText>
      <View style={{ gap: 8 }}>
        <Button kind="primary" big title="I've tapped the link" onPress={refreshVerification} />
        <LinkButton title="Send the email again" onPress={resendVerification} />
        <LinkButton title="Use a different email" onPress={signOut} />
      </View>
    </GateLayout>
  );
}
