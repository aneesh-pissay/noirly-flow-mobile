import React, { useCallback, useState } from "react";
import { Alert, Linking, ScrollView, StyleSheet, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Input,
  ListRow,
  ListSeparator,
  PageHeader,
  SkeletonText,
  Text,
} from "@noirly-dev/ui-native";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { config } from "../config";
import { can } from "../permissions";
import { colors, spacing } from "../theme";
import type { FlowMe, Project, Workspace } from "../types";
import { useWorkspace } from "../workspace/WorkspaceContext";
import type { MainTabParamList, MenuStackParamList } from "../navigation/types";

type MenuNav = CompositeNavigationProp<
  NativeStackNavigationProp<MenuStackParamList, "MenuHome">,
  BottomTabNavigationProp<MainTabParamList>
>;

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text variant="monoLabel" tone="muted" style={styles.sectionLabel}>
        {label}
      </Text>
      {children}
    </View>
  );
}

export function HomeScreen() {
  const navigation = useNavigation<MenuNav>();
  const { signOut } = useAuth();
  const {
    workspaceId,
    role,
    workspaces,
    projects,
    activeProjectId,
    setWorkspaceId,
    setRole,
    setWorkspaces,
    setProjects,
    setActiveProjectId,
  } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);
  const [me, setMe] = useState<FlowMe | null>(null);

  const activeWorkspace =
    workspaces.find((w) => w.id === workspaceId) ??
    workspaces.find((w) => w.kind === "personal") ??
    workspaces[0] ??
    null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ workspaces: list }, meRes] = await Promise.all([
        api.listWorkspaces(),
        api.me().catch(() => null),
      ]);
      setWorkspaces(list);
      if (meRes) setMe(meRes.user);

      const preferred =
        (workspaceId && list.find((w) => w.id === workspaceId)) ||
        list.find((w) => w.kind === "personal") ||
        list[0] ||
        null;

      if (preferred) {
        const detail = await api.getWorkspace(preferred.id);
        setWorkspaceId(detail.workspace.id);
        setRole(detail.workspace.role);
        setProjects(detail.projects);
        const keep =
          activeProjectId &&
          detail.projects.some((p) => p.id === activeProjectId)
            ? activeProjectId
            : (detail.projects[0]?.id ?? null);
        setActiveProjectId(keep);
      } else {
        setProjects([]);
      }
    } catch (error) {
      Alert.alert(
        "Failed to load workspaces",
        error instanceof Error ? error.message : "Unknown error",
      );
    } finally {
      setLoading(false);
    }
  }, [
    setWorkspaces,
    setWorkspaceId,
    setRole,
    setProjects,
    setActiveProjectId,
    workspaceId,
    activeProjectId,
  ]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function selectWorkspace(workspace: Workspace) {
    try {
      const detail = await api.getWorkspace(workspace.id);
      setWorkspaceId(detail.workspace.id);
      setRole(detail.workspace.role);
      setProjects(detail.projects);
      setActiveProjectId(detail.projects[0]?.id ?? null);
    } catch (error) {
      Alert.alert(
        "Open workspace failed",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  async function createTeam() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const { workspace } = await api.createWorkspace(name.trim());
      setName("");
      await load();
      await selectWorkspace(workspace);
    } catch (error) {
      Alert.alert(
        "Create failed",
        error instanceof Error ? error.message : "Unknown error",
      );
    } finally {
      setCreating(false);
    }
  }

  async function createProject() {
    if (!projectName.trim() || !activeWorkspace) return;
    setCreatingProject(true);
    try {
      const { project } = await api.createProject(activeWorkspace.id, {
        name: projectName.trim(),
      });
      setProjectName("");
      setProjects([...projects, project]);
      openProject(project);
    } catch (error) {
      Alert.alert(
        "Create project failed",
        error instanceof Error ? error.message : "Unknown error",
      );
    } finally {
      setCreatingProject(false);
    }
  }

  function openProject(project: Project) {
    if (!activeWorkspace) return;
    setActiveProjectId(project.id);
    navigation.navigate("BoardTab", { screen: "BoardHome" });
  }

  function openInbox() {
    navigation.navigate("InboxTab", { screen: "InboxHome" });
  }

  if (loading) {
    return (
      <View style={styles.root}>
        <Card variant="flat" style={styles.loadingCard}>
          <SkeletonText lines={8} />
        </Card>
      </View>
    );
  }

  const displayName =
    me?.profile.displayName ?? me?.displayName ?? me?.identityName ?? "You";
  const email = me?.email ?? "";
  const canCreateProject = Boolean(role && can(role, "project.write"));

  return (
    <View style={styles.root}>
      <ScrollView
        testID="menu-scroll"
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <PageHeader
          eyebrow="Noirly"
          title="Flow"
          lead={activeWorkspace ? `Working in ${activeWorkspace.name}.` : undefined}
        />

        <Section label="Workspaces">
          {workspaces.length === 0 ? (
            <Text variant="copy" tone="muted">
              No workspaces yet. Create one below.
            </Text>
          ) : (
            <Card variant="flat">
              {workspaces.map((item, index) => {
                const active = item.id === activeWorkspace?.id;
                return (
                  <View key={item.id}>
                    {index > 0 ? <ListSeparator /> : null}
                    <ListRow
                      title={item.name}
                      trailing={
                        <Badge
                          label={item.kind}
                          tone={active ? "accent" : "neutral"}
                          dot={active}
                        />
                      }
                      onPress={() => void selectWorkspace(item)}
                    />
                  </View>
                );
              })}
            </Card>
          )}

          <View style={styles.create}>
            <Input
              testID="menu-team-input"
              placeholder="New team workspace"
              value={name}
              onChangeText={setName}
              returnKeyType="done"
              onSubmitEditing={() => void createTeam()}
              style={styles.createInput}
            />
            <Button
              label="Create"
              size="sm"
              onPress={() => void createTeam()}
              testID="menu-team-create"
              loading={creating}
            />
          </View>
        </Section>

        <Section label="Projects">
          {!activeWorkspace ? (
            <Text variant="copy" tone="muted">
              Select a workspace first.
            </Text>
          ) : (
            <Card variant="flat">
              <ListRow title="Inbox" onPress={openInbox} />
              {projects.map((project) => (
                <View key={project.id}>
                  <ListSeparator />
                  <ListRow
                    title={project.name}
                    subtitle={project.description ?? undefined}
                    onPress={() => openProject(project)}
                  />
                </View>
              ))}
            </Card>
          )}
          {activeWorkspace && projects.length === 0 ? (
            <Text variant="copy" tone="muted">
              No project boards yet.
            </Text>
          ) : null}
          {activeWorkspace && canCreateProject ? (
            <View style={styles.create}>
              <Input
                testID="menu-project-input"
                placeholder="New project"
                value={projectName}
                onChangeText={setProjectName}
                returnKeyType="done"
                onSubmitEditing={() => void createProject()}
                style={styles.createInput}
              />
              <Button
                label="Create"
                size="sm"
                onPress={() => void createProject()}
                testID="menu-project-create"
                loading={creatingProject}
              />
            </View>
          ) : null}
        </Section>

        <Section label="Navigate">
          <Card variant="flat">
            <ListRow
              title="Settings"
              onPress={() => navigation.navigate("Settings")}
            />
            {activeWorkspace ? (
              <>
                <ListSeparator />
                <ListRow
                  title="Activity"
                  onPress={() =>
                    navigation.navigate("Activity", {
                      workspaceId: activeWorkspace.id,
                    })
                  }
                />
              </>
            ) : null}
            {activeWorkspace ? (
              <>
                <ListSeparator />
                <ListRow
                  title="Members"
                  onPress={() =>
                    navigation.navigate("Members", {
                      workspaceId: activeWorkspace.id,
                    })
                  }
                />
              </>
            ) : null}
          </Card>
        </Section>

        <Section label="Account">
          <Card variant="flat">
            <ListRow
              title={displayName}
              subtitle={email || undefined}
              leading={<Avatar name={displayName} size={36} />}
            />
            <ListSeparator />
            <ListRow
              title="Privacy policy"
              onPress={() => void Linking.openURL(`${config.identityIssuer}/privacy`)}
            />
            <ListSeparator />
            <View testID="menu-delete-account">
              <ListRow
                title="Delete account"
                subtitle="Permanently delete your account and data"
                onPress={() => navigation.navigate("DeleteAccount")}
              />
            </View>
          </Card>
          {/* Sign out was in the header *and* the footer. Once is enough, and
              the footer is where it belongs — next to who you are signed in as. */}
          <Button
            testID="menu-sign-out"
            label="Sign out"
            variant="ghost"
            onPress={() => void signOut()}
            fullWidth
          />
        </Section>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loadingCard: { margin: spacing.lg, padding: spacing.lg },
  scroll: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.xl,
  },
  section: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  sectionLabel: { paddingHorizontal: spacing.xs },
  create: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  createInput: { flex: 1 },
});
