import { DEFAULT_THEME_ID, tokensFor } from "@noirly-dev/ui-native";

/**
 * The app palette.
 *
 * Colours are no longer defined here — they come from `@noirly-dev/ui-native`,
 * which reads the same `NOIRLY_THEMES` the web apps use. The old strict
 * monochrome ("Dot-Matrix Editorial") is gone: dashed borders, sharp corners
 * and a `#F5F5F5` stand-in for every semantic colour, which meant danger,
 * success and accent were literally the same value.
 *
 * This is a *static* dark snapshot rather than a hook, because most styling in
 * this app happens in `StyleSheet.create` at module scope, which cannot call a
 * hook. The app is dark-only today (see `<StatusBar barStyle="light-content">`),
 * so a snapshot is honest. Anything that needs to follow the OS scheme or a
 * different palette should call `useTheme()` from the package instead — the two
 * agree, because both derive from the same source.
 */
export const tokens = tokensFor(DEFAULT_THEME_ID, "dark");

export const colors = {
  bg: tokens.color.bg,
  bgDeep: tokens.color.bgDeep,
  surface: tokens.color.surface,
  surfaceRaised: tokens.color.surface2,
  border: tokens.color.hairline,
  borderStrong: tokens.color.hairlineStrong,
  text: tokens.color.text,
  textSecondary: tokens.color.textSecondary,
  textMuted: tokens.color.textMuted,
  accent: tokens.color.accent,
  accentInk: tokens.color.accentInk,
  accentSoft: tokens.color.accentSoft,
  danger: tokens.color.destructive,
  success: tokens.color.positive,
  warning: tokens.color.negative,
} as const;

export const spacing = {
  xs: tokens.space.xs,
  sm: tokens.space.sm,
  md: tokens.space.md,
  lg: tokens.space.lg,
  xl: tokens.space.xxl,
} as const;

export const radius = tokens.radius;
export const type = tokens.type;
export const elevation = tokens.elevation;
