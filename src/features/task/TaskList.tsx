import React, { useMemo } from "react";
import { Pressable, SectionList, StyleSheet, View } from "react-native";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import {
  EmptyState,
  ListSeparator,
  SwipeRow,
  Text,
  useTheme,
} from "@noirly-dev/ui-native";
import { spacing } from "../../theme";
import type { Tag, Task } from "../../types";
import { dueTone } from "./dates";
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
  /** Extra space under the last row, so the floating add button never covers it. */
  bottomInset?: number;
};

type SectionKey = "overdue" | "today" | "upcoming" | "none" | "closed";

const SECTION_TITLE: Record<SectionKey, string> = {
  overdue: "Overdue",
  today: "Today",
  upcoming: "Upcoming",
  none: "No date",
  closed: "Done",
};
const SECTION_ORDER: SectionKey[] = ["overdue", "today", "upcoming", "none", "closed"];

/**
 * Buckets rows the way a phone task app reads — what is late, what is today,
 * what comes later — while keeping the server's order inside each bucket.
 */
function groupTasks(tasks: Task[]) {
  const buckets = new Map<SectionKey, Task[]>();
  for (const task of tasks) {
    const closed = task.status === "done" || task.status === "canceled";
    const key: SectionKey = closed ? "closed" : dueTone(task.dueAt) ?? "none";
    const list = buckets.get(key) ?? [];
    list.push(task);
    buckets.set(key, list);
  }
  return SECTION_ORDER.filter((key) => buckets.has(key)).map((key) => ({
    key,
    title: SECTION_TITLE[key],
    data: buckets.get(key)!,
  }));
}

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
  bottomInset = 0,
}: Props) {
  const tokens = useTheme();
  const sections = useMemo(() => groupTasks(tasks), [tasks]);

  return (
    <SectionList
      testID="task-list"
      sections={sections}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[styles.list, { paddingBottom: spacing.lg + bottomInset }]}
      ItemSeparatorComponent={ListSeparator}
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) => (
        <View style={[styles.sectionHeader, { borderBottomColor: tokens.color.hairline }]}>
          <Text
            variant="monoLabel"
            uppercase
            tone={section.key === "overdue" ? "destructive" : section.key === "today" ? "accent" : "muted"}
          >
            {section.title}
          </Text>
          <Text variant="meta" tone="muted">
            {section.data.length}
          </Text>
        </View>
      )}
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
              hitSlop={12}
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
                    item.status === "done" ? tokens.color.accent : "transparent",
                },
              ]}
            >
              {item.status === "done" ? (
                <MaterialDesignIcons name="check" size={16} color={tokens.color.accentInk} />
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
            {/* Done / todo already read from the checkbox; only the in-between
                states need a badge. */}
            {item.status === "in_progress" || item.status === "canceled" ? (
              <StatusBadge status={item.status} />
            ) : null}
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, gap: 4 },
  struck: { textDecorationLine: "line-through" },
});
