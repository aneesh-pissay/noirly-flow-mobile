import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { Input, Text, useTheme, type InputProps } from "@noirly-dev/ui-native";
import { PASSWORD_RULES } from "../../auth/accountApi";
import { spacing } from "../../theme";

type IconName = React.ComponentProps<typeof MaterialDesignIcons>["name"];

/**
 * The frame every account screen shares: a back control with a mono context
 * label, and a body that scrolls clear of the keyboard. The app is edge to
 * edge, so the keyboard padding has to be done here — Android will not resize
 * the window for it.
 */
export function AuthScaffold({
  context,
  onBack,
  footer,
  children,
}: {
  context: string;
  onBack?: () => void;
  /** Pinned under the scroll area — "Back to sign in" and the like. */
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const tokens = useTheme();
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: tokens.color.bg }]}>
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <View style={styles.topBar}>
          {onBack ? (
            <Pressable
              testID="auth-back"
              onPress={onBack}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Back"
              style={[styles.back, { borderColor: tokens.color.hairline }]}
            >
              <MaterialDesignIcons name="chevron-left" size={24} color={tokens.color.text} />
            </Pressable>
          ) : (
            <View style={styles.back} />
          )}
          <Text variant="monoLabel" tone="secondary" uppercase style={styles.context}>
            {context}
          </Text>
          <View style={styles.back} />
        </View>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Rounded tile holding the screen's glyph, gold on gold-soft. */
export function AuthGlyph({ icon, round = false }: { icon: IconName; round?: boolean }) {
  const tokens = useTheme();
  return (
    <View
      style={[
        round ? styles.glyphRound : styles.glyph,
        {
          backgroundColor: tokens.color.accentSoft,
          borderColor: tokens.color.hairlineStrong,
          borderRadius: round ? 44 : tokens.radius.lg,
        },
      ]}
    >
      <MaterialDesignIcons name={icon} size={round ? 36 : 28} color={tokens.color.accent} />
    </View>
  );
}

export function AuthHeading({ title, lede }: { title: string; lede?: React.ReactNode }) {
  return (
    <View style={styles.heading}>
      <Text variant="displayLg">{title}</Text>
      {lede ? (
        <Text variant="body" tone="secondary">
          {lede}
        </Text>
      ) : null}
    </View>
  );
}

/** Mono uppercase label above a control, then an optional error line. */
export function Field({
  label,
  error,
  children,
  style,
}: {
  label: string;
  error?: string | null;
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <View style={[styles.field, style]}>
      <Text variant="monoLabel" tone="muted" uppercase>
        {label}
      </Text>
      {children}
      {error ? (
        <Text variant="meta" tone="destructive" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/** A password input with a show / hide toggle. */
export function PasswordInput(props: Omit<InputProps, "secureTextEntry" | "trailing">) {
  const tokens = useTheme();
  const [visible, setVisible] = useState(false);
  return (
    <Input
      {...props}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      trailing={
        <Pressable
          onPress={() => setVisible((value) => !value)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={visible ? "Hide password" : "Show password"}
        >
          <MaterialDesignIcons
            name={visible ? "eye-off-outline" : "eye-outline"}
            size={20}
            color={tokens.color.textMuted}
          />
        </Pressable>
      }
    />
  );
}

/** Identity's password rules, ticking off live as the password is typed. */
export function PasswordRules({ password }: { password: string }) {
  const tokens = useTheme();
  return (
    <View style={styles.rules} accessibilityLabel="Password requirements">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <View
            key={rule.key}
            style={styles.rule}
            accessibilityLabel={`${rule.label}, ${met ? "met" : "not met"}`}
          >
            <View
              style={[
                styles.ruleMark,
                {
                  backgroundColor: met ? tokens.color.accentSoft : "transparent",
                  borderColor: met ? tokens.color.accent : tokens.color.hairlineStrong,
                },
              ]}
            >
              {met ? (
                <MaterialDesignIcons name="check" size={11} color={tokens.color.accent} />
              ) : null}
            </View>
            <Text variant="meta" tone={met ? "accent" : "muted"}>
              {rule.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** A centred quiet text action, at least 44pt tall. */
export function TextLink({
  label,
  emphasis,
  onPress,
  testID,
  disabled,
}: {
  label: string;
  /** Rendered after the label in the accent, e.g. "Sign in". */
  emphasis?: string;
  onPress: () => void;
  testID?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [styles.link, (pressed || disabled) && styles.dim]}
    >
      <Text variant="copy" tone="secondary">
        {label}
        {emphasis ? (
          <Text variant="copy" tone="accent" weight="600">
            {` ${emphasis}`}
          </Text>
        ) : null}
      </Text>
    </Pressable>
  );
}

export function OrDivider() {
  const tokens = useTheme();
  return (
    <View style={styles.or}>
      <View style={[styles.orLine, { backgroundColor: tokens.color.hairline }]} />
      <Text variant="monoLabel" tone="muted">
        OR
      </Text>
      <View style={[styles.orLine, { backgroundColor: tokens.color.hairline }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    minHeight: 56,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  context: { flex: 1, textAlign: "center" },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: spacing.xl, gap: spacing.lg },
  footer: { paddingHorizontal: 20, paddingBottom: spacing.md },
  glyph: {
    width: 64,
    height: 64,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.lg,
  },
  glyphRound: {
    width: 88,
    height: 88,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: spacing.xl,
  },
  heading: { gap: spacing.sm, marginTop: spacing.sm },
  field: { gap: spacing.sm },
  rules: { flexDirection: "row", flexWrap: "wrap", rowGap: spacing.sm },
  rule: { width: "50%", flexDirection: "row", alignItems: "center", gap: spacing.sm },
  ruleMark: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  link: { minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.sm },
  dim: { opacity: 0.6 },
  or: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth },
});
