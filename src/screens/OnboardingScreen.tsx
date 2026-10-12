import React, { useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { Button, Text, useTheme, type NoirlyTokens } from "@noirly-dev/ui-native";
import { spacing } from "../theme";
import { BrandMark } from "../ui/BrandMark";

type Slide = {
  key: string;
  eyebrow: string;
  title: string;
  body: string;
  Art: (props: { tokens: NoirlyTokens }) => React.JSX.Element;
};

const SLIDES: Slide[] = [
  {
    key: "capture",
    eyebrow: "Capture",
    title: "Everything lands in one inbox.",
    body: "Jot a task in a second with the + button. Sort it into a project when you are ready.",
    Art: InboxArt,
  },
  {
    key: "board",
    eyebrow: "Organise",
    title: "Boards that fit in your hand.",
    body: "Swipe column to column, hold a card to drag it, and see what is due today at a glance.",
    Art: BoardArt,
  },
  {
    key: "together",
    eyebrow: "Together",
    title: "Your whole team, live.",
    body: "See who is on a project right now. Changes appear on every phone and browser as they happen.",
    Art: TogetherArt,
  },
];

type Props = { onDone: () => void };

/**
 * Three first-launch pages ahead of sign-in. Shown once per install; the
 * caller remembers that it was seen.
 */
export function OnboardingScreen({ onDone }: Props) {
  const tokens = useTheme();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  const last = index === SLIDES.length - 1;

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  }

  function next() {
    if (last) {
      onDone();
      return;
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: tokens.color.bg }]}>
      <View style={styles.top}>
        <View style={styles.brand}>
          <BrandMark size={22} color={tokens.color.accent} />
          <Text variant="monoLabel" tone="secondary" uppercase>
            Noirly Flow
          </Text>
        </View>
        {!last ? (
          <Pressable
            testID="onboarding-skip"
            onPress={onDone}
            hitSlop={12}
            accessibilityRole="button"
            style={styles.skip}
          >
            <Text variant="button" tone="muted" uppercase>
              Skip
            </Text>
          </Pressable>
        ) : null}
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(slide) => slide.key}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item, index: i }) => (
          <View style={[styles.slide, { width }]}>
            <View style={styles.art}>
              <item.Art tokens={tokens} />
            </View>
            <Text variant="monoLabel" tone="accent" uppercase>
              {`0${i + 1} / 0${SLIDES.length} · ${item.eyebrow}`}
            </Text>
            <Text variant="displayLg" style={styles.title}>
              {item.title}
            </Text>
            <Text variant="lede" tone="secondary">
              {item.body}
            </Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots} accessibilityLabel={`Page ${index + 1} of ${SLIDES.length}`}>
          {SLIDES.map((slide, i) => (
            <View
              key={slide.key}
              style={[
                styles.dot,
                {
                  width: i === index ? 22 : 6,
                  backgroundColor: i === index ? tokens.color.accent : tokens.color.hairlineStrong,
                },
              ]}
            />
          ))}
        </View>
        <Button
          testID={last ? "onboarding-start" : "onboarding-next"}
          label={last ? "Get started" : "Next"}
          onPress={next}
          size="lg"
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

/* ---- Illustrations: built from the app's own parts, in theme colours. ---- */

function Frame({ tokens, children }: { tokens: NoirlyTokens; children: React.ReactNode }) {
  return (
    <View
      style={[
        art.frame,
        {
          backgroundColor: tokens.color.surface,
          borderColor: tokens.color.hairline,
          borderRadius: tokens.radius.lg,
        },
      ]}
    >
      {children}
    </View>
  );
}

function Line({ tokens, w, strong }: { tokens: NoirlyTokens; w: number | `${number}%`; strong?: boolean }) {
  return (
    <View
      style={[
        art.line,
        { width: w, backgroundColor: strong ? tokens.color.textSecondary : tokens.color.hairlineStrong },
      ]}
    />
  );
}

function InboxArt({ tokens }: { tokens: NoirlyTokens }) {
  const rows = [
    { done: true, w: "70%" as const, tag: "TODAY" },
    { done: false, w: "84%" as const, tag: "TUE 14" },
    { done: false, w: "58%" as const, tag: null },
  ];
  return (
    <View>
      <Frame tokens={tokens}>
        <Text variant="monoLabel" tone="muted" uppercase style={art.label}>
          Inbox · 3 open
        </Text>
        {rows.map((row, i) => (
          <View
            key={i}
            style={[art.row, i > 0 && { borderTopColor: tokens.color.hairline, borderTopWidth: StyleSheet.hairlineWidth }]}
          >
            <View
              style={[
                art.check,
                {
                  borderColor: row.done ? tokens.color.accent : tokens.color.hairlineStrong,
                  backgroundColor: row.done ? tokens.color.accent : "transparent",
                },
              ]}
            >
              {row.done ? (
                <MaterialDesignIcons name="check" size={12} color={tokens.color.accentInk} />
              ) : null}
            </View>
            <View style={art.rowBody}>
              <Line tokens={tokens} w={row.w} strong={!row.done} />
              {row.tag ? (
                <Text variant="meta" tone={row.done ? "muted" : "accent"}>
                  {row.tag}
                </Text>
              ) : null}
            </View>
          </View>
        ))}
      </Frame>
      <View style={[art.fab, { backgroundColor: tokens.color.accent }]}>
        <MaterialDesignIcons name="plus" size={26} color={tokens.color.accentInk} />
      </View>
    </View>
  );
}

function BoardArt({ tokens }: { tokens: NoirlyTokens }) {
  const columns = [
    { name: "To do", cards: 3, active: false },
    { name: "Doing", cards: 2, active: true },
    { name: "Done", cards: 1, active: false },
  ];
  return (
    <View style={art.board}>
      {columns.map((column) => (
        <View
          key={column.name}
          style={[
            art.column,
            {
              borderColor: column.active ? tokens.color.accent : tokens.color.hairline,
              backgroundColor: column.active ? tokens.color.accentSoft : tokens.color.surface,
              borderRadius: tokens.radius.md,
            },
          ]}
        >
          <Text variant="monoLabel" tone={column.active ? "accent" : "muted"} uppercase>
            {column.name}
          </Text>
          {Array.from({ length: column.cards }).map((_, i) => (
            <View
              key={i}
              style={[
                art.card,
                {
                  backgroundColor: tokens.color.surface2,
                  borderColor: tokens.color.hairline,
                  borderRadius: tokens.radius.sm,
                },
              ]}
            >
              <Line tokens={tokens} w="80%" strong />
              <Line tokens={tokens} w="45%" />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function TogetherArt({ tokens }: { tokens: NoirlyTokens }) {
  const people = ["AR", "MK", "JS", "LT"];
  return (
    <Frame tokens={tokens}>
      <View style={art.liveRow}>
        <Text variant="monoLabel" tone="muted" uppercase>
          Website relaunch
        </Text>
        <View style={art.live}>
          <View style={[art.liveDot, { backgroundColor: tokens.color.positive }]} />
          <Text variant="meta" tone="positive">
            Live
          </Text>
        </View>
      </View>
      <View style={art.avatars}>
        {people.map((initials, i) => (
          <View
            key={initials}
            style={[
              art.avatar,
              {
                marginLeft: i === 0 ? 0 : -12,
                backgroundColor: i === 0 ? tokens.color.accent : tokens.color.surface2,
                borderColor: tokens.color.surface,
              },
            ]}
          >
            <Text
              variant="meta"
              weight="600"
              style={{ color: i === 0 ? tokens.color.accentInk : tokens.color.text }}
            >
              {initials}
            </Text>
          </View>
        ))}
      </View>
      <View style={[art.event, { borderTopColor: tokens.color.hairline }]}>
        <Text variant="meta" tone="secondary">
          MK moved “Pricing page” to Doing
        </Text>
        <Text variant="meta" tone="muted">
          now
        </Text>
      </View>
    </Frame>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    minHeight: 56,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  skip: { minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.sm },
  slide: { flex: 1, paddingHorizontal: 20, justifyContent: "flex-end", gap: spacing.md },
  art: { flex: 1, justifyContent: "center", paddingVertical: spacing.lg },
  title: { marginTop: spacing.xs },
  footer: { paddingHorizontal: 20, paddingTop: spacing.xl, paddingBottom: spacing.lg, gap: spacing.xl },
  dots: { flexDirection: "row", gap: 6, alignItems: "center" },
  dot: { height: 6, borderRadius: 3 },
});

const art = StyleSheet.create({
  frame: { borderWidth: StyleSheet.hairlineWidth, padding: spacing.lg },
  label: { marginBottom: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  rowBody: { flex: 1, gap: 6 },
  check: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  line: { height: 8, borderRadius: 4 },
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: -24,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  board: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  column: { flex: 1, borderWidth: StyleSheet.hairlineWidth, padding: spacing.sm, gap: spacing.sm },
  card: { borderWidth: StyleSheet.hairlineWidth, padding: spacing.sm, gap: 6 },
  liveRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  live: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  avatars: { flexDirection: "row", marginVertical: spacing.xl },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  event: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
  },
});
