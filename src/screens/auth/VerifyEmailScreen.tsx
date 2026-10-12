import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Button, Card, Text } from "@noirly-dev/ui-native";
import { errorMessage, resendVerification } from "../../auth/accountApi";
import type { RootStackParamList } from "../../navigation/types";
import { spacing } from "../../theme";
import { AuthGlyph, AuthScaffold, TextLink } from "../../ui/auth/AuthScaffold";
import { Step } from "./ForgotPasswordScreen";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const DEFAULT_COOLDOWN = 60;

function clock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * After sign-up, or a sign-in refused with `email_not_verified`. The link in
 * the email opens Identity in the browser; once it is clicked, signing in here
 * works.
 */
export function VerifyEmailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, "VerifyEmail">>();
  const email = route.params.email;
  const [cooldown, setCooldown] = useState(DEFAULT_COOLDOWN);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function resend() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await resendVerification(email);
      setNotice("Sent. Check your inbox and spam folder.");
      setCooldown(result.cooldownSeconds ?? DEFAULT_COOLDOWN);
    } catch (err) {
      setError(errorMessage(err, "Could not resend the email"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScaffold
      context="Noirly · Verification"
      onBack={() => navigation.navigate("Login", { email })}
      footer={
        <TextLink
          testID="verify-different-email"
          label="Wrong address?"
          emphasis="Use a different email"
          onPress={() => navigation.navigate("Register")}
        />
      }
    >
      <AuthGlyph icon="email-check-outline" round />
      <View style={styles.center}>
        <Text variant="monoLabel" tone="accent" uppercase>
          One more step
        </Text>
        <Text variant="displayLg" style={styles.centerText}>
          Check your inbox
        </Text>
        <Text variant="body" tone="secondary" style={styles.centerText}>
          We sent a verification link to
        </Text>
        <Text testID="verify-email-address" variant="body" weight="600" style={styles.centerText}>
          {email}
        </Text>
      </View>

      <Card variant="flat" style={styles.card}>
        <Step n="01" text="Open the email from Noirly." />
        <Step n="02" text="Tap Verify email in the message." />
        <Step n="03" text="Come back here and sign in." />
      </Card>

      {notice ? (
        <Text variant="copy" tone="positive" style={styles.centerText} accessibilityLiveRegion="polite">
          {notice}
        </Text>
      ) : null}
      {error ? (
        <Text variant="copy" tone="destructive" style={styles.centerText} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Button
          testID="verify-sign-in"
          label="I've verified — sign in"
          onPress={() => navigation.navigate("Login", { email })}
          size="lg"
          fullWidth
        />
        <Button
          testID="verify-resend"
          label={cooldown > 0 ? `Resend email (${clock(cooldown)})` : "Resend email"}
          variant="ghost"
          onPress={() => void resend()}
          loading={busy}
          disabled={busy || cooldown > 0}
          size="lg"
          fullWidth
        />
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", gap: spacing.sm },
  centerText: { textAlign: "center" },
  card: { padding: spacing.lg, gap: spacing.md },
  actions: { gap: spacing.md, marginTop: "auto" },
});
