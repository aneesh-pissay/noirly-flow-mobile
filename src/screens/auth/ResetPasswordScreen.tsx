import React, { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { Button, Input, Text, useTheme } from "@noirly-dev/ui-native";
import {
  errorMessage,
  extractResetToken,
  isPasswordStrong,
  resetPassword,
} from "../../auth/accountApi";
import type { RootStackParamList } from "../../navigation/types";
import { spacing } from "../../theme";
import {
  AuthGlyph,
  AuthHeading,
  AuthScaffold,
  Field,
  PasswordInput,
  PasswordRules,
  TextLink,
} from "../../ui/auth/AuthScaffold";

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Paste the link from the reset email and choose a new password. */
export function ResetPasswordScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, "ResetPassword">>();
  const tokens = useTheme();
  const [link, setLink] = useState(route.params?.token ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = extractResetToken(link);
  const linkError = touched && !token ? "Paste the whole link from the reset email." : null;
  const passwordError =
    touched && !isPasswordStrong(password) ? "Meet all four rules below." : null;
  const confirmError =
    touched && confirm !== password ? "The passwords don't match." : null;

  async function submit() {
    setTouched(true);
    setError(null);
    if (!token || !isPasswordStrong(password) || confirm !== password) return;
    setBusy(true);
    try {
      await resetPassword(token, password);
      Alert.alert("Password updated", "Sign in with your new password.");
      navigation.navigate("Login");
    } catch (err) {
      setError(
        errorMessage(err, "Could not update the password") +
          " If the link has expired, ask for a new one.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScaffold
      context="Noirly · Password reset"
      onBack={() => navigation.goBack()}
    >
      <AuthGlyph icon="lock-reset" />
      <AuthHeading
        title="Set a new password"
        lede="Create a strong password to get back into your Noirly account."
      />

      <Field label="Reset link" error={linkError}>
        <Input
          testID="reset-link"
          placeholder="Paste the link from the email"
          value={link}
          onChangeText={setLink}
          autoCapitalize="none"
          autoCorrect={false}
          invalid={Boolean(linkError)}
          leading={<MaterialDesignIcons name="link-variant" size={18} color={tokens.color.textMuted} />}
          trailing={
            token ? (
              <MaterialDesignIcons
                name="check-circle-outline"
                size={20}
                color={tokens.color.accent}
                accessibilityLabel="Link recognised"
              />
            ) : undefined
          }
        />
        {!linkError ? (
          <Text variant="meta" tone={token ? "accent" : "muted"}>
            {token ? "Link recognised" : "Long-press the link in the email, copy it, then paste it here."}
          </Text>
        ) : null}
      </Field>

      <Field label="New password" error={passwordError}>
        <PasswordInput
          testID="reset-password"
          placeholder="At least 10 characters"
          value={password}
          onChangeText={setPassword}
          autoComplete="new-password"
          textContentType="newPassword"
          invalid={Boolean(passwordError)}
        />
      </Field>
      <Field label="Confirm password" error={confirmError}>
        <PasswordInput
          testID="reset-confirm"
          placeholder="Type it again"
          value={confirm}
          onChangeText={setConfirm}
          autoComplete="new-password"
          textContentType="newPassword"
          invalid={Boolean(confirmError)}
          returnKeyType="go"
          onSubmitEditing={() => void submit()}
        />
      </Field>
      <PasswordRules password={password} />

      {error ? (
        <Text variant="copy" tone="destructive" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Button
          testID="reset-submit"
          label="Update password"
          onPress={() => void submit()}
          loading={busy}
          disabled={busy}
          size="lg"
          fullWidth
        />
        <TextLink
          label="Need a new link?"
          emphasis="Send another"
          onPress={() => navigation.navigate("ForgotPassword")}
        />
        <TextLink
          label="Remember your old password?"
          emphasis="Back to sign in"
          onPress={() => navigation.navigate("Login")}
        />
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm, marginTop: spacing.sm },
});
