import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { Input, Text, useTheme } from "@noirly-dev/ui-native";
import { spacing } from "../../theme";
import type { TaskPriority } from "../../types";
import { ChoiceChips } from "../../ui/ChoiceChips";
import { FilterChip } from "../../ui/FilterChip";
import { Sheet } from "../../ui/Sheet";
import { dateKey, dateKeyToIso, formatDue, isoToDateKey } from "./dates";
import { optionLabel, PRIORITY_OPTIONS } from "./options";

type Props = {
  visible: boolean;
  placeholder: string;
  title: string;
  priority: TaskPriority;
  dueAt: string | null;
  onChangeTitle: (value: string) => void;
  onChangePriority: (value: TaskPriority) => void;
  onChangeDue: (iso: string | null) => void;
  /** Hands over to the full month picker; the caller reopens this sheet after. */
  onPickDate: () => void;
  onSubmit: () => void;
  onClose: () => void;
};

const PRIORITIES = PRIORITY_OPTIONS.map((option) => option.value);

function offsetKey(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return dateKey(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Quick add as a keyboard-attached sheet, opened from the floating button.
 * It replaces the two-row form that used to sit pinned above the tab bar on
 * every list — a web toolbar habit that cost a fifth of the screen even when
 * nobody was adding anything.
 */
export function QuickAddSheet({
  visible,
  placeholder,
  title,
  priority,
  dueAt,
  onChangeTitle,
  onChangePriority,
  onChangeDue,
  onPickDate,
  onSubmit,
  onClose,
}: Props) {
  const tokens = useTheme();
  // Android ignores autoFocus on a field mounted with its Modal: the window is
  // not focusable yet. Mount the field a beat after the sheet opens instead.
  const [fieldReady, setFieldReady] = useState(false);
  useEffect(() => {
    if (!visible) {
      setFieldReady(false);
      return;
    }
    const timer = setTimeout(() => setFieldReady(true), 250);
    return () => clearTimeout(timer);
  }, [visible]);
  const dueKey = isoToDateKey(dueAt);
  const presets = [
    { key: offsetKey(0), label: "Today" },
    { key: offsetKey(1), label: "Tomorrow" },
    { key: offsetKey(7), label: "Next week" },
  ];
  const custom = Boolean(dueKey) && !presets.some((preset) => preset.key === dueKey);

  return (
    <Sheet visible={visible} title="New task" onClose={onClose}>
      <View style={styles.content}>
      <View style={styles.titleRow}>
        {fieldReady ? (
        <Input
          testID="task-add-input"
          placeholder={placeholder}
          value={title}
          onChangeText={onChangeTitle}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={onSubmit}
          style={styles.flex}
        />
        ) : (
          <View style={[styles.flex, styles.fieldPlaceholder]} />
        )}
        <Pressable
          testID="task-add-submit"
          onPress={onSubmit}
          disabled={!title.trim()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Add task"
          accessibilityState={{ disabled: !title.trim() }}
          style={[
            styles.send,
            {
              backgroundColor: title.trim() ? tokens.color.accent : tokens.color.surface2,
            },
          ]}
        >
          <MaterialDesignIcons
            name="arrow-up"
            size={22}
            color={title.trim() ? tokens.color.accentInk : tokens.color.textMuted}
          />
        </Pressable>
      </View>

      <Text variant="monoLabel" tone="muted" uppercase style={styles.label}>
        Due
      </Text>
      <View style={styles.chips}>
        {presets.map((preset) => (
          <FilterChip
            key={preset.label}
            label={preset.label}
            active={dueKey === preset.key}
            onPress={() =>
              onChangeDue(dueKey === preset.key ? null : dateKeyToIso(preset.key))
            }
          />
        ))}
        <FilterChip
          label={custom ? formatDue(dueAt) ?? "Pick date" : "Pick date…"}
          active={custom}
          onPress={onPickDate}
        />
      </View>

      <Text variant="monoLabel" tone="muted" uppercase style={styles.label}>
        Priority
      </Text>
      <ChoiceChips
        options={PRIORITIES}
        value={priority}
        onChange={onChangePriority}
        format={(value) => optionLabel(PRIORITY_OPTIONS, value)}
        testIDPrefix="task-add-priority"
      />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.lg },
  fieldPlaceholder: { height: 48 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  send: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { marginTop: spacing.lg, marginBottom: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
