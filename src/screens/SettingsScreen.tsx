import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Card,
  FormField,
  Input,
  ListRow,
  ListSeparator,
  Screen,
  Text,
  useTheme,
} from "@noirly-dev/ui-native";
import { api } from "../api/client";
import { setMe } from "../auth/useMe";
import { config } from "../config";
import { colors, spacing } from "../theme";
import { FilterChip } from "../ui/FilterChip";
import { OptionSheet } from "../ui/Sheet";
import type { FlowMe } from "../types";

/** Same fixed list as the web settings page. */
const TIMEZONES = [
  { value: "", label: "Not set" },
  { value: "UTC", label: "UTC" },
  { value: "America/Los_Angeles", label: "Pacific Time" },
  { value: "America/Denver", label: "Mountain Time" },
  { value: "America/Chicago", label: "Central Time" },
  { value: "America/New_York", label: "Eastern Time" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "Asia/Kolkata", label: "India (Kolkata)" },
  { value: "Asia/Singapore", label: "Singapore" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Australia/Sydney", label: "Sydney" },
];

function timezoneLabel(value: string) {
  return TIMEZONES.find((zone) => zone.value === value)?.label ?? value;
}

export function SettingsScreen() {
  const tokens = useTheme();
  const [me, setLocalMe] = useState<FlowMe | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [title, setTitle] = useState("");
  const [timezone, setTimezone] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickingZone, setPickingZone] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const { user } = await api.me();
        setLocalMe(user);
        setDisplayName(user.profile.displayName ?? "");
        setTitle(user.profile.title ?? "");
        setTimezone(user.profile.timezone ?? "");
        setBio(user.profile.bio ?? "");
      } catch (err) {
        Alert.alert(
          "Load profile failed",
          err instanceof Error ? err.message : "Unknown error",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [saved]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const { user } = await api.updateMe({
        displayName: displayName.trim() || null,
        title: title.trim() || null,
        timezone: timezone.trim() || null,
        bio: bio.trim() || null,
      });
      setLocalMe(user);
      setMe(user);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function openIdentity() {
    const url = `${config.identityIssuer.replace(/\/$/, "")}/account`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Couldn't open Identity", url),
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={tokens.color.accent} />
      </View>
    );
  }

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.section}>
        <Text variant="monoLabel" tone="muted">
          Noirly Identity
        </Text>
        <Card variant="flat">
          <ListRow title="Name" value={me?.identityName || "—"} />
          <ListSeparator />
          <ListRow title="Email" value={me?.email || "—"} />
        </Card>
        <Text variant="meta" tone="muted">
          Password, Google login, and account details are managed in Identity.
        </Text>
        <Button
          label="Open Identity →"
          variant="ghost"
          size="sm"
          onPress={openIdentity}
          style={styles.left}
        />
      </View>

      <View style={styles.section}>
        <Text variant="monoLabel" tone="muted">
          Noirly Flow profile
        </Text>
        <Text variant="meta" tone="muted">
          Optional. Used in boards, comments, and members here. Other Noirly
          products keep their own profiles.
        </Text>
      </View>

      <FormField label="Display name">
        <Input
          testID="settings-display-name"
          placeholder={me?.identityName || "How you appear in Flow"}
          value={displayName}
          onChangeText={setDisplayName}
          maxLength={80}
        />
      </FormField>

      <FormField label="Title">
        <Input
          placeholder="Role or title in this workspace"
          value={title}
          onChangeText={setTitle}
          maxLength={80}
        />
      </FormField>

      <FormField label="Timezone">
        <FilterChip
          label={timezoneLabel(timezone)}
          active={Boolean(timezone)}
          onPress={() => setPickingZone(true)}
        />
      </FormField>

      <FormField label="Bio">
        <Input
          placeholder="A short note about how you work"
          value={bio}
          onChangeText={setBio}
          multiline
          maxLength={280}
          inputStyle={styles.bio}
        />
      </FormField>

      {error ? (
        <Text variant="meta" tone="destructive">
          {error}
        </Text>
      ) : null}

      <Button
        testID="settings-save"
        label={saving ? "Saving…" : saved ? "Saved" : "Save Flow profile"}
        accessibilityLabel={saving ? "Saving" : saved ? "Saved" : "Save Flow profile"}
        onPress={() => void save()}
        loading={saving}
        fullWidth
        size="lg"
      />

      <OptionSheet
        visible={pickingZone}
        title="Timezone"
        options={TIMEZONES}
        value={timezone}
        onSelect={setTimezone}
        onClose={() => setPickingZone(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  section: { gap: spacing.sm },
  left: { alignSelf: "flex-start" },
  bio: {
    minHeight: 96,
    textAlignVertical: "top",
  },
});
