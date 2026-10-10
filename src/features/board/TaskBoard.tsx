import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  ScrollView,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { Card, Text, useTheme } from "@noirly-dev/ui-native";
import type { BoardColumn, Tag, Task } from "../../types";
import { spacing } from "../../theme";
import { TaskMetaLine } from "../../ui/TaskMeta";
import type { WorkspaceMember } from "../workspace/members";
import {
  buildReorderMoves,
  groupTasksByColumn,
  moveTask,
  resolveBoardColumns,
  type BoardColumnView,
  type BoardMove,
  type ColumnTasks,
} from "./board-order";

type Props = {
  columns: BoardColumn[];
  tasks: Task[];
  tags: Tag[];
  members: WorkspaceMember[];
  writable: boolean;
  onOpenTask: (taskId: string) => void;
  onQuickEdit: (task: Task) => void;
  onReorder: (moves: BoardMove[]) => Promise<void>;
};

const COLUMN_WIDTH = 272;
const COLUMN_GAP = spacing.md;
const EDGE = 48;
const AUTOSCROLL_STEP = 14;
/** How long the finger rests in the edge zone before the board starts scrolling. */
const EDGE_DWELL_MS = 350;
/** Below this travel a long-press counts as "hold", which opens quick edit. */
const HOLD_SLOP = 10;

type HostView = React.ComponentRef<typeof View>;
type Rect = { x: number; y: number; width: number; height: number };
type Hover = { columnId: string; index: number };
type Layout = {
  root: Rect;
  scrollX0: number;
  columns: Array<{ id: string; rect: Rect }>;
  /** Mid-Y of every card per column, top to bottom, the dragged card excluded. */
  cards: Map<string, number[]>;
};

function measure(view: HostView | null): Promise<Rect | null> {
  return new Promise((resolve) => {
    if (!view) {
      resolve(null);
      return;
    }
    view.measureInWindow((x: number, y: number, width: number, height: number) =>
      resolve({ x, y, width, height }),
    );
  });
}

/**
 * Kanban board with long-press drag and drop, the touch version of the web
 * board's dnd-kit: hold a card, drag it to a slot in any column (the board
 * scrolls when you reach an edge), and let go. Positions are rewritten with the
 * same dense ordering as web. Canceled tasks are hidden.
 */
export function TaskBoard({
  columns,
  tasks,
  tags,
  members,
  writable,
  onOpenTask,
  onQuickEdit,
  onReorder,
}: Props) {
  const tokens = useTheme();
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState<Task | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const views = useMemo(() => resolveBoardColumns(columns), [columns]);
  const groups = useMemo(() => groupTasksByColumn(tasks, views), [tasks, views]);

  const rootRef = useRef<HostView>(null);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const columnRefs = useRef(new Map<string, HostView | null>());
  const cardRefs = useRef(new Map<string, HostView | null>());
  const layout = useRef<Layout | null>(null);
  const scroll = useRef({ x: 0, contentWidth: 0, viewWidth: 0 });
  const pointer = useRef({ x: 0, y: 0 });
  const hoverRef = useRef<Hover | null>(null);
  const autoScroll = useRef<ReturnType<typeof setInterval> | null>(null);
  const edgeDwell = useRef<{ direction: -1 | 1; timer: ReturnType<typeof setTimeout> } | null>(
    null,
  );

  // Ghost position, relative to the board root. Written on the UI thread.
  const ghostX = useSharedValue(0);
  const ghostY = useSharedValue(0);
  const rootX = useSharedValue(0);
  const rootY = useSharedValue(0);

  const ghostStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: ghostX.value }, { translateY: ghostY.value }],
  }));

  const measureRoot = useCallback(() => {
    void measure(rootRef.current).then((rect) => {
      if (!rect) return;
      rootX.value = rect.x;
      rootY.value = rect.y;
    });
  }, [rootX, rootY]);

  const move = useCallback(
    async (taskId: string, toColumnId: string, toIndex?: number) => {
      if (!writable || busy) return;
      const result = moveTask(groups, taskId, toColumnId, toIndex);
      if (!result) return;
      // Dropping a card back where it was is not a move.
      const before = groups[toColumnId]!.findIndex((task) => task.id === taskId);
      const after = result.groups[toColumnId]!.findIndex((task) => task.id === taskId);
      if (result.affected.length === 1 && before === after) return;
      setBusy(true);
      try {
        await onReorder(buildReorderMoves(result.groups, views, result.affected));
      } catch (error) {
        Alert.alert("Move failed", error instanceof Error ? error.message : "Unknown error");
      } finally {
        setBusy(false);
      }
    },
    [busy, groups, onReorder, views, writable],
  );

  const targetAt = useCallback((x: number, y: number): Hover | null => {
    const current = layout.current;
    if (!current) return null;
    const shift = current.scrollX0 - scroll.current.x;
    const column = current.columns.find(
      ({ rect }) => x >= rect.x + shift && x <= rect.x + shift + rect.width,
    );
    if (!column) return null;
    const mids = current.cards.get(column.id) ?? [];
    return { columnId: column.id, index: mids.filter((mid) => mid < y).length };
  }, []);

  const updateHover = useCallback(() => {
    const next = targetAt(pointer.current.x, pointer.current.y);
    const prev = hoverRef.current;
    if (prev?.columnId === next?.columnId && prev?.index === next?.index) return;
    hoverRef.current = next;
    setHover(next);
  }, [targetAt]);

  const stopAutoScroll = useCallback(() => {
    if (edgeDwell.current) clearTimeout(edgeDwell.current.timer);
    edgeDwell.current = null;
    if (autoScroll.current) clearInterval(autoScroll.current);
    autoScroll.current = null;
  }, []);

  const beginScrolling = useCallback(
    (direction: -1 | 1) => {
      if (autoScroll.current) return;
      autoScroll.current = setInterval(() => {
        const { x, contentWidth, viewWidth } = scroll.current;
        const max = Math.max(0, contentWidth - viewWidth);
        const next = Math.max(0, Math.min(max, x + direction * AUTOSCROLL_STEP));
        if (next === x) return;
        scroll.current.x = next;
        scrollRef.current?.scrollTo({ x: next, animated: false });
        updateHover();
      }, 16);
    },
    [updateHover],
  );

  /** Starts scrolling only once the finger has rested at the edge for a moment. */
  const startAutoScroll = useCallback(
    (direction: -1 | 1) => {
      if (autoScroll.current || edgeDwell.current?.direction === direction) return;
      if (edgeDwell.current) clearTimeout(edgeDwell.current.timer);
      edgeDwell.current = {
        direction,
        timer: setTimeout(() => {
          edgeDwell.current = null;
          beginScrolling(direction);
        }, EDGE_DWELL_MS),
      };
    },
    [beginScrolling],
  );

  useEffect(() => stopAutoScroll, [stopAutoScroll]);

  const onDragStart = useCallback(
    (taskId: string) => {
      const task = tasks.find((item) => item.id === taskId);
      if (!task) return;
      setDragging(task);
      layout.current = null;
      void (async () => {
        const root = await measure(rootRef.current);
        if (!root) return;
        const measured = await Promise.all(
          views.map(async (column) => ({
            id: column.id,
            rect: await measure(columnRefs.current.get(column.id) ?? null),
          })),
        );
        const cards = new Map<string, number[]>();
        for (const column of views) {
          const rects = await Promise.all(
            (groups[column.id] ?? [])
              .filter((item) => item.id !== taskId)
              .map((item) => measure(cardRefs.current.get(item.id) ?? null)),
          );
          cards.set(
            column.id,
            rects.filter((rect): rect is Rect => rect != null).map((rect) => rect.y + rect.height / 2),
          );
        }
        layout.current = {
          root,
          scrollX0: scroll.current.x,
          columns: measured.filter(
            (column): column is { id: string; rect: Rect } => column.rect != null,
          ),
          cards,
        };
        updateHover();
      })();
    },
    [groups, tasks, updateHover, views],
  );

  const onDragMove = useCallback(
    (x: number, y: number) => {
      pointer.current = { x, y };
      updateHover();
      const root = layout.current?.root;
      if (!root) return;
      if (x < root.x + EDGE) startAutoScroll(-1);
      else if (x > root.x + root.width - EDGE) startAutoScroll(1);
      else stopAutoScroll();
    },
    [startAutoScroll, stopAutoScroll, updateHover],
  );

  const onDragEnd = useCallback(
    (taskId: string, travelled: number, completed: boolean) => {
      stopAutoScroll();
      const target = hoverRef.current;
      hoverRef.current = null;
      layout.current = null;
      setHover(null);
      setDragging(null);
      if (!completed) return;
      if (travelled < HOLD_SLOP) {
        const task = tasks.find((item) => item.id === taskId);
        if (task) onQuickEdit(task);
        return;
      }
      if (target) void move(taskId, target.columnId, target.index);
    },
    [move, onQuickEdit, stopAutoScroll, tasks],
  );

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    scroll.current.x = event.nativeEvent.contentOffset.x;
  }

  return (
    <View ref={rootRef} style={styles.root} onLayout={measureRoot} collapsable={false}>
      <ScrollView
        // gesture-handler types this ref as the component, not the instance it
        // actually receives under RN 0.87, so it is narrowed here.
        ref={(instance: unknown) => {
          scrollRef.current = instance as ScrollViewInstance | null;
        }}
        horizontal
        contentContainerStyle={styles.row}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        scrollEnabled={!dragging}
        onContentSizeChange={(width) => {
          scroll.current.contentWidth = width;
        }}
        onLayout={(event) => {
          scroll.current.viewWidth = event.nativeEvent.layout.width;
        }}
      >
        {views.map((column) => (
          <BoardColumnView
            key={column.id}
            column={column}
            views={views}
            groups={groups}
            tags={tags}
            members={members}
            writable={writable && !busy}
            dragging={dragging}
            hover={hover?.columnId === column.id ? hover.index : null}
            setColumnRef={(view) => columnRefs.current.set(column.id, view)}
            setCardRef={(taskId, view) => cardRefs.current.set(taskId, view)}
            ghostX={ghostX}
            ghostY={ghostY}
            rootX={rootX}
            rootY={rootY}
            onOpenTask={onOpenTask}
            onQuickEdit={onQuickEdit}
            onMove={(taskId, toColumnId, toIndex) => void move(taskId, toColumnId, toIndex)}
            onDragStart={onDragStart}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
            accent={tokens.color.accent}
            accentSoft={tokens.color.accentSoft}
          />
        ))}
      </ScrollView>

      {dragging ? (
        <Animated.View pointerEvents="none" style={[styles.ghost, ghostStyle]}>
          <Card variant="raised" style={[styles.card, { borderColor: tokens.color.accent }]}>
            <View style={styles.cardBody}>
              <Text variant="label" weight="600">
                {dragging.title}
              </Text>
              <TaskMetaLine
                priority={dragging.priority}
                dueAt={dragging.dueAt}
                tagIds={dragging.tagIds}
                assigneeIds={dragging.assigneeIds}
                tags={tags}
                members={members}
              />
            </View>
          </Card>
        </Animated.View>
      ) : null}
    </View>
  );
}

type ColumnProps = {
  column: BoardColumnView;
  views: BoardColumnView[];
  groups: ColumnTasks;
  tags: Tag[];
  members: WorkspaceMember[];
  writable: boolean;
  dragging: Task | null;
  hover: number | null;
  setColumnRef: (view: HostView | null) => void;
  setCardRef: (taskId: string, view: HostView | null) => void;
  ghostX: SharedValue<number>;
  ghostY: SharedValue<number>;
  rootX: SharedValue<number>;
  rootY: SharedValue<number>;
  onOpenTask: (taskId: string) => void;
  onQuickEdit: (task: Task) => void;
  onMove: (taskId: string, toColumnId: string, toIndex?: number) => void;
  onDragStart: (taskId: string) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: (taskId: string, travelled: number, completed: boolean) => void;
  accent: string;
  accentSoft: string;
};

function BoardColumnView({
  column,
  views,
  groups,
  hover,
  dragging,
  setColumnRef,
  accent,
  accentSoft,
  ...rest
}: ColumnProps) {
  const columnTasks = groups[column.id] ?? [];
  const visible = columnTasks.filter((task) => task.id !== dragging?.id);
  const indicator = <View style={[styles.indicator, { backgroundColor: accent }]} />;

  return (
    <View
      ref={setColumnRef}
      testID={`board-column-${column.name}`}
      collapsable={false}
      style={[
        styles.column,
        hover != null && { backgroundColor: accentSoft, borderRadius: 12 },
      ]}
    >
      <View style={styles.columnHeader}>
        <Text variant="monoLabel" tone={hover != null ? "accent" : "muted"}>
          {column.name}
        </Text>
        <Text variant="meta" tone="muted">
          {columnTasks.length}
        </Text>
      </View>
      <ScrollView
        style={styles.columnScroll}
        contentContainerStyle={styles.columnContent}
        nestedScrollEnabled
        scrollEnabled={!dragging}
      >
        {columnTasks.length === 0 && hover == null ? (
          <Text variant="meta" tone="muted" style={styles.empty}>
            {rest.writable ? "Drop tasks here" : "No tasks"}
          </Text>
        ) : null}
        {columnTasks.map((task) => {
          const visibleIndex = visible.indexOf(task);
          return (
            <View key={task.id}>
              {hover != null && visibleIndex === hover ? indicator : null}
              <DraggableCard
                task={task}
                column={column}
                views={views}
                indexInColumn={columnTasks.indexOf(task)}
                columnSize={columnTasks.length}
                isDragging={task.id === dragging?.id}
                {...rest}
              />
            </View>
          );
        })}
        {hover != null && hover >= visible.length ? indicator : null}
      </ScrollView>
    </View>
  );
}

type CardProps = Omit<
  ColumnProps,
  "groups" | "hover" | "dragging" | "setColumnRef" | "accent" | "accentSoft"
> & {
  task: Task;
  indexInColumn: number;
  columnSize: number;
  isDragging: boolean;
};

function DraggableCard({
  task,
  column,
  views,
  indexInColumn,
  columnSize,
  isDragging,
  tags,
  members,
  writable,
  setCardRef,
  ghostX,
  ghostY,
  rootX,
  rootY,
  onOpenTask,
  onQuickEdit,
  onMove,
  onDragStart,
  onDragMove,
  onDragEnd,
}: CardProps) {
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);
  const started = useSharedValue(false);
  const taskId = task.id;

  const pan = Gesture.Pan()
    .enabled(writable)
    .activateAfterLongPress(280)
    .onStart((event) => {
      originX.value = event.absoluteX - event.x - rootX.value;
      originY.value = event.absoluteY - event.y - rootY.value;
      ghostX.value = originX.value;
      ghostY.value = originY.value;
      started.value = true;
      scheduleOnRN(onDragStart, taskId);
    })
    .onUpdate((event) => {
      ghostX.value = originX.value + event.translationX;
      ghostY.value = originY.value + event.translationY;
      scheduleOnRN(onDragMove, event.absoluteX, event.absoluteY);
    })
    .onFinalize((event, success) => {
      if (!started.value) return;
      started.value = false;
      const travelled = Math.hypot(event.translationX, event.translationY);
      scheduleOnRN(onDragEnd, taskId, travelled, success);
    });

  const tap = Gesture.Tap()
    .maxDuration(250)
    .onEnd((_event, success) => {
      if (success) scheduleOnRN(onOpenTask, taskId);
    });

  const gesture = Gesture.Race(pan, tap);

  // Screen readers can't drag; the same moves are offered as actions.
  const others = views.filter((view) => view.id !== column.id);
  const actions = writable
    ? [
        { name: "edit", label: "Quick edit" },
        ...(indexInColumn > 0 ? [{ name: "up", label: "Move up" }] : []),
        ...(indexInColumn < columnSize - 1 ? [{ name: "down", label: "Move down" }] : []),
        ...others.map((view) => ({ name: `to:${view.name}`, label: `Move to ${view.name}` })),
      ]
    : [];

  function onAccessibilityAction(event: AccessibilityActionEvent) {
    const name = event.nativeEvent.actionName;
    if (name === "activate") onOpenTask(task.id);
    else if (name === "edit") onQuickEdit(task);
    else if (name === "up") onMove(task.id, column.id, indexInColumn - 1);
    else if (name === "down") onMove(task.id, column.id, indexInColumn + 1);
    else if (name.startsWith("to:")) {
      const target = others.find((view) => view.name === name.slice(3));
      if (target) onMove(task.id, target.id);
    }
  }

  return (
    <GestureDetector gesture={gesture}>
      <View
        ref={(view) => setCardRef(task.id, view)}
        // Cards still being saved get their own id, so UI tests wait for the saved one.
        testID={task.id.startsWith("tmp-") ? `board-card-pending-${task.title}` : `board-card-${task.title}`}
        collapsable={false}
        accessible
        accessibilityRole="button"
        accessibilityLabel={task.title}
        accessibilityHint={writable ? "Long press and drag to move" : undefined}
        accessibilityActions={[{ name: "activate" }, ...actions]}
        onAccessibilityAction={onAccessibilityAction}
        style={isDragging ? styles.lifted : undefined}
      >
        <Card style={styles.card}>
          <View style={styles.cardBody}>
            <Text
              variant="label"
              weight="600"
              tone={task.status === "done" ? "muted" : "default"}
            >
              {task.title}
            </Text>
            <TaskMetaLine
              priority={task.priority}
              dueAt={task.dueAt}
              tagIds={task.tagIds}
              assigneeIds={task.assigneeIds}
              tags={tags}
              members={members}
            />
          </View>
        </Card>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  row: { padding: spacing.lg, gap: COLUMN_GAP },
  column: { width: COLUMN_WIDTH, flex: 1, paddingHorizontal: 4 },
  columnScroll: { flex: 1 },
  columnContent: { paddingBottom: spacing.xl },
  columnHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  empty: { paddingHorizontal: spacing.xs, paddingVertical: spacing.md },
  card: { marginBottom: spacing.sm },
  cardBody: { padding: spacing.md, gap: spacing.sm },
  lifted: { opacity: 0.3 },
  indicator: { height: 3, borderRadius: 2, marginBottom: spacing.sm },
  ghost: {
    position: "absolute",
    top: 0,
    left: 0,
    width: COLUMN_WIDTH - 8,
    opacity: 0.95,
  },
});
