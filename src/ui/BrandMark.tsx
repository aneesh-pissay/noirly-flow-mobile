import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

/**
 * The Noirly Flow mark — the same board-of-cards as the web app
 * (noirly-flow/public/brand-mark.svg, kept in design/brand/flow-mark.svg):
 * three columns whose cards thin out as work moves to done.
 *
 * Drawn with plain Views from the SVG's own geometry (1024 viewBox), so it
 * needs no SVG library and takes any tint.
 */
const CARDS: Array<[x: number, y: number]> = [
  [196, 216],
  [196, 404],
  [196, 592],
  [420, 216],
  [420, 404],
  [644, 216],
];
const CARD_W = 184;
const CARD_H = 152;
const CARD_R = 44;

export function BrandMark({
  size,
  color,
  style,
}: {
  size: number;
  color: string;
  style?: StyleProp<ViewStyle>;
}) {
  const k = size / 1024;
  return (
    <View style={[{ width: size, height: size }, style]} accessibilityRole="image" accessibilityLabel="Noirly Flow">
      {CARDS.map(([x, y]) => (
        <View
          key={`${x}-${y}`}
          style={{
            position: "absolute",
            left: x * k,
            top: y * k,
            width: CARD_W * k,
            height: CARD_H * k,
            borderRadius: CARD_R * k,
            backgroundColor: color,
          }}
        />
      ))}
    </View>
  );
}
