export type MemberRole = "owner" | "admin" | "member" | "viewer";
export type WorkspaceKind = "personal" | "team";
export type ProjectView = "board" | "list" | "calendar";
export type TaskStatus = "todo" | "in_progress" | "done" | "canceled";
export type TaskPriority = "none" | "low" | "medium" | "high" | "urgent";
export type RecurrenceFrequency = "daily" | "weekly";

export type Workspace = {
  id: string;
  kind: WorkspaceKind;
  name: string;
  slug: string;
  ownerUserId: string;
  createdAt: string;
  updatedAt: string;
  role?: MemberRole;
};

export type Project = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  color: string | null;
  defaultView: ProjectView;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type BoardColumn = {
  id: string;
  projectId: string;
  name: string;
  statusMapped: TaskStatus | null;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type Tag = {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
};

export type ChecklistItem = {
  id: string;
  title: string;
  completed: boolean;
  position: number;
};

export type RecurrenceRule = {
  frequency: RecurrenceFrequency;
  interval: number;
};

export type Task = {
  id: string;
  workspaceId: string;
  projectId: string | null;
  columnId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string | null;
  startAt: string | null;
  completedAt: string | null;
  position: number;
  assigneeIds: string[];
  tagIds: string[];
  parentTaskId: string | null;
  recurrence: RecurrenceRule | null;
  checklist: ChecklistItem[];
  createdById: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type Comment = {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type ActivityEvent = {
  id: string;
  workspaceId: string;
  projectId: string | null;
  taskId: string | null;
  actorId: string;
  verb: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type FlowMe = {
  id: string;
  email: string;
  displayName: string;
  identityName: string;
  profile: {
    displayName: string | null;
    title: string | null;
    timezone: string | null;
    bio: string | null;
  };
};
