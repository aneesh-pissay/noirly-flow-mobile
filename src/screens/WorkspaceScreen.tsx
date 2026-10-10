import React, { useCallback, useState } from "react";
import { Alert, FlatList, StyleSheet, View } from "react-native";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import {
  Button,
  Card,
  EmptyState,
  Input,
  ListRow,
  ListSeparator,
  PageHeader,
  SkeletonText,
} from "@noirly-dev/ui-native";
import { api } from "../api/client";
import { can } from "../permissions";
import { colors, spacing } from "../theme";
import type { Project } from "../types";
import { useWorkspace } from "../workspace/WorkspaceContext";
import type {
  MainTabParamList,
  MenuStackParamList,
  RootStackParamList,
} from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Workspace">;

type WorkspaceNav = CompositeNavigationProp<
  NativeStackNavigationProp<MenuStackParamList>,
  BottomTabNavigationProp<MainTabParamList>
>;

export function WorkspaceScreen() {
  const route = useRoute<Props["route"]>();
  const navigation = useNavigation<WorkspaceNav>();
  const { workspaceId, workspaceName } = route.params;
  const { role, setRole, setActiveProjectId } = useWorkspace();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getWorkspace(workspaceId);
      setRole(data.workspace.role);
      setProjects(data.projects);
    } catch (error) {
      Alert.alert(
        "Load failed",
        error instanceof Error ? error.message : "Unknown error",
      );
    } finally {
      setLoading(false);
    }
  }, [setRole, workspaceId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function createProject() {
    if (!name.trim()) return;
    try {
      const { project } = await api.createProject(workspaceId, {
        name: name.trim(),
      });
      setName("");
      await load();
      setActiveProjectId(project.id);
      navigation.navigate("BoardTab", { screen: "BoardHome" });
    } catch (error) {
      Alert.alert(
        "Create project failed",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  if (loading) {
    return (
      <View style={styles.root}>
        <Card variant="flat" style={styles.loadingCard}>
          <SkeletonText lines={5} />
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={ListSeparator}
        ListHeaderComponent={
          <PageHeader
            eyebrow={`${projects.length} project${projects.length === 1 ? "" : "s"}`}
            title={workspaceName}
            style={styles.header}
          />
        }
        renderItem={({ item }) => (
          <ListRow
            title={item.name}
            subtitle={item.description ?? undefined}
            onPress={() => {
              setActiveProjectId(item.id);
              navigation.navigate("BoardTab", { screen: "BoardHome" });
            }}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            title="No projects yet"
            description="Create one below and it opens straight on the board."
          />
        }
      />

      {role && can(role, "project.write") ? (
        <View style={styles.create}>
          <Input
            placeholder="New project"
            value={name}
            onChangeText={setName}
            returnKeyType="done"
            onSubmitEditing={() => void createProject()}
            style={styles.createInput}
          />
          <Button label="Add" onPress={() => void createProject()} size="sm" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  list: { paddingBottom: spacing.lg },
  header: { marginBottom: spacing.sm },
  loadingCard: { margin: spacing.lg, padding: spacing.lg },
  create: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  createInput: { flex: 1 },
});
