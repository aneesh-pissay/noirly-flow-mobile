import type { BoardColumn, Task, TaskStatus } from "../../types";

/**
 * Port of the web `board-order.ts`, so a move on the phone writes the same
 * dense positions (1000, 2000, …) and column/status mapping as a drag on web.
 */

export const BOARD_STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];

export type BoardColumnView = {
  id: string;
  name: string;
  status: TaskStatus;
  /** False for status fallback columns without a stored column id. */
  isPersisted: boolean;
};

export type ColumnTasks = Record<string, Task[]>;

export type BoardMove = {
  taskId: string;
  columnId: string | null;
  position: number;
  status: TaskStatus;
};

export function resolveBoardColumns(
  columns: BoardColumn[] | undefined,
): BoardColumnView[] {
  const mapped = (columns ?? [])
    .filter(
      (column) =>
        column.statusMapped && BOARD_STATUSES.includes(column.statusMapped),
    )
    .sort((a, b) => a.position - b.position)
    .map((column) => ({
      id: column.id,
      name: column.name,
      status: column.statusMapped as TaskStatus,
      isPersisted: true,
    }));

  if (mapped.length > 0) return mapped;

  return [
    { id: "todo", name: "Todo", status: "todo", isPersisted: false },
    { id: "in_progress", name: "In progress", status: "in_progress", isPersisted: false },
    { id: "done", name: "Done", status: "done", isPersisted: false },
  ];
}

export function groupTasksByColumn(
  tasks: Task[],
  columns: BoardColumnView[],
): ColumnTasks {
  const groups: ColumnTasks = Object.fromEntries(
    columns.map((column) => [column.id, [] as Task[]]),
  );
  const byStatus = new Map(columns.map((column) => [column.status, column.id]));

  for (const task of tasks) {
    if (task.status === "canceled") continue;
    const columnId =
      (task.columnId && groups[task.columnId] ? task.columnId : null) ??
      byStatus.get(task.status);
    if (!columnId || !groups[columnId]) continue;
    groups[columnId].push(task);
  }

  for (const columnId of Object.keys(groups)) {
    groups[columnId].sort((a, b) => a.position - b.position);
  }
  return groups;
}

function densePositions(count: number): number[] {
  return Array.from({ length: count }, (_, index) => (index + 1) * 1000);
}

/** Moves a task to `toColumnId` at `toIndex` (end when omitted). */
export function moveTask(
  groups: ColumnTasks,
  taskId: string,
  toColumnId: string,
  toIndex?: number,
): { groups: ColumnTasks; affected: string[] } | null {
  const fromColumnId = Object.keys(groups).find((id) =>
    groups[id]!.some((task) => task.id === taskId),
  );
  if (!fromColumnId || !groups[toColumnId]) return null;

  const next: ColumnTasks = Object.fromEntries(
    Object.entries(groups).map(([key, value]) => [key, [...value]]),
  );
  const fromIndex = next[fromColumnId]!.findIndex((task) => task.id === taskId);
  const [moved] = next[fromColumnId]!.splice(fromIndex, 1);
  if (!moved) return null;
  const target = next[toColumnId]!;
  const insertAt = Math.max(0, Math.min(toIndex ?? target.length, target.length));
  target.splice(insertAt, 0, moved);

  const affected =
    fromColumnId === toColumnId ? [toColumnId] : [fromColumnId, toColumnId];
  return { groups: next, affected };
}

export function buildReorderMoves(
  groups: ColumnTasks,
  columns: BoardColumnView[],
  affectedColumnIds: string[],
): BoardMove[] {
  const columnById = new Map(columns.map((column) => [column.id, column]));
  const moves: BoardMove[] = [];

  for (const columnId of affectedColumnIds) {
    const column = columnById.get(columnId);
    if (!column) continue;
    const columnTasks = groups[columnId] ?? [];
    const positions = densePositions(columnTasks.length);
    columnTasks.forEach((task, index) => {
      moves.push({
        taskId: task.id,
        columnId: column.isPersisted ? column.id : null,
        position: positions[index]!,
        status: column.status,
      });
    });
  }
  return moves;
}
