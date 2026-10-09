import React from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import {
  EmptyState,
  ListSeparator,
  SwipeRow,
  Text,
  useTheme,
} from "@noirly-dev/ui-native";
import { spacing } from "../../theme";
import type { Tag, Task } from "../../types";
import { StatusBadge } from "../../ui/TaskBadges";
import { TaskMetaLine } from "../../ui/TaskMeta";
import type { WorkspaceMember } from "../workspace/members";

type Props = {
  tasks: Task[];
  tags: Tag[];
  members: WorkspaceMember[];
  canWrite: boolean;
  emptyLabel: string;
  refreshing: boolean;
  onRefresh: () => void;
  onOpenTask: (taskId: string) => void;
  onQuickEdit: (task: Task) => void;
  onToggleDone: (task: Task) => void;
  onDelete: (taskId: string) => void;
};

export function TaskList({
  tasks,
  tags,
  members,
  canWrite,
  emptyLabel,
  refreshing,
  onRefresh,
  onOpenTask,
  onQuickEdit,
  onToggleDone,
  onDelete,
}: Props) {
  const tokens = useTheme();

  return (
    <FlatList
      testID="task-list"
      data={tasks}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={ListSeparator}
      refreshing={refreshing}
      onRefresh={onRefresh}
      keyboardShouldPersistTaps="handled"
      renderItem={({ item }) => {
        const closed = item.status === "done" || item.status === "canceled";
        const pending = item.id.startsWith("tmp-");
        const row = (
          <View
            testID={`task-item-${item.title}`}
            style={[styles.row, { backgroundColor: tokens.color.bg }]}
          >
            <Pressable
              disabled={!canWrite || pending}
              onPress={() => onToggleDone(item)}
              testID={pending ? `task-check-pending-${item.title}` : `task-check-${item.title}`}
              hitSlop={8}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: item.status === "done" }}
              accessibilityLabel={`Mark ${item.title} ${item.status === "done" ? "not done" : "done"}`}
              style={[
                styles.check,
                {
                  borderColor:
                    item.status === "done"
                      ? tokens.color.accent
                      : tokens.color.hairlineStrong,
                  backgroundColor:
                    item.status === "done" ? tokens.color.accentSoft : "transparent",
                },
              ]}
            >
              {item.status === "done" ? (
                <Text variant="meta" tone="accent">
                  ✓
                </Text>
              ) : null}
            </Pressable>
            <Pressable
              style={styles.body}
              disabled={pending}
              onPress={() => onOpenTask(item.id)}
              // Saving rows get their own id, so UI tests wait for the saved one.
              testID={pending ? `task-row-pending-${item.title}` : `task-row-${item.title}`}
              onLongPress={canWrite ? () => onQuickEdit(item) : undefined}
              accessibilityRole="button"
              accessibilityHint={canWrite ? "Long press for quick edit" : undefined}
            >
              <Text
                variant="body"
                tone={closed ? "muted" : "default"}
                style={closed ? styles.struck : undefined}
                numberOfLines={2}
              >
                {item.title}
              </Text>
              <TaskMetaLine
                priority={item.priority}
                dueAt={item.dueAt}
                tagIds={item.tagIds}
                assigneeIds={item.assigneeIds}
                tags={tags}
                members={members}
              />
            </Pressable>
            <StatusBadge status={item.status} />
          </View>
        );
        return canWrite && !pending ? (
          <SwipeRow
            actionLabel="Delete"
            destructive
            onAction={() => onDelete(item.id)}
          >
            {row}
          </SwipeRow>
        ) : (
          row
        );
      }}
      ListEmptyComponent={<EmptyState title="Nothing here" description={emptyLabel} />}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: spacing.lg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, gap: 4 },
  struck: { textDecorationLine: "line-through" },
});
