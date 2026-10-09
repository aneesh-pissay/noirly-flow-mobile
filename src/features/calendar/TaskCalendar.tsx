import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Card,
  ListRow,
  ListSeparator,
  Text,
} from "@noirly-dev/ui-native";
import type { Task } from "../../types";
import { spacing } from "../../theme";
import { MonthGrid, type MonthCursor } from "../../ui/MonthGrid";
import { PriorityBadge, StatusBadge } from "../../ui/TaskBadges";
import { dateKey, isoToDateKey } from "../task/dates";

type Props = {
  tasks: Task[];
  onOpenTask: (taskId: string) => void;
};

/**
 * Month grid by due date with prev / next, plus the undated list — the web
 * calendar's shape. A seven-column grid has no room for titles on a phone, so
 * days carry a dot and tapping one lists its tasks underneath.
 */
export function TaskCalendar({ tasks, onOpenTask }: Props) {
  const now = new Date();
  const [cursor, setCursor] = useState<MonthCursor>({
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  const [selected, setSelected] = useState(
    dateKey(now.getFullYear(), now.getMonth(), now.getDate()),
  );

  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (task.status === "canceled") continue;
      const key = isoToDateKey(task.dueAt);
      if (!key) continue;
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.title.localeCompare(b.title));
    }
    return map;
  }, [tasks]);

  const undated = tasks.filter(
    (task) => !task.dueAt && task.status !== "canceled",
  );
  const dayTasks = byDay.get(selected) ?? [];
  const selectedLabel = new Date(`${selected}T12:00:00`).toLocaleDateString(
    undefined,
    { weekday: "long", month: "short", day: "numeric" },
  );

  return (
    <ScrollView contentContainerStyle={styles.root}>
      <Card variant="flat" style={styles.grid}>
        <MonthGrid
          cursor={cursor}
          onCursorChange={setCursor}
          selectedKey={selected}
          onSelectDay={setSelected}
          countFor={(key) => byDay.get(key)?.length ?? 0}
        />
      </Card>

      <TaskGroup
        label={selectedLabel}
        tasks={dayTasks}
        empty="Nothing due this day."
        onOpenTask={onOpenTask}
      />
      {undated.length > 0 ? (
        <TaskGroup label="No due date" tasks={undated} onOpenTask={onOpenTask} />
      ) : null}
    </ScrollView>
  );
}

function TaskGroup({
  label,
  tasks,
  empty,
  onOpenTask,
}: {
  label: string;
  tasks: Task[];
  empty?: string;
  onOpenTask: (taskId: string) => void;
}) {
  return (
    <View style={styles.group}>
      <Text variant="monoLabel" tone="muted">
        {label}
      </Text>
      {tasks.length === 0 ? (
        <Text variant="copy" tone="muted">
          {empty}
        </Text>
      ) : (
        <Card variant="flat">
          {tasks.map((task, index) => (
            <View key={task.id}>
              {index > 0 ? <ListSeparator /> : null}
              <ListRow
                title={task.title}
                leading={<StatusBadge status={task.status} />}
                trailing={<PriorityBadge priority={task.priority} />}
                onPress={() => onOpenTask(task.id)}
              />
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xl },
  grid: { padding: spacing.md },
  group: { gap: spacing.sm },
});
