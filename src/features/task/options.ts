import type { SheetOption } from "../../ui/Sheet";
import type { TaskPriority, TaskStatus } from "../../types";
import type { DuePreset } from "./dates";

export const STATUS_OPTIONS: SheetOption<TaskStatus>[] = [
  { value: "todo", label: "Todo" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
  { value: "canceled", label: "Canceled" },
];

export const PRIORITY_OPTIONS: SheetOption<TaskPriority>[] = [
  { value: "none", label: "None" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export const DUE_FILTERS: SheetOption<DuePreset | "">[] = [
  { value: "", label: "Any due date" },
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "none", label: "No date" },
];

export function optionLabel<T extends string>(
  options: readonly SheetOption<T>[],
  value: T,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}
