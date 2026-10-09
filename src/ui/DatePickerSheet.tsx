import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button } from "@noirly-dev/ui-native";
import { dateKey, dateKeyToIso, isoToDateKey } from "../features/task/dates";
import { spacing } from "../theme";
import { MonthGrid, type MonthCursor } from "./MonthGrid";
import { Sheet } from "./Sheet";

type Props = {
  visible: boolean;
  title?: string;
  value: string | null;
  /** ISO timestamp (noon local) or null when cleared. */
  onChange: (iso: string | null) => void;
  onClose: () => void;
};

function cursorFor(iso: string | null): MonthCursor {
  const date = iso ? new Date(iso) : new Date();
  return { year: date.getFullYear(), month: date.getMonth() };
}

/** The web's `<input type="date">`, as a sheet with a month grid. */
export function DatePickerSheet({
  visible,
  title = "Due date",
  value,
  onChange,
  onClose,
}: Props) {
  const [cursor, setCursor] = useState<MonthCursor>(() => cursorFor(value));

  useEffect(() => {
    if (visible) setCursor(cursorFor(value));
  }, [visible, value]);

  function pick(key: string) {
    onChange(dateKeyToIso(key));
    onClose();
  }

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  return (
    <Sheet visible={visible} title={title} onClose={onClose}>
      <View style={styles.body}>
        <MonthGrid
          cursor={cursor}
          onCursorChange={setCursor}
          selectedKey={isoToDateKey(value)}
          onSelectDay={pick}
        />
        <View style={styles.quick}>
          <Button
            label="Today"
            size="sm"
            variant="ghost"
            onPress={() =>
              pick(dateKey(today.getFullYear(), today.getMonth(), today.getDate()))
            }
          />
          <Button
            label="Tomorrow"
            size="sm"
            variant="ghost"
            onPress={() =>
              pick(
                dateKey(
                  tomorrow.getFullYear(),
                  tomorrow.getMonth(),
                  tomorrow.getDate(),
                ),
              )
            }
          />
          {value ? (
            <Button
              label="Clear"
              size="sm"
              variant="ghost"
              onPress={() => {
                onChange(null);
                onClose();
              }}
            />
          ) : null}
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.lg, gap: spacing.md },
  quick: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
