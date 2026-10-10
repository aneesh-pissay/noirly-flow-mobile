import React from "react";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { useTheme } from "@noirly-dev/ui-native";

type TabIconProps = {
  name: "inbox" | "board" | "search" | "menu";
  focused: boolean;
  size?: number;
};

const MDI_NAME = {
  inbox: "inbox",
  board: "view-dashboard-outline",
  search: "magnify",
  menu: "dots-horizontal",
} as const;

/**
 * The active tab is marked with the accent rather than by inverting the whole
 * item to a solid white block. At tab-bar size a full inversion is the loudest
 * thing on the screen, and it made the accent — which everything else in the
 * system uses as light — read as paint.
 */
export function TabIcon({ name, focused, size = 22 }: TabIconProps) {
  const tokens = useTheme();
  return (
    <MaterialDesignIcons
      name={MDI_NAME[name]}
      color={focused ? tokens.color.accent : tokens.color.textMuted}
      size={size}
    />
  );
}
