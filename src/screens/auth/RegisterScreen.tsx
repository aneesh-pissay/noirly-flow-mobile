import React, { useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { Button, Input, Text, useTheme } from "@noirly-dev/ui-native";
import { errorMessage, isEmail, isPasswordStrong } from "../../auth/accountApi";
import { NoirlyIdentity } from "../../auth/identity";
import { useGoogleSignIn } from "../../auth/useGoogleSignIn";
import { config } from "../../config";
import type { RootStackParamList } from "../../navigation/types";
import { spacing } from "../../theme";
import {
  AuthHeading,
  AuthScaffold,
  Field,
  OrDivider,
  PasswordInput,
  PasswordRules,
  TextLink,
} from "../../ui/auth/AuthScaffold";

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * Create a Noirly account. Identity requires a verified email before a
 * password sign-in, so the session the register call returns is discarded and
 * the person is sent to verify first — the same order as the web.
 */
export function RegisterScreen() {
  const navigation = useNavigation<Nav>();
  const tokens = useTheme();
  const google = useGoogleSignIn();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailError = touched && !isEmail(email) ? "Enter a valid email address." : null;
  const nameError =
    touched && (!firstName.trim() || !lastName.trim()) ? "Enter your first and last name." : null;
  const passwordError =
    touched && !isPasswordStrong(password) ? "Meet all four rules below." : null;

  async function submit() {
    setTouched(true);
    setError(null);
    if (!firstName.trim() || !lastName.trim() || !isEmail(email) || !isPasswordStrong(password)) {
      return;
    }
    setBusy(true);
    try {
      await NoirlyIdentity.register({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      // Not signed in until the address is verified.
      await NoirlyIdentity.signOut().catch(() => undefined);
      navigation.replace("VerifyEmail", { email: email.trim() });
    } catch (err) {
      setError(errorMessage(err, "Could not create the account"));
    } finally {
      setBusy(false);
    }
  }

  const identityHost = config.identityIssuer.replace(/\/$/, "");

  return (
    <AuthScaffold
      context="Noirly · Create account"
      onBack={() => navigation.goBack()}
      footer={
        <TextLink
          testID="register-sign-in"
          label="Already have an account?"
          emphasis="Sign in"
          onPress={() => navigation.navigate("Login", { email: email.trim() || undefined })}
        />
      }
    >
      <AuthHeading
        title="Join Flow"
        lede="One Noirly account works across every Noirly app."
      />

      <View style={styles.row}>
        <Field label="First name" style={styles.half}>
          <Input
            testID="register-first-name"
            placeholder="Alex"
            value={firstName}
            onChangeText={setFirstName}
            autoComplete="given-name"
            textContentType="givenName"
            autoCapitalize="words"
            returnKeyType="next"
          />
        </Field>
        <Field label="Last name" style={styles.half}>
          <Input
            testID="register-last-name"
            placeholder="Vance"
            value={lastName}
            onChangeText={setLastName}
            autoComplete="family-name"
            textContentType="familyName"
            autoCapitalize="words"
            returnKeyType="next"
          />
        </Field>
      </View>
      {nameError ? (
        <Text variant="meta" tone="destructive" style={styles.inlineError}>
          {nameError}
        </Text>
      ) : null}

      <Field label="Email" error={emailError}>
        <Input
          testID="register-email"
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          invalid={Boolean(emailError)}
          returnKeyType="next"
        />
      </Field>

      <Field label="Password" error={passwordError}>
        <PasswordInput
          testID="register-password"
          placeholder="At least 10 characters"
          value={password}
          onChangeText={setPassword}
          autoComplete="new-password"
          textContentType="newPassword"
          invalid={Boolean(passwordError)}
          returnKeyType="go"
          onSubmitEditing={() => void submit()}
        />
        <PasswordRules password={password} />
      </Field>

      {error ? (
        <Text variant="copy" tone="destructive" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Button
          testID="register-submit"
          label="Create account"
          onPress={() => void submit()}
          loading={busy}
          disabled={busy || google.busy}
          size="lg"
          fullWidth
        />
        {google.available ? (
          <>
            <OrDivider />
            <Button
              testID="register-google"
              label="Continue with Google"
              variant="ghost"
              icon={<MaterialDesignIcons name="google" size={18} color={tokens.color.text} />}
              onPress={() => void google.signIn()}
              loading={google.busy}
              disabled={busy || google.busy}
              size="lg"
              fullWidth
            />
          </>
        ) : null}
      </View>

      <Text variant="meta" tone="muted" style={styles.legal}>
        {"Your account is handled by Noirly Identity. See its "}
        <Text
          variant="meta"
          tone="accent"
          onPress={() => void Linking.openURL(`${identityHost}/privacy`)}
          accessibilityRole="link"
        >
          privacy policy
        </Text>
        .
      </Text>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.md },
  half: { flex: 1 },
  inlineError: { marginTop: -spacing.sm },
  actions: { gap: spacing.lg, marginTop: spacing.sm },
  legal: { textAlign: "center" },
});
