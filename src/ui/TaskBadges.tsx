import React from "react";
import { Badge, type BadgeTone } from "@noirly-dev/ui-native";
import type { TaskPriority, TaskStatus } from "../types";

/**
 * Status and priority appear on five screens. Keeping the tone mapping here
 * means "done" is the same green everywhere, rather than each screen inventing
 * its own — which is how the old monochrome theme ended up with danger,
 * success and accent all set to the same `#F5F5F5`.
 */

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
  canceled: "Canceled",
};

const STATUS_TONE: Record<TaskStatus, BadgeTone> = {
  todo: "neutral",
  in_progress: "accent",
  done: "positive",
  canceled: "neutral",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge
      label={STATUS_LABEL[status]}
      tone={STATUS_TONE[status]}
      // The dot is the "live" signal — only in-progress is actually live.
      dot={status === "in_progress"}
    />
  );
}

const PRIORITY_TONE: Record<TaskPriority, BadgeTone> = {
  none: "neutral",
  low: "neutral",
  medium: "neutral",
  high: "negative",
  urgent: "negative",
};

/**
 * `none` renders nothing. A badge reading "None" is noise on every row that has
 * not been triaged yet, which in practice is most of them.
 */
export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  if (priority === "none") return null;
  return (
    <Badge
      label={priority}
      tone={PRIORITY_TONE[priority]}
      dot={priority === "urgent"}
    />
  );
}
