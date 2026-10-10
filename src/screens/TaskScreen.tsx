import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import {
  Button,
  Card,
  Input,
  Separator,
  SkeletonText,
  Text,
  useTheme,
} from "@noirly-dev/ui-native";
import { api } from "../api/client";
import { useMe } from "../auth/useMe";
import { ActivityFeed } from "../features/activity/ActivityFeed";
import { CommentThread } from "../features/comments/CommentThread";
import { ReportSheet, type ReportTarget } from "../features/report/ReportSheet";
import { formatDue } from "../features/task/dates";
import { optionLabel, PRIORITY_OPTIONS, STATUS_OPTIONS } from "../features/task/options";
import type { WorkspaceMember } from "../features/workspace/members";
import { can } from "../permissions";
import { useProjectRealtime } from "../realtime/ProjectRealtime";
import { colors, spacing } from "../theme";
import { ChoiceChips } from "../ui/ChoiceChips";
import { DatePickerSheet } from "../ui/DatePickerSheet";
import { FilterChip } from "../ui/FilterChip";
import { OptionSheet } from "../ui/Sheet";
import type {
  ChecklistItem,
  MemberRole,
  Project,
  Tag,
  Task,
  TaskPriority,
  TaskStatus,
} from "../types";
import { useWorkspace } from "../workspace/WorkspaceContext";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Task">;
type Repeat = "none" | "daily" | "weekly";

const STATUSES = STATUS_OPTIONS.map((option) => option.value);
const PRIORITIES = PRIORITY_OPTIONS.map((option) => option.value);
const REPEATS: readonly Repeat[] = ["none", "daily", "weekly"];
const REPEAT_LABEL: Record<Repeat, string> = {
  none: "Does not repeat",
  daily: "Daily",
  weekly: "Weekly",
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text variant="monoLabel" tone="muted">
        {label}
      </Text>
      {children}
    </View>
  );
}

/** The web task drawer, as a full screen. */
export function TaskScreen() {
  const route = useRoute<Props["route"]>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const tokens = useTheme();
  const { workspaceId, taskId } = route.params;
  const { workspaceId: activeWorkspaceId, role: activeRole } = useWorkspace();
  const me = useMe();
  // A search hit can open a task from a workspace other than the active one,
  // so the role is looked up for the task's own workspace in that case.
  const [ownRole, setOwnRole] = useState<MemberRole | null>(null);
  const role = workspaceId === activeWorkspaceId ? activeRole : ownRole;
  const writable = Boolean(role && can(role, "task.write"));

  useEffect(() => {
    if (workspaceId === activeWorkspaceId) return;
    let cancelled = false;
    api
      .getWorkspace(workspaceId)
      .then(({ workspace }) => !cancelled && setOwnRole(workspace.role))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [workspaceId, activeWorkspaceId]);

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [newCheck, setNewCheck] = useState("");
  const [newSubtask, setNewSubtask] = useState("");
  const [newTag, setNewTag] = useState("");
  const [sheet, setSheet] = useState<"project" | "due" | null>(null);
  const [reporting, setReporting] = useState<ReportTarget | null>(null);
  const [commentsKey, setCommentsKey] = useState(0);
  const [activityKey, setActivityKey] = useState(0);

  const taskRef = useRef(task);
  taskRef.current = task;
  const editingText = useRef(false);

  const applyTask = useCallback((next: Task) => {
    setTask(next);
    if (!editingText.current) {
      setTitle(next.title);
      setDescription(next.description ?? "");
    }
  }, []);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") setRefreshing(true);
      try {
        const [taskRes, projectsRes, tagsRes, membersRes, subtasksRes] =
          await Promise.all([
            api.getTask(taskId),
            api.listProjects(workspaceId).catch(() => null),
            api.listTags(workspaceId).catch(() => null),
            api.listMembers(workspaceId).catch(() => null),
            api.listTasks(workspaceId, { parentTaskId: taskId }).catch(() => null),
          ]);
        applyTask(taskRes.task);
        if (projectsRes) setProjects(projectsRes.projects);
        if (tagsRes) setTags(tagsRes.tags);
        if (membersRes) setMembers(membersRes.members);
        if (subtasksRes) setSubtasks(subtasksRes.tasks);
        if (mode === "refresh") {
          setCommentsKey((key) => key + 1);
          setActivityKey((key) => key + 1);
        }
      } catch (error) {
        Alert.alert("Load task failed", errorMessage(error));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [applyTask, taskId, workspaceId],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useProjectRealtime({
    workspaceId,
    projectId: task?.projectId ?? null,
    enabled: Boolean(task?.projectId),
    presence: false,
    onEvent: (event, data) => {
      if (event === "comment.created" && (data as { taskId?: string }).taskId === taskId) {
        setCommentsKey((key) => key + 1);
        setActivityKey((key) => key + 1);
      } else if (event === "task.upsert") {
        const incoming = (data as { task?: Task }).task;
        if (incoming?.id === taskId) {
          const current = taskRef.current;
          if (!current || Date.parse(incoming.updatedAt) >= Date.parse(current.updatedAt)) {
            applyTask(incoming);
            setActivityKey((key) => key + 1);
          }
        } else if (incoming?.parentTaskId === taskId) {
          setSubtasks((list) =>
            list.some((item) => item.id === incoming.id)
              ? list.map((item) => (item.id === incoming.id ? incoming : item))
              : [...list, incoming],
          );
        }
      } else if (event === "task.delete" && (data as { taskId?: string }).taskId === taskId) {
        Alert.alert("Task deleted", "Someone else deleted this task.");
        navigation.goBack();
      }
    },
  });

  // Keep the header title in step with the task.
  useEffect(() => {
    if (task) navigation.setOptions({ title: task.parentTaskId ? "Subtask" : "Task" });
  }, [navigation, task]);

  async function save(patch: Partial<Task>) {
    if (!writable || !taskRef.current) return;
    const previous = taskRef.current;
    setTask({ ...previous, ...patch });
    try {
      const { task: next } = await api.updateTask(taskId, patch);
      applyTask(next);
      setActivityKey((key) => key + 1);
    } catch (error) {
      applyTask(previous);
      Alert.alert("Save failed", errorMessage(error));
    }
  }

  function remove() {
    Alert.alert("Delete task?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await api.deleteTask(taskId);
              navigation.goBack();
            } catch (error) {
              Alert.alert("Delete failed", errorMessage(error));
            }
          })();
        },
      },
    ]);
  }

  async function createTag() {
    const name = newTag.trim();
    if (!name || !task) return;
    try {
      const { tag } = await api.createTag(workspaceId, { name });
      setNewTag("");
      setTags((list) => (list.some((item) => item.id === tag.id) ? list : [...list, tag]));
      if (!task.tagIds.includes(tag.id)) {
        void save({ tagIds: [...task.tagIds, tag.id] });
      }
    } catch (error) {
      Alert.alert("Create tag failed", errorMessage(error));
    }
  }

  async function addSubtask() {
    const name = newSubtask.trim();
    if (!name || !task) return;
    setNewSubtask("");
    try {
      const { task: created } = await api.createTask(workspaceId, {
        title: name,
        parentTaskId: taskId,
        projectId: task.projectId,
      });
      setSubtasks((list) => [...list, created]);
    } catch (error) {
      setNewSubtask(name);
      Alert.alert("Add subtask failed", errorMessage(error));
    }
  }

  async function toggleSubtask(subtask: Task) {
    const nextStatus: TaskStatus = subtask.status === "done" ? "todo" : "done";
    setSubtasks((list) =>
      list.map((item) => (item.id === subtask.id ? { ...item, status: nextStatus } : item)),
    );
    try {
      const { task: next } = await api.updateTask(subtask.id, { status: nextStatus });
      setSubtasks((list) => list.map((item) => (item.id === next.id ? next : item)));
    } catch (error) {
      setSubtasks((list) =>
        list.map((item) => (item.id === subtask.id ? subtask : item)),
      );
      Alert.alert("Update failed", errorMessage(error));
    }
  }

  if (loading || !task) {
    return (
      <View style={styles.root}>
        <Card variant="flat" style={styles.loadingCard}>
          <SkeletonText lines={7} />
        </Card>
      </View>
    );
  }

  const checklist = task.checklist ?? [];
  const doneCount = checklist.filter((row) => row.completed).length;
  const isSubtask = Boolean(task.parentTaskId);
  const projectName = task.projectId
    ? projects.find((project) => project.id === task.projectId)?.name ?? "Project"
    : "Inbox";
  const repeat: Repeat = task.recurrence?.frequency ?? "none";

  function setChecklist(next: ChecklistItem[]) {
    void save({ checklist: next });
  }

  return (
    <ScrollView
      testID="task-scroll"
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load("refresh")}
          tintColor={tokens.color.accent}
        />
      }
    >
      <Input
        value={title}
        editable={writable}
        onChangeText={setTitle}
        onFocus={() => {
          editingText.current = true;
        }}
        onEndEditing={() => {
          editingText.current = false;
          const next = title.trim();
          if (!next) setTitle(task.title);
          else if (next !== task.title) void save({ title: next });
        }}
        inputStyle={tokens.type.pageTitle}
        placeholder="Task title"
        testID="task-title"
      />

      <Input
        value={description}
        editable={writable}
        multiline
        onChangeText={setDescription}
        onFocus={() => {
          editingText.current = true;
        }}
        onEndEditing={() => {
          editingText.current = false;
          const next = description.trim() || null;
          if (next !== (task.description ?? null)) void save({ description: next });
        }}
        placeholder="Add a description…"
        inputStyle={styles.body}
      />

      <Field label="Status">
        <ChoiceChips<TaskStatus>
          options={STATUSES}
          value={task.status}
          disabled={!writable}
          format={(value) => optionLabel(STATUS_OPTIONS, value)}
          onChange={(status) => void save({ status })}
        />
      </Field>

      <Field label="Priority">
        <ChoiceChips<TaskPriority>
          options={PRIORITIES}
          value={task.priority}
          disabled={!writable}
          format={(value) => optionLabel(PRIORITY_OPTIONS, value)}
          onChange={(priority) => void save({ priority })}
        />
      </Field>

      <View style={styles.pair}>
        <View style={styles.flex}>
          <Field label="Project">
            <FilterChip
              label={projectName}
              disabled={!writable}
              onPress={() => setSheet("project")}
            />
          </Field>
        </View>
        <View style={styles.flex}>
          <Field label="Due date">
            <FilterChip
              label={formatDue(task.dueAt) ?? "No due date"}
              active={Boolean(task.dueAt)}
              disabled={!writable}
              onPress={() => setSheet("due")}
            />
          </Field>
        </View>
      </View>

      <Field label="Repeat">
        <ChoiceChips<Repeat>
          options={REPEATS}
          value={repeat}
          disabled={!writable}
          format={(value) => REPEAT_LABEL[value]}
          onChange={(value) =>
            void save({
              recurrence: value === "none" ? null : { frequency: value, interval: 1 },
            })
          }
        />
      </Field>

      <Field label="Assignees">
        <View style={styles.wrap}>
          {members.map((member) => {
            const selected = task.assigneeIds.includes(member.userId);
            return (
              <FilterChip
                key={member.userId}
                label={member.displayName}
                active={selected}
                disabled={!writable}
                onPress={() =>
                  void save({
                    assigneeIds: selected
                      ? task.assigneeIds.filter((id) => id !== member.userId)
                      : [...task.assigneeIds, member.userId],
                  })
                }
              />
            );
          })}
          {members.length === 0 ? (
            <Text variant="meta" tone="muted">
              Loading members…
            </Text>
          ) : null}
        </View>
      </Field>

      <Field label="Tags">
        <View style={styles.wrap}>
          {tags.map((tag) => {
            const selected = task.tagIds.includes(tag.id);
            return (
              <FilterChip
                key={tag.id}
                label={tag.name}
                active={selected}
                disabled={!writable}
                onPress={() =>
                  void save({
                    tagIds: selected
                      ? task.tagIds.filter((id) => id !== tag.id)
                      : [...task.tagIds, tag.id],
                  })
                }
              />
            );
          })}
          {tags.length === 0 ? (
            <Text variant="meta" tone="muted">
              No tags yet.
            </Text>
          ) : null}
        </View>
        {writable ? (
          <View style={styles.addRow}>
            <Input
              testID="task-tag-input"
              placeholder="New tag"
              value={newTag}
              onChangeText={setNewTag}
              returnKeyType="done"
              onSubmitEditing={() => void createTag()}
              style={styles.flex}
            />
            <Button
              label="Add"
              size="sm"
              variant="ghost"
              disabled={!newTag.trim()}
              onPress={() => void createTag()}
              testID="task-tag-add"
            />
          </View>
        ) : null}
      </Field>

      <Field
        label={checklist.length ? `Checklist · ${doneCount}/${checklist.length}` : "Checklist"}
      >
        {checklist.length > 0 ? (
          <Card variant="flat">
            {checklist.map((item, index) => (
              <View key={item.id || `check-${index}`}>
                {index > 0 ? <Separator /> : null}
                <View style={styles.checkRow}>
                  <Pressable
                    disabled={!writable}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: item.completed }}
                    style={styles.checkPress}
                    onPress={() =>
                      setChecklist(
                        checklist.map((row, rowIndex) =>
                          rowIndex === index ? { ...row, completed: !row.completed } : row,
                        ),
                      )
                    }
                  >
                    <Text
                      variant="body"
                      tone={item.completed ? "accent" : "muted"}
                      style={styles.checkMark}
                    >
                      {item.completed ? "✓" : "○"}
                    </Text>
                    <Text
                      variant="body"
                      tone={item.completed ? "muted" : "default"}
                      style={[styles.flex, item.completed && styles.struck]}
                    >
                      {item.title}
                    </Text>
                  </Pressable>
                  {writable ? (
                    <Pressable
                      onPress={() =>
                        setChecklist(checklist.filter((_, rowIndex) => rowIndex !== index))
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${item.title}`}
                      hitSlop={8}
                    >
                      <Text variant="meta" tone="muted">
                        Remove
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))}
          </Card>
        ) : null}
        {writable ? (
          <View style={styles.addRow}>
            <Input
              testID="task-checklist-input"
              placeholder="Add checklist item"
              value={newCheck}
              onChangeText={setNewCheck}
              returnKeyType="done"
              onSubmitEditing={() => {
                const name = newCheck.trim();
                if (!name) return;
                setNewCheck("");
                setChecklist([
                  ...checklist,
                  {
                    id: `tmp-${Date.now()}`,
                    title: name,
                    completed: false,
                    position: (checklist.length + 1) * 1000,
                  },
                ]);
              }}
              style={styles.flex}
            />
            <Button
              label="Add"
              size="sm"
              variant="ghost"
              disabled={!newCheck.trim()}
              testID="task-checklist-add"
              onPress={() => {
                const name = newCheck.trim();
                if (!name) return;
                setNewCheck("");
                setChecklist([
                  ...checklist,
                  {
                    id: `tmp-${Date.now()}`,
                    title: name,
                    completed: false,
                    position: (checklist.length + 1) * 1000,
                  },
                ]);
              }}
            />
          </View>
        ) : null}
      </Field>

      {!isSubtask ? (
        <Field label={subtasks.length ? `Subtasks · ${subtasks.length}` : "Subtasks"}>
          {subtasks.length > 0 ? (
            <Card variant="flat">
              {subtasks.map((subtask, index) => (
                <View key={subtask.id}>
                  {index > 0 ? <Separator /> : null}
                  <View style={styles.checkRow}>
                    <Pressable
                      disabled={!writable}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: subtask.status === "done" }}
                      onPress={() => void toggleSubtask(subtask)}
                      hitSlop={8}
                    >
                      <Text
                        variant="body"
                        tone={subtask.status === "done" ? "accent" : "muted"}
                        style={styles.checkMark}
                      >
                        {subtask.status === "done" ? "✓" : "○"}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={styles.flex}
                      onPress={() =>
                        navigation.push("Task", { workspaceId, taskId: subtask.id })
                      }
                      accessibilityRole="button"
                    >
                      <Text
                        variant="body"
                        tone={subtask.status === "done" ? "muted" : "default"}
                        style={subtask.status === "done" ? styles.struck : undefined}
                      >
                        {subtask.title}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </Card>
          ) : (
            <Text variant="meta" tone="muted">
              No subtasks yet.
            </Text>
          )}
          {writable ? (
            <View style={styles.addRow}>
              <Input
                testID="task-subtask-input"
                placeholder="Add subtask"
                value={newSubtask}
                onChangeText={setNewSubtask}
                returnKeyType="done"
                onSubmitEditing={() => void addSubtask()}
                style={styles.flex}
              />
              <Button
                label="Add"
                size="sm"
                variant="ghost"
                disabled={!newSubtask.trim()}
                onPress={() => void addSubtask()}
                testID="task-subtask-add"
              />
            </View>
          ) : null}
        </Field>
      ) : null}

      {writable ? (
        <Button
          testID="task-delete"
          label="Delete task"
          variant="destructive"
          onPress={remove}
          fullWidth
          style={styles.danger}
        />
      ) : null}

      {task && me?.id && task.createdById !== me.id ? (
        <Button
          testID="task-report"
          label="Report task"
          variant="ghost"
          size="sm"
          onPress={() => setReporting({ type: "task", id: task.id, label: task.title })}
          style={styles.report}
        />
      ) : null}
      <ReportSheet target={reporting} onClose={() => setReporting(null)} />

      <CommentThread
        taskId={taskId}
        members={members}
        writable={writable}
        meId={me?.id}
        refreshKey={commentsKey}
      />

      <ActivityFeed
        workspaceId={workspaceId}
        taskId={taskId}
        members={members}
        refreshKey={activityKey}
      />

      <OptionSheet
        visible={sheet === "project"}
        title="Move to"
        options={[
          { value: "", label: "Inbox" },
          ...projects.map((project) => ({ value: project.id, label: project.name })),
        ]}
        value={task.projectId ?? ""}
        onSelect={(value) => void save({ projectId: value || null })}
        onClose={() => setSheet(null)}
      />
      <DatePickerSheet
        visible={sheet === "due"}
        value={task.dueAt}
        onChange={(dueAt) => void save({ dueAt })}
        onClose={() => setSheet(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  report: { alignSelf: "flex-start" },
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xl * 2 },
  loadingCard: { margin: spacing.lg, padding: spacing.lg },
  body: { minHeight: 96, textAlignVertical: "top" },
  field: { gap: spacing.sm },
  pair: { flexDirection: "row", gap: spacing.md },
  flex: { flex: 1 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  addRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  checkPress: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.md },
  checkMark: { width: 18 },
  struck: { textDecorationLine: "line-through" },
  danger: { marginTop: spacing.sm },
});
