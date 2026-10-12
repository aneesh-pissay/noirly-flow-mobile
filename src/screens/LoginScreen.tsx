import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { Button, Eyebrow, Input, Text, useTheme } from "@noirly-dev/ui-native";
import { errorMessage, isUnverified } from "../auth/accountApi";
import { NoirlyIdentity } from "../auth/identity";
import { useAuth } from "../auth/AuthContext";
import { useGoogleSignIn } from "../auth/useGoogleSignIn";
import type { RootStackParamList } from "../navigation/types";
import { colors, spacing } from "../theme";
import { BrandMark } from "../ui/BrandMark";
import { Field, OrDivider, PasswordInput, TextLink } from "../ui/auth/AuthScaffold";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, "Login">>();
  const { setSession } = useAuth();
  const tokens = useTheme();
  const google = useGoogleSignIn();
  const prefill = route.params?.email;
  const [busy, setBusy] = useState(false);
  // Coming back from sign-up, verification or a reset lands on the email form.
  const [showEmail, setShowEmail] = useState(Boolean(prefill) || !google.available);
  const [email, setEmail] = useState(prefill ?? "");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (prefill) {
      setEmail(prefill);
      setShowEmail(true);
    }
  }, [prefill]);

  async function submitEmail() {
    if (!email.trim() || !password) {
      Alert.alert("Sign in failed", "Enter your email and password.");
      return;
    }
    setBusy(true);
    try {
      setSession(await NoirlyIdentity.signInWithPassword({ email: email.trim(), password }));
    } catch (err) {
      if (isUnverified(err)) {
        navigation.navigate("VerifyEmail", { email: email.trim() });
        return;
      }
      Alert.alert("Sign in failed", errorMessage(err, "Sign in failed"));
    } finally {
      setBusy(false);
    }
  }

  const anyBusy = busy || google.busy;

  return (
    <SafeAreaView style={styles.root}>
      {/* The app draws edge to edge, so Android's adjustResize no longer
          shrinks the window for the keyboard. Pad for it here and let the
          form scroll, or the fields end up underneath the keyboard. */}
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <ScrollView
          // With the form open, keep it up under the logo rather than pushed
          // to the bottom with a gap above it.
          contentContainerStyle={[styles.scroll, showEmail && styles.scrollTop]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Keyed by mode so switching to the email form mounts a fresh tree.
              Patching the same views from one layout to the other (a button
              gaining an icon, a divider inserted before it) tripped Fabric's
              "Unable to find viewState … for updateLayout" and left the screen
              half drawn. */}
          <View key={showEmail ? "email" : "start"} style={[styles.content, showEmail && styles.scrollTop]}>
          <View style={[styles.hero, showEmail && styles.heroCompact]}>
            <View
              style={[
                styles.logoMark,
                showEmail && styles.logoMarkCompact,
                {
                  backgroundColor: tokens.color.accentSoft,
                  borderColor: tokens.color.hairline,
                  borderRadius: tokens.radius.lg,
                },
              ]}
            >
              <BrandMark size={showEmail ? 40 : 68} color={tokens.color.accent} />
            </View>
            <Eyebrow>Noirly</Eyebrow>
            <Text variant="pageTitle" style={styles.title}>
              {showEmail ? "Sign in to Flow" : "Flow"}
            </Text>
            {showEmail ? null : (
              <Text variant="copy" tone="secondary" style={styles.tagline}>
                Tasks, boards and presence for the whole workspace.
              </Text>
            )}
          </View>

          <View style={styles.actions}>
            {showEmail ? (
              <View style={styles.emailForm}>
                <Field label="Email">
                  <Input
                    testID="login-email"
                    placeholder="you@example.com"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    textContentType="emailAddress"
                    autoFocus={!prefill}
                    returnKeyType="next"
                    value={email}
                    onChangeText={setEmail}
                    leading={
                      <MaterialDesignIcons name="email-outline" size={18} color={tokens.color.textMuted} />
                    }
                  />
                </Field>
                <Field label="Password">
                  <PasswordInput
                    testID="login-password"
                    placeholder="Your password"
                    autoComplete="password"
                    textContentType="password"
                    autoFocus={Boolean(prefill)}
                    returnKeyType="go"
                    onSubmitEditing={() => void submitEmail()}
                    value={password}
                    onChangeText={setPassword}
                  />
                </Field>
                <Pressable
                  testID="login-forgot"
                  onPress={() =>
                    navigation.navigate("ForgotPassword", { email: email.trim() || undefined })
                  }
                  accessibilityRole="button"
                  style={styles.forgot}
                  hitSlop={6}
                >
                  <Text variant="meta" tone="accent">
                    Forgot password?
                  </Text>
                </Pressable>
                <Button
                  testID="login-submit"
                  label="Sign in"
                  onPress={() => void submitEmail()}
                  disabled={anyBusy}
                  loading={busy}
                  size="lg"
                  fullWidth
                />
              </View>
            ) : null}

            {google.available ? (
              <>
                {showEmail ? <OrDivider /> : null}
                <Button
                  testID="login-google"
                  label={showEmail ? "Continue with Google" : "Sign in with Google"}
                  variant={showEmail ? "ghost" : "solid"}
                  icon={
                    showEmail ? (
                      <MaterialDesignIcons name="google" size={18} color={tokens.color.text} />
                    ) : undefined
                  }
                  onPress={() => void google.signIn()}
                  disabled={anyBusy}
                  loading={google.busy}
                  size="lg"
                  fullWidth
                />
              </>
            ) : null}

            {showEmail ? null : (
              <Button
                testID="login-use-email"
                label="Sign in with email"
                variant="ghost"
                icon={<MaterialDesignIcons name="email-outline" size={18} color={tokens.color.text} />}
                onPress={() => setShowEmail(true)}
                disabled={anyBusy}
                size="lg"
                fullWidth
              />
            )}

            <TextLink
              testID="login-register"
              label="New to Noirly?"
              emphasis="Create an account"
              onPress={() => navigation.navigate("Register")}
              disabled={anyBusy}
            />
          </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: { flex: 1 },
  scrollTop: { justifyContent: "flex-start" },
  content: { flexGrow: 1, justifyContent: "space-between" },
  title: { textAlign: "center", alignSelf: "stretch" },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    justifyContent: "space-between",
  },
  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  heroCompact: { flex: 0, paddingTop: spacing.xl, paddingBottom: spacing.xl },
  logoMark: {
    width: 72,
    height: 72,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  logoMarkCompact: { width: 48, height: 48, marginBottom: spacing.sm },
  tagline: {
    textAlign: "center",
    maxWidth: 280,
    marginTop: spacing.xs,
  },
  actions: {
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  emailForm: {
    gap: spacing.md,
  },
  forgot: {
    alignSelf: "flex-end",
    minHeight: 32,
    justifyContent: "center",
    marginTop: -spacing.xs,
  },
});
