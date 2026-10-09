import {
  buildReorderMoves,
  groupTasksByColumn,
  moveTask,
  resolveBoardColumns,
} from "../src/features/board/board-order";
import { describeActivity } from "../src/features/activity/format";
import {
  dateKeyToIso,
  dueTone,
  isoToDateKey,
  mondayIndex,
  shiftMonth,
} from "../src/features/task/dates";
import type { ActivityEvent, BoardColumn, Task } from "../src/types";

function task(id: string, overrides: Partial<Task> = {}): Task {
  return {
    id,
    workspaceId: "w",
    projectId: "p",
    columnId: null,
    title: id,
    description: null,
    status: "todo",
    priority: "none",
    dueAt: null,
    startAt: null,
    completedAt: null,
    position: 0,
    assigneeIds: [],
    tagIds: [],
    parentTaskId: null,
    recurrence: null,
    checklist: [],
    createdById: "u",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    deletedAt: null,
    ...overrides,
  };
}

function column(id: string, status: BoardColumn["statusMapped"], position: number): BoardColumn {
  return {
    id,
    projectId: "p",
    name: id,
    statusMapped: status,
    position,
    createdAt: "",
    updatedAt: "",
  };
}

describe("board order", () => {
  const columns = resolveBoardColumns([
    column("c-done", "done", 3),
    column("c-todo", "todo", 1),
    column("c-doing", "in_progress", 2),
  ]);

  test("sorts mapped columns and falls back to status columns", () => {
    expect(columns.map((c) => c.id)).toEqual(["c-todo", "c-doing", "c-done"]);
    expect(resolveBoardColumns([]).map((c) => c.isPersisted)).toEqual([false, false, false]);
  });

  test("groups by column id, then status, and hides canceled", () => {
    const groups = groupTasksByColumn(
      [
        task("a", { columnId: "c-doing", position: 2000 }),
        task("b", { status: "done" }),
        task("c", { status: "canceled" }),
        task("d", { columnId: "c-doing", position: 1000 }),
      ],
      columns,
    );
    expect(groups["c-doing"]!.map((t) => t.id)).toEqual(["d", "a"]);
    expect(groups["c-done"]!.map((t) => t.id)).toEqual(["b"]);
    expect(Object.values(groups).flat().some((t) => t.id === "c")).toBe(false);
  });

  test("moving across columns rewrites dense positions and status for both", () => {
    const groups = groupTasksByColumn(
      [task("a", { position: 1 }), task("b", { position: 2 }), task("c", { status: "done" })],
      columns,
    );
    const result = moveTask(groups, "a", "c-done")!;
    const moves = buildReorderMoves(result.groups, columns, result.affected);
    expect(moves).toEqual([
      { taskId: "b", columnId: "c-todo", position: 1000, status: "todo" },
      { taskId: "c", columnId: "c-done", position: 1000, status: "done" },
      { taskId: "a", columnId: "c-done", position: 2000, status: "done" },
    ]);
  });

  test("moving within a column reorders", () => {
    const groups = groupTasksByColumn(
      [task("a", { position: 1 }), task("b", { position: 2 })],
      columns,
    );
    const result = moveTask(groups, "b", "c-todo", 0)!;
    expect(result.groups["c-todo"]!.map((t) => t.id)).toEqual(["b", "a"]);
    expect(result.affected).toEqual(["c-todo"]);
  });
});

describe("dates", () => {
  test("date keys round-trip through a noon-local ISO", () => {
    const iso = dateKeyToIso("2026-03-09");
    expect(iso).not.toBeNull();
    expect(isoToDateKey(iso)).toBe("2026-03-09");
    expect(dateKeyToIso("")).toBeNull();
  });

  test("due tone buckets", () => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    expect(dueTone(yesterday.toISOString())).toBe("overdue");
    expect(dueTone(now.toISOString())).toBe("today");
    expect(dueTone(tomorrow.toISOString())).toBe("upcoming");
    expect(dueTone(null)).toBeNull();
  });

  test("calendar helpers", () => {
    expect(mondayIndex(0)).toBe(6); // Sunday
    expect(mondayIndex(1)).toBe(0); // Monday
    expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
    expect(shiftMonth({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
  });
});

describe("activity sentences", () => {
  const members = [
    { userId: "u1", email: "a@x", displayName: "Ada", role: "owner" as const },
    { userId: "u2", email: "b@x", displayName: "Bo", role: "member" as const },
  ];
  const base: ActivityEvent = {
    id: "e",
    workspaceId: "w",
    projectId: null,
    taskId: "t",
    actorId: "u1",
    verb: "task.created",
    metadata: {},
    createdAt: "",
  };

  test("matches the web wording", () => {
    expect(describeActivity({ ...base, metadata: { title: "Ship" } }, members)).toBe(
      "Ada created a task “Ship”",
    );
    expect(
      describeActivity({ ...base, verb: "task.assigned", metadata: { to: ["u2"] } }, members),
    ).toBe("Ada assigned Bo");
    expect(
      describeActivity(
        {
          ...base,
          verb: "task.updated",
          metadata: { status: { from: "todo", to: "in_progress" } },
        },
        members,
      ),
    ).toBe("Ada updated status todo → in progress");
    expect(describeActivity({ ...base, actorId: "zz", verb: "comment.created" }, members)).toBe(
      "Someone commented",
    );
  });
});
