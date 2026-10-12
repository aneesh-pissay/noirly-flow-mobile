import React, { useCallback, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Card, EmptyState, SkeletonText } from "@noirly-dev/ui-native";
import { api } from "../api/client";
import { TaskWorkspace } from "../features/task/TaskWorkspace";
import { colors, spacing } from "../theme";
import { useWorkspace } from "../workspace/WorkspaceContext";
import type { InboxStackParamList } from "../navigation/types";

/** Unfiled tasks (`projectId: null`) of the active workspace. */
export function InboxScreen() {
  const route = useRoute();
  const navigation =
    useNavigation<NativeStackNavigationProp<InboxStackParamList>>();
  const routeWorkspaceId = (
    route.params as { workspaceId?: string } | undefined
  )?.workspaceId;
  const {
    workspaceId: ctxWorkspaceId,
    workspaces,
    setWorkspaceId,
    setRole,
    setProjects,
  } = useWorkspace();
  const [workspaceId, setLocalWorkspaceId] = useState<string | null>(
    routeWorkspaceId ?? ctxWorkspaceId,
  );
  const [resolving, setResolving] = useState(!workspaceId);

  const ensureWorkspace = useCallback(async () => {
    const known = routeWorkspaceId ?? ctxWorkspaceId;
    if (known) {
      setLocalWorkspaceId(known);
      setResolving(false);
      return;
    }
    try {
      let list = workspaces;
      if (list.length === 0) {
        const res = await api.listWorkspaces();
        list = res.workspaces;
      }
      const personal = list.find((w) => w.kind === "personal") ?? list[0];
      if (!personal) {
        setLocalWorkspaceId(null);
        return;
      }
      const detail = await api.getWorkspace(personal.id);
      setWorkspaceId(detail.workspace.id);
      setRole(detail.workspace.role);
      setProjects(detail.projects);
      setLocalWorkspaceId(detail.workspace.id);
    } catch (error) {
      Alert.alert(
        "Load inbox failed",
        error instanceof Error ? error.message : "Unknown error",
      );
    } finally {
      setResolving(false);
    }
  }, [
    routeWorkspaceId,
    ctxWorkspaceId,
    workspaces,
    setWorkspaceId,
    setRole,
    setProjects,
  ]);

  useFocusEffect(
    useCallback(() => {
      void ensureWorkspace();
    }, [ensureWorkspace]),
  );

  if (resolving) {
    return (
      <View style={styles.root}>
        <Card variant="flat" style={styles.loadingCard}>
          <SkeletonText lines={6} />
        </Card>
      </View>
    );
  }

  if (!workspaceId) {
    return (
      <View style={styles.root}>
        <EmptyState
          title="No workspace yet"
          description="Create one from the Menu tab and your inbox will fill up here."
        />
      </View>
    );
  }

  return (
    <TaskWorkspace
      workspaceId={workspaceId}
      projectId={null}
      projectName="Inbox"
      topInset
      onOpenTask={(taskId) => navigation.navigate("Task", { workspaceId, taskId })}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loadingCard: { margin: spacing.lg, padding: spacing.lg },
});
