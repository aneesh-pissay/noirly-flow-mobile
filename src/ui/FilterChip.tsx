import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { Text, useTheme } from "@noirly-dev/ui-native";

type Props = {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

/** A pressable pill for filter toggles and "open a picker" controls. */
export function FilterChip({ label, active = false, disabled = false, onPress }: Props) {
  const tokens = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      style={[
        styles.chip,
        {
          borderRadius: tokens.radius.pill,
          borderColor: active ? tokens.color.accent : tokens.color.hairline,
          backgroundColor: active ? tokens.color.accentSoft : "transparent",
        },
        disabled && styles.disabled,
      ]}
    >
      <Text
        variant="meta"
        tone={active ? "accent" : "secondary"}
        weight={active ? "600" : "400"}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  disabled: { opacity: 0.5 },
});
