import React, { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Button, Text } from "@noirly-dev/ui-native";
import { spacing } from "../../theme";
import type { Task, TaskPriority, TaskStatus } from "../../types";
import { ChoiceChips } from "../../ui/ChoiceChips";
import { DatePickerSheet } from "../../ui/DatePickerSheet";
import { Sheet } from "../../ui/Sheet";
import { formatDue } from "./dates";
import { optionLabel, PRIORITY_OPTIONS, STATUS_OPTIONS } from "./options";

type Props = {
  task: Task | null;
  onClose: () => void;
  onOpen: (taskId: string) => void;
  onPatch: (taskId: string, patch: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
};

const STATUSES = STATUS_OPTIONS.map((option) => option.value);
const PRIORITIES = PRIORITY_OPTIONS.map((option) => option.value);

/**
 * Long-press a task to change status, priority or due date, or delete it,
 * without opening the full editor — the web list does this inline with a row
 * of selects, which a phone row has no width for.
 */
export function TaskQuickEdit({ task, onClose, onOpen, onPatch, onDelete }: Props) {
  const [pickingDate, setPickingDate] = useState(false);
  if (!task) return null;
  const current = task;

  return (
    <>
      <Sheet visible={!pickingDate} title={current.title} onClose={onClose}>
        <View style={styles.body}>
          <View style={styles.field}>
            <Text variant="monoLabel" tone="muted">
              Status
            </Text>
            <ChoiceChips<TaskStatus>
              options={STATUSES}
              value={current.status}
              format={(value) => optionLabel(STATUS_OPTIONS, value)}
              onChange={(status) => onPatch(current.id, { status })}
              testIDPrefix="quick-status"
            />
          </View>
          <View style={styles.field}>
            <Text variant="monoLabel" tone="muted">
              Priority
            </Text>
            <ChoiceChips<TaskPriority>
              options={PRIORITIES}
              value={current.priority}
              format={(value) => optionLabel(PRIORITY_OPTIONS, value)}
              onChange={(priority) => onPatch(current.id, { priority })}
              testIDPrefix="quick-priority"
            />
          </View>
          <View style={styles.field}>
            <Text variant="monoLabel" tone="muted">
              Due date
            </Text>
            <Button
              label={formatDue(current.dueAt) ?? "No due date"}
              variant="ghost"
              size="sm"
              onPress={() => setPickingDate(true)}
              style={styles.left}
            />
          </View>
          <View style={styles.actions}>
            <Button
              label="Open task"
              size="sm"
              onPress={() => {
                onClose();
                onOpen(current.id);
              }}
            />
            <Button
              label="Delete"
              size="sm"
              variant="destructive"
              onPress={() =>
                Alert.alert("Delete task?", current.title, [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                      onClose();
                      onDelete(current.id);
                    },
                  },
                ])
              }
            />
          </View>
        </View>
      </Sheet>
      <DatePickerSheet
        visible={pickingDate}
        value={current.dueAt}
        onChange={(dueAt) => onPatch(current.id, { dueAt })}
        onClose={() => setPickingDate(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  field: { gap: spacing.sm },
  left: { alignSelf: "flex-start" },
  actions: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
});
