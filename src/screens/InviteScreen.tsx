import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";
import { CommonActions, useNavigation, useRoute } from "@react-navigation/native";
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import { Text, useTheme } from "@noirly-dev/ui-native";
import { api } from "../api/client";
import { colors, spacing } from "../theme";
import { useWorkspace } from "../workspace/WorkspaceContext";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Invite">;

export function InviteScreen() {
  const route = useRoute<Props["route"]>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const tokens = useTheme();
  const { setWorkspaceId, setRole, setProjects, setActiveProjectId } =
    useWorkspace();
  const [message, setMessage] = useState("Accepting invite…");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const result = await api.acceptInvite(route.params.token);
        setMessage(`Joined ${result.name}`);
        const detail = await api.getWorkspace(result.workspaceId);
        setWorkspaceId(detail.workspace.id);
        setRole(detail.workspace.role);
        setProjects(detail.projects);
        setActiveProjectId(detail.projects[0]?.id ?? null);
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: "Main", params: { screen: "MenuTab" } }],
          }),
        );
      } catch (error) {
        const text =
          error instanceof Error ? error.message : "Invite accept failed";
        setMessage(text);
        setFailed(true);
        Alert.alert("Invite failed", text);
      }
    })();
  }, [
    navigation,
    route.params.token,
    setWorkspaceId,
    setRole,
    setProjects,
    setActiveProjectId,
  ]);

  return (
    <View style={styles.center}>
      {/* The spinner is dropped once this has failed — leaving it turning under
          an error message reads as still-working. */}
      {failed ? null : <ActivityIndicator color={tokens.color.accent} />}
      <Text variant="body" tone={failed ? "destructive" : "secondary"} style={styles.text}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    gap: spacing.md,
    padding: spacing.xl,
  },
  text: { textAlign: "center" },
});
