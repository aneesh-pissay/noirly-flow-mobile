import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { Button, Card, Input, Text, useTheme } from "@noirly-dev/ui-native";
import { errorMessage, isEmail, requestPasswordReset } from "../../auth/accountApi";
import type { RootStackParamList } from "../../navigation/types";
import { spacing } from "../../theme";
import {
  AuthGlyph,
  AuthHeading,
  AuthScaffold,
  Field,
  TextLink,
} from "../../ui/auth/AuthScaffold";

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Ask Identity for a reset email, then explain what to do with it. */
export function ForgotPasswordScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, "ForgotPassword">>();
  const tokens = useTheme();
  const [email, setEmail] = useState(route.params?.email ?? "");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailError = touched && !isEmail(email) ? "Enter a valid email address." : null;

  async function submit() {
    setTouched(true);
    setError(null);
    if (!isEmail(email)) return;
    setBusy(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(errorMessage(err, "Could not send the reset email"));
    } finally {
      setBusy(false);
    }
  }

  const backToSignIn = (
    <TextLink
      testID="forgot-back-to-sign-in"
      label="Remembered it?"
      emphasis="Back to sign in"
      onPress={() => navigation.navigate("Login", { email: email.trim() || undefined })}
    />
  );

  if (sent) {
    return (
      <AuthScaffold
        context="Noirly · Password reset"
        onBack={() => setSent(false)}
        footer={backToSignIn}
      >
        <AuthGlyph icon="email-fast-outline" />
        <AuthHeading
          title="Check your email"
          lede={
            <>
              {"If an account exists for "}
              <Text variant="body" weight="600">
                {email.trim()}
              </Text>
              {", a link to set a new password is on its way."}
            </>
          }
        />
        <Card variant="flat" style={styles.card}>
          <Step n="01" text="Open the email from Noirly." />
          <Step n="02" text="Copy the reset link (long-press it, then Copy link)." />
          <Step n="03" text="Paste it here and choose a new password." />
        </Card>
        <Button
          testID="forgot-have-link"
          label="I have the link"
          onPress={() => navigation.navigate("ResetPassword")}
          size="lg"
          fullWidth
        />
        <Button
          testID="forgot-resend"
          label="Send again"
          variant="ghost"
          onPress={() => void submit()}
          loading={busy}
          disabled={busy}
          size="lg"
          fullWidth
        />
        <Text variant="meta" tone="muted" style={styles.center}>
          You can also open the link on this phone and finish in the browser.
        </Text>
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold
      context="Noirly · Password reset"
      onBack={() => navigation.goBack()}
      footer={backToSignIn}
    >
      <AuthGlyph icon="key-variant" />
      <AuthHeading
        title="Reset your password"
        lede="Enter the email on your Noirly account and we'll send a link to set a new one."
      />
      <Field label="Email" error={emailError}>
        <Input
          testID="forgot-email"
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          autoFocus={!email}
          invalid={Boolean(emailError)}
          returnKeyType="send"
          onSubmitEditing={() => void submit()}
          leading={<MaterialDesignIcons name="email-outline" size={18} color={tokens.color.textMuted} />}
        />
      </Field>
      {error ? (
        <Text variant="copy" tone="destructive" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Button
          testID="forgot-submit"
          label="Send reset link"
          onPress={() => void submit()}
          loading={busy}
          disabled={busy}
          size="lg"
          fullWidth
        />
        <TextLink
          testID="forgot-have-link-quiet"
          label="I already have a reset link"
          onPress={() => navigation.navigate("ResetPassword")}
        />
      </View>
    </AuthScaffold>
  );
}

export function Step({ n, text }: { n: string; text: string }) {
  const tokens = useTheme();
  return (
    <View style={styles.step}>
      <View style={[styles.stepNo, { backgroundColor: tokens.color.surface2, borderRadius: tokens.radius.xs }]}>
        <Text variant="meta" tone="accent" weight="600">
          {n}
        </Text>
      </View>
      <Text variant="copy" tone="secondary" style={styles.stepText}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
  card: { padding: spacing.lg, gap: spacing.md },
  step: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  stepNo: { minWidth: 36, paddingVertical: 4, alignItems: "center" },
  stepText: { flex: 1 },
  center: { textAlign: "center" },
});
