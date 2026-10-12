import React from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ListRow, ListSeparator, Text, useTheme } from "@noirly-dev/ui-native";
import { spacing } from "../theme";

type SheetProps = {
  visible: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
};

/**
 * Bottom sheet built on the core `Modal`, so it needs no extra native module.
 * It stands in for the web's `<select>` and `<input type="date">`: a phone has
 * no room for a row of dropdowns, but it does have room for one sheet at a time.
 */
export function Sheet({ visible, title, onClose, children }: SheetProps) {
  const tokens = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.fill}
        // Padding on Android too: the app is edge to edge, so the window no
        // longer resizes for the keyboard and a sheet's fields would sit under it.
        behavior="padding"
      >
        <Pressable
          style={[styles.backdrop, { backgroundColor: tokens.color.bgDeep }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <View
          style={[
            styles.panel,
            {
              backgroundColor: tokens.color.surface,
              borderColor: tokens.color.hairline,
              borderTopLeftRadius: tokens.radius.lg,
              borderTopRightRadius: tokens.radius.lg,
              paddingBottom: Math.max(insets.bottom, spacing.lg),
            },
          ]}
        >
          <View
            style={[styles.grabber, { backgroundColor: tokens.color.hairline }]}
          />
          {title ? (
            <Text variant="monoLabel" tone="muted" style={styles.title}>
              {title}
            </Text>
          ) : null}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.body}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export type SheetOption<T extends string> = {
  value: T;
  label: string;
  subtitle?: string;
};

type OptionSheetProps<T extends string> = {
  visible: boolean;
  title: string;
  options: readonly SheetOption<T>[];
  value?: T | null;
  onSelect: (value: T) => void;
  onClose: () => void;
};

/** Single-select list in a sheet. Selecting closes it. */
export function OptionSheet<T extends string>({
  visible,
  title,
  options,
  value,
  onSelect,
  onClose,
}: OptionSheetProps<T>) {
  return (
    <Sheet visible={visible} title={title} onClose={onClose}>
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <View key={option.value || `opt-${index}`}>
            {index > 0 ? <ListSeparator /> : null}
            <ListRow
              title={option.label}
              subtitle={option.subtitle}
              trailing={
                selected ? (
                  <Text variant="label" tone="accent">
                    ✓
                  </Text>
                ) : undefined
              }
              onPress={() => {
                onSelect(option.value);
                onClose();
              }}
            />
          </View>
        );
      })}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.6,
  },
  panel: {
    maxHeight: "85%",
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    paddingTop: spacing.sm,
  },
  grabber: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: spacing.sm,
  },
  title: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  body: { paddingBottom: spacing.sm },
});
