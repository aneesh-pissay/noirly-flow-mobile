import React, { useCallback, useState } from "react";
import { RefreshControl, ScrollView, Share, StyleSheet, View } from "react-native";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Button, Card, PageHeader, Text, useTheme } from "@noirly-dev/ui-native";
import { isNativeAvailable, saveTextFile } from "noirly-flow-native";
import { api } from "../api/client";
import { ActivityFeed } from "../features/activity/ActivityFeed";
import type { WorkspaceMember } from "../features/workspace/members";
import { colors, spacing } from "../theme";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Activity">;

/** Workspace audit log with "Load more" and CSV export, like web `/activity`. */
export function ActivityScreen() {
  const route = useRoute<Props["route"]>();
  const tokens = useTheme();
  const { workspaceId } = route.params;
  const [name, setName] = useState("Workspace");
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadMeta = useCallback(async () => {
    const [workspaceRes, membersRes] = await Promise.all([
      api.getWorkspace(workspaceId).catch(() => null),
      api.listMembers(workspaceId).catch(() => null),
    ]);
    if (workspaceRes) setName(workspaceRes.workspace.name);
    if (membersRes) setMembers(membersRes.members);
  }, [workspaceId]);

  useFocusEffect(
    useCallback(() => {
      void loadMeta();
    }, [loadMeta]),
  );

  function fallbackName() {
    const stamp = new Date().toISOString().slice(0, 10);
    const slug =
      name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
      "workspace";
    return `${slug}-activity-${stamp}.csv`;
  }

  /**
   * The web download, as the system "save as" dialog. `share` sends the same
   * CSV to another app instead (mail, chat).
   */
  async function exportCsv(mode: "save" | "share") {
    setExporting(true);
    setError(null);
    setNotice(null);
    try {
      const { csv, filename } = await api.exportActivityCsv(workspaceId);
      const file = filename ?? fallbackName();
      if (mode === "save" && isNativeAvailable) {
        const saved = await saveTextFile(file, csv, "text/csv");
        if (saved) setNotice(`Saved ${file}`);
      } else {
        await Share.share({ title: file, message: csv });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={() => {
            void loadMeta();
            setRefreshKey((key) => key + 1);
          }}
          tintColor={tokens.color.accent}
        />
      }
    >
      <PageHeader
        eyebrow="Audit"
        title={`${name} activity`}
        lead="Workspace-wide create, update, assign, and comment history."
        style={styles.header}
      />
      <View style={styles.actions}>
        <Button
          testID="activity-export"
          label={exporting ? "Exporting…" : "Export CSV"}
          size="sm"
          variant="ghost"
          loading={exporting}
          onPress={() => void exportCsv("save")}
        />
        <Button
          label="Share CSV"
          size="sm"
          variant="ghost"
          disabled={exporting}
          onPress={() => void exportCsv("share")}
        />
      </View>
      {notice ? (
        <Text variant="meta" tone="positive" style={styles.pad}>
          {notice}
        </Text>
      ) : null}
      {error ? (
        <Text variant="meta" tone="destructive" style={styles.pad}>
          {error}
        </Text>
      ) : null}
      <Card variant="flat" style={styles.card}>
        <ActivityFeed
          workspaceId={workspaceId}
          members={members}
          refreshKey={refreshKey}
          showLabel={false}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: spacing.xl, gap: spacing.md },
  header: { paddingTop: spacing.md },
  actions: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg },
  pad: { paddingHorizontal: spacing.lg },
  card: { marginHorizontal: spacing.lg, padding: spacing.lg },
});
