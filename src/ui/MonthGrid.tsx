import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, Text, useTheme } from "@noirly-dev/ui-native";
import {
  dateKey,
  monthLabel,
  mondayIndex,
  shiftMonth,
} from "../features/task/dates";
import { spacing } from "../theme";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

export type MonthCursor = { year: number; month: number };

type Props = {
  cursor: MonthCursor;
  onCursorChange: (next: MonthCursor) => void;
  /** `YYYY-MM-DD` of the highlighted day. */
  selectedKey?: string | null;
  onSelectDay: (key: string) => void;
  /** Number of items on a day, drawn as a dot under the date. */
  countFor?: (key: string) => number;
};

/**
 * Monday-first month grid with prev / next, matching the web calendar's layout.
 * Shared by the calendar view and the date picker so both read the same.
 */
export function MonthGrid({
  cursor,
  onCursorChange,
  selectedKey,
  onSelectDay,
  countFor,
}: Props) {
  const tokens = useTheme();
  const now = new Date();
  const todayKey = dateKey(now.getFullYear(), now.getMonth(), now.getDate());
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const startPad = mondayIndex(new Date(cursor.year, cursor.month, 1).getDay());

  const cells: Array<{ key: string; day: number | null }> = [];
  for (let i = 0; i < startPad; i += 1) cells.push({ key: `pad-${i}`, day: null });
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ key: dateKey(cursor.year, cursor.month, day), day });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ key: `tail-${cells.length}`, day: null });
  }

  return (
    <View style={styles.root}>
      <View style={styles.nav}>
        <Button
          label="Prev"
          size="sm"
          variant="ghost"
          onPress={() => onCursorChange(shiftMonth(cursor, -1))}
        />
        <Text variant="label" weight="600">
          {monthLabel(cursor.year, cursor.month)}
        </Text>
        <Button
          label="Next"
          size="sm"
          variant="ghost"
          onPress={() => onCursorChange(shiftMonth(cursor, 1))}
        />
      </View>

      <View style={styles.row}>
        {WEEKDAYS.map((day, index) => (
          <View key={`${day}-${index}`} style={styles.cell}>
            <Text variant="monoLabel" tone="muted">
              {day}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell) => {
          if (cell.day === null) {
            return <View key={cell.key} style={styles.cell} />;
          }
          const selected = cell.key === selectedKey;
          const isToday = cell.key === todayKey;
          const count = countFor?.(cell.key) ?? 0;
          return (
            <Pressable
              key={cell.key}
              style={styles.cell}
              onPress={() => onSelectDay(cell.key)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${cell.key}${count ? `, ${count} tasks` : ""}`}
            >
              <View
                style={[
                  styles.day,
                  { borderRadius: tokens.radius.sm },
                  selected && {
                    backgroundColor: tokens.color.accentSoft,
                    borderColor: tokens.color.accent,
                  },
                  !selected && isToday && { borderColor: tokens.color.hairlineStrong },
                ]}
              >
                <Text
                  variant="label"
                  tone={selected || isToday ? "accent" : "default"}
                  weight={selected ? "600" : "400"}
                >
                  {cell.day}
                </Text>
                <View
                  style={[
                    styles.dot,
                    count > 0 && { backgroundColor: tokens.color.accent },
                  ]}
                />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  row: { flexDirection: "row" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: {
    width: `${100 / 7}%`,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
  },
  day: {
    width: 40,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "transparent",
    gap: 2,
  },
  dot: { width: 4, height: 4, borderRadius: 2 },
});
