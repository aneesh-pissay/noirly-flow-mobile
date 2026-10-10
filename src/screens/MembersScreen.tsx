import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Share, StyleSheet, View } from "react-native";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ListRow,
  ListSeparator,
  SkeletonText,
  Text,
} from "@noirly-dev/ui-native";
import { copyToClipboard } from "noirly-flow-native";
import { api } from "../api/client";
import { useMe } from "../auth/useMe";
import type { WorkspaceMember } from "../features/workspace/members";
import { can } from "../permissions";
import { colors, spacing } from "../theme";
import { ChoiceChips } from "../ui/ChoiceChips";
import { Sheet } from "../ui/Sheet";
import type { MemberRole } from "../types";
import { useWorkspace } from "../workspace/WorkspaceContext";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Members">;
type InviteRole = Exclude<MemberRole, "owner">;

const ROLES: readonly MemberRole[] = ["owner", "admin", "member", "viewer"];
const INVITE_ROLES: readonly InviteRole[] = ["admin", "member", "viewer"];

/** Owners and admins are the roles worth marking; member is the default. */
function roleTone(role: MemberRole) {
  return role === "owner" || role === "admin" ? "accent" : "neutral";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

export function MembersScreen() {
  const route = useRoute<Props["route"]>();
  const { workspaceId } = route.params;
  const { role } = useWorkspace();
  const me = useMe();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<InviteRole>("member");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState<WorkspaceMember | null>(null);
  const manage = Boolean(role && can(role, "members.manage"));

  const load = useCallback(async () => {
    try {
      const { members: list } = await api.listMembers(workspaceId);
      setMembers(list);
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  function copyInvite() {
    if (!inviteUrl) return;
    try {
      copyToClipboard(inviteUrl);
      setCopied(true);
    } catch (error) {
      Alert.alert("Copy failed", errorMessage(error));
    }
  }

  async function generateInvite() {
    setInviting(true);
    try {
      const { invite } = await api.createInvite(workspaceId, inviteRole);
      setInviteUrl(invite.url);
      setCopied(false);
    } catch (error) {
      Alert.alert("Invite failed", errorMessage(error));
    } finally {
      setInviting(false);
    }
  }

  async function changeRole(member: WorkspaceMember, next: MemberRole) {
    if (next === member.role) return;
    const previous = members;
    setMembers((list) =>
      list.map((item) => (item.userId === member.userId ? { ...item, role: next } : item)),
    );
    setEditing((current) => (current ? { ...current, role: next } : current));
    try {
      await api.updateMember(workspaceId, member.userId, next);
      void load();
    } catch (error) {
      setMembers(previous);
      setEditing((current) => (current ? { ...current, role: member.role } : current));
      Alert.alert("Role change failed", errorMessage(error));
    }
  }

  function removeMember(member: WorkspaceMember) {
    Alert.alert(
      "Remove member?",
      `${member.displayName} will lose access to this workspace.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            setEditing(null);
            void (async () => {
              try {
                await api.removeMember(workspaceId, member.userId);
                setMembers((list) => list.filter((item) => item.userId !== member.userId));
              } catch (error) {
                Alert.alert("Remove failed", errorMessage(error));
              }
            })();
          },
        },
      ],
    );
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

  const inviteCard = manage ? (
    <Card variant="flat" style={styles.invite}>
      <Text variant="label" weight="600">
        Invite link
      </Text>
      <Text variant="meta" tone="muted">
        A one-time link. It expires in 7 days.
      </Text>
      <ChoiceChips<InviteRole>
        options={INVITE_ROLES}
        value={inviteRole}
        onChange={(next) => {
          setInviteRole(next);
          setInviteUrl(null);
        }}
      />
      <Button
        testID="invite-generate"
        label="Generate link"
        size="sm"
        loading={inviting}
        onPress={() => void generateInvite()}
        style={styles.left}
      />
      {inviteUrl ? (
        <View style={styles.link}>
          <Text
            testID="invite-url"
            variant="meta"
            selectable
            numberOfLines={2}
            style={styles.flex}
          >
            {inviteUrl}
          </Text>
          <Button
            testID="invite-copy"
            label={copied ? "Copied" : "Copy"}
            accessibilityLabel={copied ? "Copied" : "Copy"}
            size="sm"
            variant="ghost"
            onPress={copyInvite}
          />
          <Button
            label="Share"
            size="sm"
            variant="ghost"
            onPress={() =>
              void Share.share({
                message: `Join my Noirly Flow workspace: ${inviteUrl}`,
                url: inviteUrl,
              })
            }
          />
        </View>
      ) : null}
    </Card>
  ) : null;

  return (
    <View style={styles.root}>
      <FlatList
        data={members}
        keyExtractor={(item) => item.userId}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={ListSeparator}
        refreshing={false}
        onRefresh={() => void load()}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            {inviteCard}
            {loadError ? (
              <View style={styles.errorRow}>
                <Text variant="meta" tone="destructive" style={styles.flex}>
                  Could not load members. {loadError}
                </Text>
                <Button label="Try again" size="sm" variant="ghost" onPress={() => void load()} />
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          const isSelf = item.userId === me?.id;
          return (
            <ListRow
              title={isSelf ? `${item.displayName} (you)` : item.displayName}
              subtitle={item.email}
              leading={<Avatar name={item.displayName} />}
              trailing={<Badge label={item.role} tone={roleTone(item.role)} />}
              onPress={manage && !isSelf ? () => setEditing(item) : undefined}
            />
          );
        }}
        ListEmptyComponent={
          loadError ? undefined : (
            <EmptyState
              title="No members yet"
              description="Invite someone and they will appear here once they accept."
            />
          )
        }
      />

      <Sheet
        visible={Boolean(editing)}
        title={editing?.displayName}
        onClose={() => setEditing(null)}
      >
        {editing ? (
          <View style={styles.sheet}>
            <Text variant="monoLabel" tone="muted">
              Role
            </Text>
            <ChoiceChips<MemberRole>
              options={ROLES}
              value={editing.role}
              onChange={(next) => void changeRole(editing, next)}
            />
            <Text variant="meta" tone="muted">
              Only an owner can make someone an owner, and the last owner can't be
              demoted.
            </Text>
            <Button
              testID="member-remove"
              label="Remove from workspace"
              variant="destructive"
              onPress={() => removeMember(editing)}
              fullWidth
            />
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  list: { paddingBottom: spacing.xl },
  loadingCard: { margin: spacing.lg, padding: spacing.lg },
  headerBlock: { padding: spacing.lg, gap: spacing.md },
  invite: { padding: spacing.lg, gap: spacing.md },
  left: { alignSelf: "flex-start" },
  link: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  flex: { flex: 1 },
  errorRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  sheet: { paddingHorizontal: spacing.lg, gap: spacing.md },
});
