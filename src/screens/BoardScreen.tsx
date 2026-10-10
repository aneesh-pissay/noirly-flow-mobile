import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { EmptyState, useTheme } from "@noirly-dev/ui-native";
import { api } from "../api/client";
import { colors } from "../theme";
import { useWorkspace } from "../workspace/WorkspaceContext";
import type { BoardStackParamList } from "../navigation/types";
import { ProjectScreen } from "./ProjectScreen";

/**
 * Board tab root: resolves the active workspace's default/current project
 * and renders it in board view (mirrors web sidebar Board href).
 */
export function BoardScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<BoardStackParamList>>();
  const {
    workspaceId,
    workspaces,
    projects,
    activeProjectId,
    setWorkspaceId,
    setRole,
    setProjects,
    setActiveProjectId,
  } = useWorkspace();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function resolve() {
        setError(null);
        try {
          let wsId = workspaceId;
          if (!wsId) {
            let list = workspaces;
            if (list.length === 0) {
              const res = await api.listWorkspaces();
              list = res.workspaces;
            }
            const personal =
              list.find((w) => w.kind === "personal") ?? list[0] ?? null;
            if (!personal) {
              if (!cancelled) {
                setReady(false);
                setError("No workspace yet. Create one from Menu.");
              }
              return;
            }
            wsId = personal.id;
            const detail = await api.getWorkspace(wsId);
            if (cancelled) return;
            setWorkspaceId(detail.workspace.id);
            setRole(detail.workspace.role);
            setProjects(detail.projects);
            const first = detail.projects[0] ?? null;
            if (first) setActiveProjectId(first.id);
            if (!first) {
              setReady(false);
              setError("No projects in this workspace.");
              return;
            }
            setReady(true);
            return;
          }

          let list = projects;
          if (list.length === 0) {
            const detail = await api.getWorkspace(wsId);
            if (cancelled) return;
            setRole(detail.workspace.role);
            setProjects(detail.projects);
            list = detail.projects;
          }

          const project =
            list.find((p) => p.id === activeProjectId) ?? list[0] ?? null;
          if (!project) {
            if (!cancelled) {
              setReady(false);
              setError("No projects in this workspace.");
            }
            return;
          }
          if (project.id !== activeProjectId) {
            setActiveProjectId(project.id);
          }
          if (!cancelled) setReady(true);
        } catch (err) {
          if (!cancelled) {
            const message =
              err instanceof Error ? err.message : "Failed to load board";
            setError(message);
            setReady(false);
            Alert.alert("Board", message);
          }
        }
      }

      void resolve();
      return () => {
        cancelled = true;
      };
    }, [
      workspaceId,
      workspaces,
      projects,
      activeProjectId,
      setWorkspaceId,
      setRole,
      setProjects,
      setActiveProjectId,
    ]),
  );

  const tokens = useTheme();
  const project =
    projects.find((p) => p.id === activeProjectId) ?? projects[0] ?? null;

  if (error && !ready) {
    return (
      <View style={styles.center}>
        <EmptyState title="Nothing to show" description={error} />
      </View>
    );
  }

  if (!ready || !workspaceId || !project) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={tokens.color.accent} />
      </View>
    );
  }

  // Ensure nested Task pushes stay on this tab's stack.
  void navigation;

  return (
    <ProjectScreen
      routeParams={{
        workspaceId,
        projectId: project.id,
        projectName: project.name,
        view: "board",
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    padding: 24,
  },
});
