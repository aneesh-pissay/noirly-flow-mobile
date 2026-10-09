import React from "react";
import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "@noirly-dev/ui-native";
import { dueLabel, dueTone } from "../features/task/dates";
import {
  initials,
  memberName,
  type WorkspaceMember,
} from "../features/workspace/members";
import type { Tag } from "../types";

/** "Overdue · Oct 3" / "Today · Oct 8" / "Oct 12" — mirrors web `TaskDueBadge`. */
export function DueBadge({ dueAt }: { dueAt: string | null | undefined }) {
  const tokens = useTheme();
  const label = dueLabel(dueAt);
  if (!label) return null;
  const tone = dueTone(dueAt);
  return (
    <Text
      variant="monoLabel"
      tone={tone === "overdue" ? "accent" : tone === "today" ? "default" : "muted"}
      style={
        tone === "overdue"
          ? [
              styles.overdue,
              {
                backgroundColor: tokens.color.accentSoft,
                borderRadius: tokens.radius.sm,
              },
            ]
          : undefined
      }
    >
      {label}
    </Text>
  );
}

export function TagChips({ tagIds, tags }: { tagIds: string[]; tags: Tag[] }) {
  const tokens = useTheme();
  const selected = tags.filter((tag) => tagIds.includes(tag.id));
  if (!selected.length) return null;
  return (
    <View style={styles.row}>
      {selected.map((tag) => (
        <View
          key={tag.id}
          style={[
            styles.tag,
            {
              borderColor: tokens.color.hairline,
              borderRadius: tokens.radius.sm,
            },
          ]}
        >
          <Text variant="meta" tone="secondary">
            {tag.name}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function AssigneeChips({
  assigneeIds,
  members,
}: {
  assigneeIds: string[];
  members: WorkspaceMember[];
}) {
  const tokens = useTheme();
  if (!assigneeIds.length) return null;
  return (
    <View style={styles.row}>
      {assigneeIds.map((id) => {
        const name = memberName(members, id);
        return (
          <View
            key={id}
            accessibilityLabel={name}
            style={[styles.avatar, { backgroundColor: tokens.color.surface2 }]}
          >
            <Text variant="meta" style={styles.avatarText}>
              {initials(name)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** One wrapped line of priority · due · tags · assignees under a task title. */
export function TaskMetaLine({
  priority,
  dueAt,
  tagIds,
  assigneeIds,
  tags,
  members,
}: {
  priority?: string;
  dueAt: string | null;
  tagIds: string[];
  assigneeIds: string[];
  tags: Tag[];
  members: WorkspaceMember[];
}) {
  return (
    <View style={styles.meta}>
      {priority && priority !== "none" ? (
        <Text variant="monoLabel" tone={priority === "urgent" || priority === "high" ? "negative" : "muted"}>
          {priority}
        </Text>
      ) : null}
      <DueBadge dueAt={dueAt} />
      <TagChips tagIds={tagIds} tags={tags} />
      <AssigneeChips assigneeIds={assigneeIds} members={members} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  meta: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  overdue: { paddingHorizontal: 4, overflow: "hidden" },
  tag: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  avatar: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 10, lineHeight: 12 },
});
