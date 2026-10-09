import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text, useTheme } from "@noirly-dev/ui-native";

export interface ChoiceChipsProps<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  disabled?: boolean;
  /** Turns "in_progress" into "In progress" for display. */
  format?: (option: T) => string;
  /** Each chip gets `${testIDPrefix}-${option}` for UI tests. */
  testIDPrefix?: string;
}

function defaultFormat(option: string): string {
  const words = option.replace(/[._-]+/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * A single-select row of chips.
 *
 * Selection is marked with the accent as a tint plus a matching border, not by
 * flooding the chip with solid accent and inverting the label. At this size a
 * solid fill puts four or five loud blocks on a form that already has a primary
 * button, and the accent stops reading as emphasis when it is everywhere.
 */
export function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
  format = defaultFormat,
  testIDPrefix,
}: ChoiceChipsProps<T>) {
  const tokens = useTheme();

  return (
    <View style={styles.row}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            testID={testIDPrefix ? `${testIDPrefix}-${option}` : undefined}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled }}
            onPress={() => onChange(option)}
            style={[
              styles.chip,
              {
                borderRadius: tokens.radius.sm,
                borderColor: selected ? tokens.color.accent : tokens.color.hairline,
                backgroundColor: selected ? tokens.color.accentSoft : "transparent",
              },
              disabled && styles.disabled,
            ]}
          >
            <Text
              variant="meta"
              tone={selected ? "accent" : "muted"}
              weight={selected ? "600" : "400"}
            >
              {format(option)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: StyleSheet.hairlineWidth,
  },
  disabled: {
    opacity: 0.5,
  },
});
