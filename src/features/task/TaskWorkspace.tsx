import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Card,
  Input,
  PageHeader,
  SkeletonText,
  Tabs,
  Text,
  useTheme,
} from "@noirly-dev/ui-native";
import { shouldApplyLww } from "@noirly-dev/realtime-shared";
import { api } from "../../api/client";
import { meName, useMe } from "../../auth/useMe";
import { can } from "../../permissions";
import { PresenceAvatars, useProjectRealtime } from "../../realtime/ProjectRealtime";
import { colors, spacing } from "../../theme";
import type {
  BoardColumn,
  Tag,
  Task,
  TaskPriority,
  TaskStatus,
} from "../../types";
import { DatePickerSheet } from "../../ui/DatePickerSheet";
import { FilterChip } from "../../ui/FilterChip";
import { OptionSheet } from "../../ui/Sheet";
import { useWorkspace } from "../../workspace/WorkspaceContext";
import { TaskBoard } from "../board/TaskBoard";
import type { BoardMove } from "../board/board-order";
import { TaskCalendar } from "../calendar/TaskCalendar";
import type { WorkspaceMember } from "../workspace/members";
import type { DuePreset } from "./dates";
import {
  DUE_FILTERS,
  optionLabel,
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
} from "./options";
import { TaskList } from "./TaskList";
import { TaskQuickEdit } from "./TaskQuickEdit";
import { QuickAddSheet } from "./QuickAddSheet";

/** Height of the floating add button plus its margin, kept clear under lists. */
const FAB_CLEARANCE = 88;

export type TaskView = "list" | "board" | "calendar";

type Props = {
  workspaceId: string;
  /** `null` is the workspace Inbox (unfiled tasks). */
  projectId: string | null;
  projectName: string;
  initialView?: TaskView;
  onOpenTask: (taskId: string) => void;
  /** True on a tab's root screen, which has no navigation header above it. */
  topInset?: boolean;
};

type SheetKind =
  | "quick-add"
  | "add-priority"
  | "add-due"
  | "filter-status"
  | "filter-priority"
  | "filter-due";

const ANY_STATUS = [
  { value: "" as const, label: "Any status" },
  ...STATUS_OPTIONS,
];
const ANY_PRIORITY = [
  { value: "" as const, label: "Any priority" },
  ...PRIORITY_OPTIONS,
];

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

/**
 * The mobile counterpart of the web `TaskWorkspace`: one component behind both
 * the Inbox and a project, with list / board / calendar views, search and
 * filters, quick add, optimistic edits, live updates and fallback polling.
 */
export function TaskWorkspace({
  workspaceId,
  projectId,
  projectName,
  initialView,
  onOpenTask,
  topInset = false,
}: Props) {
  const tokens = useTheme();
  const insets = useSafeAreaInsets();
  const { role } = useWorkspace();
  const me = useMe();
  const focused = useIsFocused();
  const canWrite = Boolean(role && can(role, "task.write"));
  const isInbox = !projectId;

  const [view, setView] = useState<TaskView>(
    initialView ?? (projectId ? "board" : "list"),
  );
  const [tasks, setTasks] = useState<Task[]>([]);
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("none");
  const [dueAt, setDueAt] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "">("");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "">("");
  const [dueFilter, setDueFilter] = useState<DuePreset | "">("");
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const [sheet, setSheet] = useState<SheetKind | null>(null);
  const [quickEditId, setQuickEditId] = useState<string | null>(null);

  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const loadSeq = useRef(0);

  useEffect(() => {
    setView(initialView ?? (projectId ? "board" : "list"));
  }, [projectId, initialView]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filters = useMemo(
    () => ({
      projectId: projectId ?? undefined,
      inbox: isInbox,
      root: true,
      assigneeId: assignedToMe && me?.id ? me.id : undefined,
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
      search: search || undefined,
      due: dueFilter || undefined,
    }),
    [projectId, isInbox, assignedToMe, me?.id, statusFilter, priorityFilter, search, dueFilter],
  );

  const activeFilterCount =
    (search ? 1 : 0) +
    (statusFilter ? 1 : 0) +
    (priorityFilter ? 1 : 0) +
    (dueFilter ? 1 : 0) +
    (assignedToMe ? 1 : 0);

  /** `silent` refreshes without the skeleton — for polling and live events. */
  const load = useCallback(
    async (mode: "initial" | "refresh" | "silent" = "initial") => {
      if (!workspaceId) return;
      const seq = ++loadSeq.current;
      if (mode === "refresh") setRefreshing(true);
      try {
        const [tasksRes, projectRes, tagsRes, membersRes] = await Promise.all([
          api.listTasks(workspaceId, filters),
          projectId ? api.getProject(projectId) : Promise.resolve(null),
          api.listTags(workspaceId).catch(() => null),
          api.listMembers(workspaceId).catch(() => null),
        ]);
        if (seq !== loadSeq.current) return;
        setTasks(tasksRes.tasks);
        if (projectRes) setColumns(projectRes.project.columns);
        if (tagsRes) setTags(tagsRes.tags);
        if (membersRes) setMembers(membersRes.members);
        setError(null);
      } catch (err) {
        if (seq !== loadSeq.current) return;
        if (mode !== "silent") setError(errorMessage(err));
      } finally {
        if (seq === loadSeq.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [workspaceId, projectId, filters],
  );

  // Switching project shows the skeleton rather than the previous project's rows.
  useEffect(() => {
    setLoading(true);
    setTasks([]);
    setColumns([]);
  }, [workspaceId, projectId]);

  // `load` changes with the filters, so this refetches on every filter change
  // as well as each time the screen regains focus (the editor may have changed
  // something).
  useFocusEffect(
    useCallback(() => {
      void load("silent");
    }, [load]),
  );

  const scheduledReload = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reloadSoon = useCallback(() => {
    if (scheduledReload.current) clearTimeout(scheduledReload.current);
    scheduledReload.current = setTimeout(() => void load("silent"), 400);
  }, [load]);
  useEffect(
    () => () => {
      if (scheduledReload.current) clearTimeout(scheduledReload.current);
    },
    [],
  );

  const { status: liveStatus, members: viewers } = useProjectRealtime({
    workspaceId,
    projectId,
    enabled: Boolean(projectId) && focused,
    presenceName: meName(me),
    onEvent: (event, data) => {
      if (event === "task.upsert") {
        const incoming = (data as { task?: Task }).task;
        if (!incoming) return;
        const cached = tasksRef.current.find((task) => task.id === incoming.id);
        if (!cached) {
          // A new task may or may not match the filters — let the server decide.
          if (!incoming.parentTaskId) reloadSoon();
          return;
        }
        if (
          shouldApplyLww(
            { version: Date.parse(incoming.updatedAt) },
            { version: Date.parse(cached.updatedAt) },
          )
        ) {
          setTasks((list) =>
            list.map((task) => (task.id === incoming.id ? incoming : task)),
          );
        }
      } else if (event === "task.delete") {
        const taskId = (data as { taskId?: string }).taskId;
        if (taskId) setTasks((list) => list.filter((task) => task.id !== taskId));
      } else if (event === "tasks.reordered") {
        const incoming = (data as { tasks?: Task[] }).tasks ?? [];
        const byId = new Map(incoming.map((task) => [task.id, task]));
        setTasks((list) => list.map((task) => byId.get(task.id) ?? task));
      }
    },
  });

  // Fallback polling, as on web: every 30s, or 60s once the socket is live.
  useEffect(() => {
    if (!focused) return;
    const interval = setInterval(
      () => void load("silent"),
      liveStatus === "ready" ? 60_000 : 30_000,
    );
    return () => clearInterval(interval);
  }, [focused, liveStatus, load]);

  function replaceTask(next: Task) {
    setTasks((list) => list.map((task) => (task.id === next.id ? next : task)));
  }

  async function patchTask(taskId: string, patch: Partial<Task>) {
    if (!canWrite) return;
    const previous = tasksRef.current;
    const before = previous.find((task) => task.id === taskId);
    setTasks((list) =>
      list.map((task) => (task.id === taskId ? { ...task, ...patch } : task)),
    );
    try {
      const { task } = await api.updateTask(taskId, patch);
      replaceTask(task);
      // Completing a recurring task spawns its next occurrence server-side.
      if (patch.status === "done" && before?.recurrence) reloadSoon();
    } catch (err) {
      setTasks(previous);
      Alert.alert("Update failed", errorMessage(err));
    }
  }

  async function deleteTask(taskId: string) {
    if (!canWrite) return;
    const previous = tasksRef.current;
    setTasks((list) => list.filter((task) => task.id !== taskId));
    try {
      await api.deleteTask(taskId);
    } catch (err) {
      setTasks(previous);
      Alert.alert("Delete failed", errorMessage(err));
    }
  }

  async function createTask() {
    const nextTitle = title.trim();
    if (!nextTitle || !canWrite) return;
    const now = new Date().toISOString();
    const optimistic: Task = {
      id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      workspaceId,
      projectId,
      columnId: null,
      title: nextTitle,
      description: null,
      status: "todo",
      priority,
      dueAt,
      startAt: null,
      completedAt: null,
      position: Date.now(),
      assigneeIds: [],
      tagIds: [],
      parentTaskId: null,
      recurrence: null,
      checklist: [],
      createdById: me?.id ?? "",
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    setTasks((list) => [optimistic, ...list]);
    setSheet(null);
    setTitle("");
    setPriority("none");
    setDueAt(null);
    try {
      const { task } = await api.createTask(workspaceId, {
        title: nextTitle,
        projectId,
        priority: optimistic.priority,
        dueAt: optimistic.dueAt,
      });
      setTasks((list) =>
        list.map((item) => (item.id === optimistic.id ? task : item)),
      );
    } catch (err) {
      setTasks((list) => list.filter((item) => item.id !== optimistic.id));
      setTitle(nextTitle);
      Alert.alert("Create failed", errorMessage(err));
    }
  }

  async function reorder(moves: BoardMove[]) {
    if (!projectId) return;
    const previous = tasksRef.current;
    const byId = new Map(moves.map((move) => [move.taskId, move]));
    setTasks((list) =>
      list.map((task) => {
        const move = byId.get(task.id);
        if (!move) return task;
        return {
          ...task,
          columnId: move.columnId,
          position: move.position,
          status: move.status,
          completedAt:
            move.status === "done" ? task.completedAt ?? new Date().toISOString() : null,
        };
      }),
    );
    try {
      const { tasks: updated } = await api.reorderTasks(projectId, moves);
      const fresh = new Map(updated.map((task) => [task.id, task]));
      setTasks((list) => list.map((task) => fresh.get(task.id) ?? task));
    } catch (err) {
      setTasks(previous);
      throw err;
    }
  }

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setStatusFilter("");
    setPriorityFilter("");
    setDueFilter("");
    setAssignedToMe(false);
  }

  const searchOpen = showSearch || Boolean(searchInput);
  const filterCount = activeFilterCount - (search ? 1 : 0);
  const chipsOpen = showFilters || filterCount > 0;

  const views = [
    { id: "list", label: "List" },
    ...(projectId ? [{ id: "board", label: "Board" }] : []),
    { id: "calendar", label: "Calendar" },
  ];
  const openCount = tasks.filter(
    (task) => task.status !== "done" && task.status !== "canceled",
  ).length;
  const quickEditTask = tasks.find((task) => task.id === quickEditId) ?? null;

  return (
    <View style={styles.root}>
      <PageHeader
        eyebrow={`${openCount} open · ${tasks.length} shown${canWrite ? "" : " · view only"}`}
        title={projectName}
        action={
          projectId ? (
            <PresenceAvatars members={viewers} status={liveStatus} />
          ) : undefined
        }
        style={[styles.header, topInset && { paddingTop: insets.top + spacing.md }]}
      />
      {/* View switcher and the list tools share one row, so the header keeps
          room for the title, the counts and live presence. */}
      <View style={[styles.toolbar, { borderBottomColor: tokens.color.hairline }]}>
        <Tabs
          items={views}
          activeId={view}
          onSelect={(id) => setView(id as TaskView)}
          style={styles.tabs}
        />
        <View style={styles.headerActions}>
          <IconButton
            testID="task-search-toggle"
            icon={searchOpen ? "close" : "magnify"}
            label={searchOpen ? "Close search" : "Search tasks"}
            active={Boolean(search)}
            onPress={() => {
              if (searchOpen) {
                setSearchInput("");
                setShowSearch(false);
              } else {
                setShowSearch(true);
              }
            }}
          />
          <IconButton
            testID="task-filters"
            icon="tune-variant"
            label={filterCount ? `Filters, ${filterCount} active` : "Filters"}
            active={chipsOpen}
            badge={filterCount}
            onPress={() => setShowFilters((value) => !value)}
          />
        </View>
      </View>

      {searchOpen ? (
        <View style={styles.searchRow}>
          <Input
            testID="task-search"
            placeholder="Search tasks"
            value={searchInput}
            onChangeText={setSearchInput}
            autoCapitalize="none"
            autoFocus={showSearch && !searchInput}
            returnKeyType="search"
            leading={
              <MaterialDesignIcons name="magnify" size={18} color={tokens.color.textMuted} />
            }
            style={styles.flex}
          />
        </View>
      ) : null}
      {chipsOpen ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipBar}
          contentContainerStyle={styles.chips}
          keyboardShouldPersistTaps="handled"
        >
          <FilterChip
            label="Assigned to me"
            active={assignedToMe}
            disabled={!me?.id}
            onPress={() => setAssignedToMe((value) => !value)}
          />
          <FilterChip
            label={statusFilter ? optionLabel(STATUS_OPTIONS, statusFilter) : "Status"}
            active={Boolean(statusFilter)}
            onPress={() => setSheet("filter-status")}
          />
          <FilterChip
            label={priorityFilter ? optionLabel(PRIORITY_OPTIONS, priorityFilter) : "Priority"}
            active={Boolean(priorityFilter)}
            onPress={() => setSheet("filter-priority")}
          />
          <FilterChip
            label={dueFilter ? optionLabel(DUE_FILTERS, dueFilter) : "Due"}
            active={Boolean(dueFilter)}
            onPress={() => setSheet("filter-due")}
          />
          {activeFilterCount ? <FilterChip label="Clear" onPress={clearFilters} /> : null}
        </ScrollView>
      ) : null}

      {error ? (
        <Text variant="meta" tone="destructive" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <View style={styles.flex}>
        {loading ? (
          <Card variant="flat" style={styles.loadingCard}>
            <SkeletonText lines={6} />
          </Card>
        ) : view === "list" ? (
          <TaskList
            tasks={tasks}
            tags={tags}
            members={members}
            canWrite={canWrite}
            emptyLabel={
              activeFilterCount
                ? "No matching tasks."
                : isInbox
                  ? "Inbox is empty. Add a task that is not in a project."
                  : "No tasks yet."
            }
            refreshing={refreshing}
            onRefresh={() => void load("refresh")}
            onOpenTask={onOpenTask}
            onQuickEdit={(task) => setQuickEditId(task.id)}
            onToggleDone={(task) =>
              void patchTask(task.id, {
                status: task.status === "done" ? "todo" : "done",
              })
            }
            onDelete={(taskId) => void deleteTask(taskId)}
            bottomInset={canWrite ? FAB_CLEARANCE : 0}
          />
        ) : view === "board" && projectId ? (
          <TaskBoard
            columns={columns}
            tasks={tasks}
            tags={tags}
            members={members}
            writable={canWrite}
            onOpenTask={onOpenTask}
            onQuickEdit={(task) => setQuickEditId(task.id)}
            onReorder={reorder}
          />
        ) : (
          <TaskCalendar tasks={tasks} onOpenTask={onOpenTask} />
        )}
      </View>

      {canWrite ? (
        <Pressable
          testID="task-add-fab"
          onPress={() => setSheet("quick-add")}
          accessibilityRole="button"
          accessibilityLabel={isInbox ? "Add an inbox task" : "Add a task"}
          style={({ pressed }) => [
            styles.fab,
            {
              backgroundColor: tokens.color.accent,
              transform: [{ scale: pressed ? 0.94 : 1 }],
            },
          ]}
        >
          <MaterialDesignIcons name="plus" size={28} color={tokens.color.accentInk} />
        </Pressable>
      ) : (
        <Text variant="meta" tone="muted" style={styles.viewOnly}>
          You have view-only access. Ask an admin if you need to edit tasks.
        </Text>
      )}

      <QuickAddSheet
        visible={sheet === "quick-add"}
        placeholder={isInbox ? "Add an inbox task" : "Add a task"}
        title={title}
        priority={priority}
        dueAt={dueAt}
        onChangeTitle={setTitle}
        onChangePriority={setPriority}
        onChangeDue={setDueAt}
        onPickDate={() => setSheet("add-due")}
        onSubmit={() => void createTask()}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === "add-priority"}
        title="Priority"
        options={PRIORITY_OPTIONS}
        value={priority}
        onSelect={setPriority}
        onClose={() => setSheet(null)}
      />
      <DatePickerSheet
        visible={sheet === "add-due"}
        value={dueAt}
        onChange={setDueAt}
        onClose={() => setSheet("quick-add")}
      />
      <OptionSheet
        visible={sheet === "filter-status"}
        title="Status"
        options={ANY_STATUS}
        value={statusFilter}
        onSelect={setStatusFilter}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === "filter-priority"}
        title="Priority"
        options={ANY_PRIORITY}
        value={priorityFilter}
        onSelect={setPriorityFilter}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === "filter-due"}
        title="Due"
        options={DUE_FILTERS}
        value={dueFilter}
        onSelect={setDueFilter}
        onClose={() => setSheet(null)}
      />
      <TaskQuickEdit
        task={quickEditTask}
        onClose={() => setQuickEditId(null)}
        onOpen={onOpenTask}
        onPatch={(taskId, patch) => void patchTask(taskId, patch)}
        onDelete={(taskId) => void deleteTask(taskId)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: { paddingTop: spacing.md },
  headerActions: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  chipBar: { flexGrow: 0 },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingRight: spacing.lg,
    marginBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  // The row draws the rule; the tabs keep only their sliding marker.
  tabs: { flex: 1, borderBottomWidth: 0 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  chips: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  error: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  loadingCard: { margin: spacing.lg, padding: spacing.lg },
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  viewOnly: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});

type IconName = React.ComponentProps<typeof MaterialDesignIcons>["name"];

/** A 44pt round header control — search, filters — with an optional count badge. */
function IconButton({
  testID,
  icon,
  label,
  active = false,
  badge = 0,
  onPress,
}: {
  testID: string;
  icon: IconName;
  label: string;
  active?: boolean;
  badge?: number;
  onPress: () => void;
}) {
  const tokens = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        iconStyles.button,
        {
          borderColor: active ? tokens.color.accent : tokens.color.hairline,
          backgroundColor: pressed
            ? tokens.color.surface2
            : active
              ? tokens.color.accentSoft
              : tokens.color.surface,
        },
      ]}
    >
      <MaterialDesignIcons
        name={icon}
        size={20}
        color={active ? tokens.color.accent : tokens.color.textSecondary}
      />
      {badge > 0 ? (
        <View style={[iconStyles.badge, { backgroundColor: tokens.color.accent }]}>
          <Text variant="meta" style={[iconStyles.badgeText, { color: tokens.color.accentInk }]}>
            {badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const iconStyles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 10, lineHeight: 12 },
});
