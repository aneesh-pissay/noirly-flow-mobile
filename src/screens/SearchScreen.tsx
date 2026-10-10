import React, { useEffect, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Badge,
  Card,
  EmptyState,
  Input,
  ListRow,
  ListSeparator,
  Text,
} from "@noirly-dev/ui-native";
import { api } from "../api/client";
import { can } from "../permissions";
import { colors, spacing } from "../theme";
import { StatusBadge } from "../ui/TaskBadges";
import type { Task, Workspace } from "../types";
import type { MainTabParamList, SearchStackParamList } from "../navigation/types";
import { useWorkspace } from "../workspace/WorkspaceContext";

type SearchNav = CompositeNavigationProp<
  NativeStackNavigationProp<SearchStackParamList, "SearchHome">,
  BottomTabNavigationProp<MainTabParamList>
>;

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Text variant="monoLabel" tone="muted" style={styles.groupLabel}>
        {label}
      </Text>
      <Card variant="flat">{children}</Card>
    </View>
  );
}

/**
 * The web command palette (Cmd+K) as a tab: create a task or project from what
 * you typed, jump to Inbox / Activity / Settings / a workspace, or open a
 * search hit. Search is debounced and starts at two characters, as on web.
 */
export function SearchScreen() {
  const navigation = useNavigation<SearchNav>();
  const {
    workspaceId,
    role,
    workspaces: knownWorkspaces,
    projects,
    activeProjectId,
    setWorkspaces: setKnownWorkspaces,
    setWorkspaceId,
    setRole,
    setProjects,
    setActiveProjectId,
  } = useWorkspace();
  const [q, setQ] = useState("");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);

  const query = q.trim();
  const canCreateTask = Boolean(workspaceId && role && can(role, "task.write"));
  const canCreateProject = Boolean(workspaceId && role && can(role, "project.write"));

  useEffect(() => {
    if (knownWorkspaces.length === 0) {
      void api
        .listWorkspaces()
        .then((res) => setKnownWorkspaces(res.workspaces))
        .catch(() => undefined);
    }
  }, [knownWorkspaces.length, setKnownWorkspaces]);

  useEffect(() => {
    if (query.length < 2) {
      setWorkspaces([]);
      setTasks([]);
      setSearching(false);
      return;
    }
    const current = ++seq.current;
    setSearching(true);
    const timer = setTimeout(() => {
      void api
        .search(query)
        .then((data) => {
          if (current !== seq.current) return;
          setWorkspaces(data.workspaces);
          setTasks(data.tasks);
        })
        .catch((error) => {
          if (current !== seq.current) return;
          Alert.alert(
            "Search failed",
            error instanceof Error ? error.message : "Unknown error",
          );
        })
        .finally(() => {
          if (current === seq.current) setSearching(false);
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  async function selectWorkspace(id: string) {
    const detail = await api.getWorkspace(id);
    setWorkspaceId(detail.workspace.id);
    setRole(detail.workspace.role);
    setProjects(detail.projects);
    setActiveProjectId(detail.projects[0]?.id ?? null);
    return detail;
  }

  function openWorkspace(workspace: Workspace) {
    void (async () => {
      try {
        await selectWorkspace(workspace.id);
      } catch {
        // Navigating anyway is deliberate: the screen loads its own detail.
      } finally {
        navigation.navigate("Workspace", {
          workspaceId: workspace.id,
          workspaceName: workspace.name,
        });
      }
    })();
  }

  async function createTask() {
    if (!workspaceId || !query) return;
    setBusy(true);
    try {
      // Same rule as the web palette: into the open project, else the Inbox.
      const projectId =
        activeProjectId && projects.some((p) => p.id === activeProjectId)
          ? activeProjectId
          : null;
      const { task } = await api.createTask(workspaceId, { title: query, projectId });
      setQ("");
      navigation.navigate("Task", { workspaceId, taskId: task.id });
    } catch (error) {
      Alert.alert("Create failed", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  async function createProject() {
    if (!workspaceId || !query) return;
    setBusy(true);
    try {
      const { project } = await api.createProject(workspaceId, { name: query });
      setProjects([...projects, project]);
      setActiveProjectId(project.id);
      setQ("");
      navigation.navigate("BoardTab", { screen: "BoardHome" });
    } catch (error) {
      Alert.alert(
        "Create project failed",
        error instanceof Error ? error.message : "Unknown error",
      );
    } finally {
      setBusy(false);
    }
  }

  const activeProjectName = projects.find((p) => p.id === activeProjectId)?.name;
  const projectNameById = new Map(projects.map((p) => [p.id, p.name]));
  const showJump = query.length === 0;

  return (
    <View style={styles.root}>
      <View style={styles.searchBar}>
        <Input
          testID="search-input"
          placeholder="Create a task, search, or jump…"
          value={q}
          onChangeText={setQ}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>
      <ScrollView
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
      >
        {query && (canCreateTask || canCreateProject) ? (
          <Group label="Create">
            {canCreateTask ? (
              <ListRow
                title={`Create task “${query}”`}
                subtitle={activeProjectName ? `In ${activeProjectName}` : "In Inbox"}
                onPress={busy ? undefined : () => void createTask()}
              />
            ) : null}
            {canCreateTask && canCreateProject ? <ListSeparator /> : null}
            {canCreateProject ? (
              <ListRow
                title={`Create project “${query}”`}
                onPress={busy ? undefined : () => void createProject()}
              />
            ) : null}
          </Group>
        ) : null}

        {showJump ? (
          <Group label="Jump to">
            <ListRow
              title="Inbox"
              onPress={() => navigation.navigate("InboxTab", { screen: "InboxHome" })}
            />
            {workspaceId ? (
              <>
                <ListSeparator />
                <ListRow
                  title="Activity"
                  onPress={() =>
                    navigation.navigate("MenuTab", {
                      screen: "Activity",
                      params: { workspaceId },
                    })
                  }
                />
              </>
            ) : null}
            <ListSeparator />
            <ListRow
              title="Settings"
              onPress={() => navigation.navigate("MenuTab", { screen: "Settings" })}
            />
          </Group>
        ) : null}

        {showJump && knownWorkspaces.length > 0 ? (
          <Group label="Workspaces">
            {knownWorkspaces.map((workspace, index) => (
              <View key={workspace.id}>
                {index > 0 ? <ListSeparator /> : null}
                <ListRow
                  title={workspace.name}
                  trailing={
                    <Badge
                      label={workspace.kind}
                      tone={workspace.id === workspaceId ? "accent" : "neutral"}
                      dot={workspace.id === workspaceId}
                    />
                  }
                  onPress={() => openWorkspace(workspace)}
                />
              </View>
            ))}
          </Group>
        ) : null}

        {workspaces.length > 0 ? (
          <Group label="Workspaces">
            {workspaces.map((workspace, index) => (
              <View key={workspace.id}>
                {index > 0 ? <ListSeparator /> : null}
                <ListRow
                  title={workspace.name}
                  trailing={<Badge label={workspace.kind} />}
                  onPress={() => openWorkspace(workspace)}
                />
              </View>
            ))}
          </Group>
        ) : null}

        {tasks.length > 0 ? (
          <Group label="Tasks">
            {tasks.map((task, index) => (
              <View key={task.id} testID={`search-task-${task.title}`}>
                {index > 0 ? <ListSeparator /> : null}
                <ListRow
                  title={task.title}
                  subtitle={
                    task.projectId
                      ? projectNameById.get(task.projectId) ?? "Project"
                      : "Inbox"
                  }
                  trailing={<StatusBadge status={task.status} />}
                  onPress={() =>
                    navigation.navigate("Task", {
                      workspaceId: task.workspaceId,
                      taskId: task.id,
                    })
                  }
                />
              </View>
            ))}
          </Group>
        ) : null}

        {query.length >= 2 && !searching && !workspaces.length && !tasks.length ? (
          <EmptyState
            title="Nothing matched"
            description="Try a shorter query, or part of a task title."
          />
        ) : null}
        {query.length === 1 ? (
          <Text variant="meta" tone="muted" style={styles.hint}>
            Keep typing to search…
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  searchBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.xl },
  group: { gap: spacing.sm },
  groupLabel: { paddingHorizontal: spacing.xs },
  hint: { paddingHorizontal: spacing.xs },
});
