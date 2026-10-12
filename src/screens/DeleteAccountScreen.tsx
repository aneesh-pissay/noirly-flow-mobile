import React, { useState } from "react";
import { Alert, Linking, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Button, Card, FormField, Input, Screen, Text } from "@noirly-dev/ui-native";
import { useAuth } from "../auth/AuthContext";
import { deleteNoirlyAccount, DeleteAccountError } from "../auth/deleteAccount";
import { setMe } from "../auth/useMe";
import { config } from "../config";
import { spacing } from "../theme";
import type { MenuStackParamList } from "../navigation/types";

const DELETED = [
  "Your Noirly account: name, email, password and Google sign-in",
  "Your personal workspace with all its projects, tasks and comments",
  "Team workspaces where you are the only member",
  "Your comments and activity in workspaces you share",
];

/**
 * Menu → Delete account. Required by Google Play for apps with sign-up: the
 * account and its data can be deleted from inside the app. Confirms with the
 * password, or the email for Google-only accounts.
 */
export function DeleteAccountScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MenuStackParamList, "DeleteAccount">>();
  const { session, setSession } = useAuth();
  const email = session?.user.email ?? "";
  const hasPassword = session?.user.hasPassword ?? true;
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = hasPassword ? value.length > 0 : value.trim().toLowerCase() === email.toLowerCase();

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteNoirlyAccount(hasPassword ? { password: value } : { confirmEmail: value.trim() });
      setMe(null);
      // Back to the login screen; the account no longer exists.
      setSession(null);
      Alert.alert("Account deleted", "Your Noirly account and your Noirly Flow data have been deleted.");
    } catch (e) {
      setError(e instanceof DeleteAccountError ? e.message : "Could not delete the account. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const confirm = () =>
    Alert.alert(
      "Delete your account?",
      "This permanently deletes your Noirly account and your Noirly Flow data. It cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => void run() },
      ],
    );

  return (
    <Screen scroll contentStyle={styles.content}>
      <Text variant="sectionTitle">Delete your Noirly account</Text>
      <Text variant="copy" tone="secondary">
        Signed in as {email}. Deleting your account happens straight away and cannot be undone.
      </Text>

      <Card variant="flat" style={styles.card}>
        <Text variant="monoLabel" tone="muted">
          What is deleted
        </Text>
        {DELETED.map((line) => (
          <Text key={line} variant="copy">
            • {line}
          </Text>
        ))}
        <Text variant="meta" tone="muted">
          Tasks you created in a team workspace others still use stay with the team, without your name. If you own it,
          another member becomes the owner.
        </Text>
      </Card>

      <FormField
        label={hasPassword ? "Password" : "Type your email to confirm"}
        hint={hasPassword ? undefined : email}
        error={error ?? undefined}
      >
        <Input
          testID="delete-account-confirm"
          value={value}
          onChangeText={setValue}
          secureTextEntry={hasPassword}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={hasPassword ? "current-password" : "off"}
          keyboardType={hasPassword ? "default" : "email-address"}
          placeholder={hasPassword ? "Your password" : email}
          invalid={Boolean(error)}
        />
      </FormField>

      <Button
        testID="delete-account-submit"
        label="Delete account"
        variant="destructive"
        onPress={confirm}
        disabled={!ready || busy}
        loading={busy}
        fullWidth
      />

      <View style={styles.links}>
        <Button
          label="Privacy policy"
          variant="ghost"
          size="sm"
          onPress={() => navigation.navigate("PrivacyPolicy")}
        />
        <Button
          label="Delete on the web instead"
          variant="ghost"
          size="sm"
          onPress={() => void Linking.openURL(`${config.identityIssuer}/delete-account`)}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
  card: { padding: spacing.lg, gap: spacing.sm },
  links: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.sm },
});
