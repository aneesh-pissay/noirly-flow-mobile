import { NoirlyIdentity } from "../auth/identity";
import { config } from "../config";
import type { WorkspaceMember } from "../features/workspace/members";
import type {
  ActivityEvent,
  BoardColumn,
  Comment,
  FlowMe,
  MemberRole,
  Project,
  ReportReason,
  Tag,
  Task,
  Workspace,
} from "../types";

type ApiErrorBody = { error?: string; message?: string };

export class FlowApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "FlowApiError";
  }
}

async function send(path: string, init?: RequestInit): Promise<Response> {
  const token = await NoirlyIdentity.getAccessToken();
  if (!token) {
    throw new FlowApiError("Not signed in", "unauthorized", 401);
  }

  return fetch(`${config.flowApiUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await send(path, init);
  const data = (await response.json().catch(() => ({}))) as T & ApiErrorBody;
  if (!response.ok) {
    if (response.status === 401) {
      await NoirlyIdentity.signOut();
    }
    throw new FlowApiError(
      data.message || data.error || "Request failed",
      data.error || "request_failed",
      response.status,
    );
  }
  return data;
}

export const api = {
  me() {
    return request<{ user: FlowMe }>("/api/me");
  },
  /** Deletes this person's Flow data. Use deleteNoirlyAccount() for the full account. */
  /** Report a comment, task or member to the Noirly team. Members need `workspaceId`. */
  report(input: {
    targetType: "comment" | "task" | "user";
    targetId: string;
    workspaceId?: string;
    reason: ReportReason;
    details?: string | null;
  }) {
    return request<{ report: { id: string; duplicate: boolean } }>("/api/reports", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  deleteMe() {
    return request<{ ok: boolean }>("/api/me", { method: "DELETE" });
  },
  updateMe(profile: {
    displayName?: string | null;
    title?: string | null;
    timezone?: string | null;
    bio?: string | null;
  }) {
    return request<{ user: FlowMe }>("/api/me", {
      method: "PATCH",
      body: JSON.stringify({ profile }),
    });
  },
  listWorkspaces() {
    return request<{ workspaces: Workspace[] }>("/api/workspaces");
  },
  createWorkspace(name: string) {
    return request<{ workspace: Workspace }>("/api/workspaces", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },
  getWorkspace(workspaceId: string) {
    return request<{
      workspace: Workspace & { role: MemberRole };
      projects: Project[];
    }>(`/api/workspaces/${workspaceId}`);
  },
  listMembers(workspaceId: string) {
    return request<{ members: WorkspaceMember[] }>(
      `/api/workspaces/${workspaceId}/members`,
    );
  },
  updateMember(workspaceId: string, userId: string, role: MemberRole) {
    return request<{ member: { userId: string; role: MemberRole } }>(
      `/api/workspaces/${workspaceId}/members/${userId}`,
      { method: "PATCH", body: JSON.stringify({ role }) },
    );
  },
  removeMember(workspaceId: string, userId: string) {
    return request<{ ok: boolean }>(
      `/api/workspaces/${workspaceId}/members/${userId}`,
      { method: "DELETE" },
    );
  },
  createInvite(workspaceId: string, role: Exclude<MemberRole, "owner">) {
    return request<{
      invite: { token: string; url: string; role: string; expiresAt: string };
    }>(`/api/workspaces/${workspaceId}/invites`, {
      method: "POST",
      body: JSON.stringify({ role }),
    });
  },
  acceptInvite(token: string) {
    return request<{ workspaceId: string; name: string }>("/api/invites/accept", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  },
  listProjects(workspaceId: string) {
    return request<{ projects: Project[] }>(
      `/api/workspaces/${workspaceId}/projects`,
    );
  },
  createProject(
    workspaceId: string,
    body: { name: string; description?: string | null },
  ) {
    return request<{ project: Project }>(
      `/api/workspaces/${workspaceId}/projects`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },
  getProject(projectId: string) {
    return request<{ project: Project & { columns: BoardColumn[] } }>(
      `/api/projects/${projectId}`,
    );
  },
  listTasks(
    workspaceId: string,
    query: {
      projectId?: string;
      inbox?: boolean;
      root?: boolean;
      parentTaskId?: string;
      assigneeId?: string;
      status?: string;
      priority?: string;
      search?: string;
      due?: string;
    } = {},
  ) {
    const params = new URLSearchParams();
    if (query.inbox) params.set("inbox", "1");
    else if (query.projectId) params.set("projectId", query.projectId);
    if (query.root) params.set("root", "1");
    else if (query.parentTaskId) params.set("parentTaskId", query.parentTaskId);
    if (query.assigneeId) params.set("assigneeId", query.assigneeId);
    if (query.status) params.set("status", query.status);
    if (query.priority) params.set("priority", query.priority);
    if (query.search) params.set("search", query.search);
    if (query.due) params.set("due", query.due);
    const qs = params.toString();
    return request<{ tasks: Task[] }>(
      `/api/workspaces/${workspaceId}/tasks${qs ? `?${qs}` : ""}`,
    );
  },
  createTask(
    workspaceId: string,
    body: {
      title: string;
      projectId?: string | null;
      parentTaskId?: string | null;
      status?: Task["status"];
      priority?: Task["priority"];
      dueAt?: string | null;
    },
  ) {
    return request<{ task: Task }>(`/api/workspaces/${workspaceId}/tasks`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  getTask(taskId: string) {
    return request<{ task: Task }>(`/api/tasks/${taskId}`);
  },
  updateTask(taskId: string, patch: Partial<Task>) {
    return request<{ task: Task }>(`/api/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },
  deleteTask(taskId: string) {
    return request<{ ok: boolean }>(`/api/tasks/${taskId}`, {
      method: "DELETE",
    });
  },
  reorderTasks(
    projectId: string,
    moves: Array<{
      taskId: string;
      columnId: string | null;
      position: number;
      status?: Task["status"];
    }>,
  ) {
    return request<{ tasks: Task[] }>(`/api/projects/${projectId}/reorder`, {
      method: "POST",
      body: JSON.stringify({ moves }),
    });
  },
  listTags(workspaceId: string) {
    return request<{ tags: Tag[] }>(`/api/workspaces/${workspaceId}/tags`);
  },
  createTag(workspaceId: string, body: { name: string; color?: string }) {
    return request<{ tag: Tag }>(`/api/workspaces/${workspaceId}/tags`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  listComments(taskId: string) {
    return request<{ comments: Comment[] }>(`/api/tasks/${taskId}/comments`);
  },
  createComment(taskId: string, body: string) {
    return request<{ comment: Comment }>(`/api/tasks/${taskId}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
  },
  listActivity(
    workspaceId: string,
    query: { taskId?: string; cursor?: string } = {},
  ) {
    const params = new URLSearchParams();
    if (query.taskId) params.set("taskId", query.taskId);
    if (query.cursor) params.set("cursor", query.cursor);
    const qs = params.toString();
    return request<{ items: ActivityEvent[]; nextCursor?: string }>(
      `/api/workspaces/${workspaceId}/activity${qs ? `?${qs}` : ""}`,
    );
  },
  /** Whole workspace log as CSV text, built server-side in one request. */
  async exportActivityCsv(workspaceId: string) {
    const response = await send(
      `/api/workspaces/${workspaceId}/activity/export`,
      { headers: { Accept: "text/csv" } },
    );
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as ApiErrorBody;
      throw new FlowApiError(
        data.message || data.error || "Export failed",
        data.error || "request_failed",
        response.status,
      );
    }
    const disposition = response.headers.get("content-disposition") ?? "";
    const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? null;
    return { csv: await response.text(), filename };
  },
  search(q: string) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    return request<{ workspaces: Workspace[]; tasks: Task[] }>(
      `/api/search?${params.toString()}`,
    );
  },
  realtimeToken(workspaceId: string, projectId?: string) {
    const params = new URLSearchParams({ workspaceId });
    if (projectId) params.set("projectId", projectId);
    return request<{ token: string; expiresIn: number; url: string | null }>(
      `/api/realtime/token?${params.toString()}`,
    );
  },
};
