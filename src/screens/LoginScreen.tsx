import React, { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Button,
  Eyebrow,
  FormField,
  Input,
  Text,
  useTheme,
} from "@noirly-dev/ui-native";
import { NoirlyIdentity } from "../auth/identity";
import { useAuth } from "../auth/AuthContext";
import { config } from "../config";
import { colors, spacing } from "../theme";
import type { NoirlySession } from "@noirly-dev/identity-mobile";

let googleConfigured = false;

function ensureGoogle() {
  if (googleConfigured || !config.googleWebClientId) return false;
  GoogleSignin.configure({
    webClientId: config.googleWebClientId,
    offlineAccess: false,
  });
  googleConfigured = true;
  return true;
}

export function LoginScreen() {
  const { setSession } = useAuth();
  const tokens = useTheme();
  const [busy, setBusy] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const googleReady = Boolean(config.googleWebClientId);

  const run = useCallback(
    async (action: () => Promise<NoirlySession>) => {
      setBusy(true);
      try {
        const session = await action();
        setSession(session);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Sign in failed";
        Alert.alert("Sign in failed", message);
      } finally {
        setBusy(false);
      }
    },
    [setSession],
  );

  const signInWithGoogle = useCallback(() => {
    if (!ensureGoogle()) {
      Alert.alert(
        "Google sign-in unavailable",
        "Set googleWebClientId in config to Identity’s GOOGLE_CLIENT_ID.",
      );
      return;
    }
    void run(async () => {
      await GoogleSignin.hasPlayServices();
      const result = await GoogleSignin.signIn();
      const idToken = result.data?.idToken;
      if (!idToken) throw new Error("Google did not return an idToken");
      return NoirlyIdentity.signInWithGoogle({ idToken });
    });
  }, [run]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.hero}>
        <View
          style={[
            styles.logoMark,
            {
              backgroundColor: tokens.color.accentSoft,
              borderColor: tokens.color.hairline,
              borderRadius: tokens.radius.lg,
            },
          ]}
        >
          <Text variant="displayLg" tone="accent">
            N
          </Text>
        </View>
        <Eyebrow>Noirly</Eyebrow>
        <Text variant="pageTitle">Flow</Text>
        <Text variant="copy" tone="secondary" style={styles.tagline}>
          Tasks, boards and presence for the whole workspace.
        </Text>
      </View>

      <View style={styles.actions}>
        {googleReady ? (
          <Button
            label="Sign in with Google"
            onPress={signInWithGoogle}
            disabled={busy}
            loading={busy && !showEmail}
            size="lg"
            fullWidth
          />
        ) : null}

        {showEmail ? (
          <View style={styles.emailForm}>
            <FormField label="Email">
              <Input
                testID="login-email"
                placeholder="you@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
              />
            </FormField>
            <FormField label="Password">
              <Input
                testID="login-password"
                placeholder="••••••••"
                secureTextEntry
                autoComplete="password"
                value={password}
                onChangeText={setPassword}
              />
            </FormField>
            <Button
              testID="login-submit"
              label="Continue with email"
              onPress={() => {
                void run(() =>
                  NoirlyIdentity.signInWithPassword({ email, password }),
                );
              }}
              disabled={busy}
              loading={busy}
              variant={googleReady ? "ghost" : "solid"}
              size="lg"
              fullWidth
              style={styles.emailSubmit}
            />
          </View>
        ) : (
          <Pressable
            disabled={busy}
            onPress={() => setShowEmail(true)}
            style={styles.secondaryLink}
            testID="login-use-email"
            accessibilityRole="button"
          >
            <Text variant="meta" tone="muted">
              {googleReady ? "Use email instead" : "Sign in with email"}
            </Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 20,
    justifyContent: "space-between",
  },
  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  logoMark: {
    width: 72,
    height: 72,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  tagline: {
    textAlign: "center",
    maxWidth: 280,
    marginTop: spacing.xs,
  },
  actions: {
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  emailForm: {
    gap: spacing.md,
  },
  emailSubmit: {
    marginTop: spacing.xs,
  },
  secondaryLink: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
});
