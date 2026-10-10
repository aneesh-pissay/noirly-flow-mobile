import React from "react";
import { StyleSheet, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import { Card, SkeletonText } from "@noirly-dev/ui-native";
import { TaskWorkspace, type TaskView } from "../features/task/TaskWorkspace";
import { colors, spacing } from "../theme";
import type { RootStackParamList } from "../navigation/types";

type ProjectRouteParams = {
  workspaceId: string;
  projectId: string;
  projectName: string;
  view?: TaskView;
};

type Props = NativeStackScreenProps<RootStackParamList, "Project">;

export function ProjectScreen({
  routeParams,
}: {
  routeParams?: ProjectRouteParams;
} = {}) {
  const route = useRoute<Props["route"]>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const params = routeParams ?? (route.params as ProjectRouteParams | undefined);

  if (!params?.workspaceId || !params.projectId) {
    return (
      <View style={styles.root}>
        <Card variant="flat" style={styles.loadingCard}>
          <SkeletonText lines={7} />
        </Card>
      </View>
    );
  }

  const { workspaceId } = params;
  return (
    <TaskWorkspace
      workspaceId={workspaceId}
      projectId={params.projectId}
      projectName={params.projectName}
      initialView={params.view}
      onOpenTask={(taskId) => navigation.navigate("Task", { workspaceId, taskId })}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loadingCard: { margin: spacing.lg, padding: spacing.lg },
});
