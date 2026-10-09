import type { MemberRole } from "./types";

export type PermissionAction =
  | "workspace.view"
  | "task.write"
  | "project.write"
  | "members.manage";

const rank: Record<MemberRole, number> = {
  viewer: 1,
  member: 2,
  admin: 3,
  owner: 4,
};

const requiredRank: Record<PermissionAction, number> = {
  "workspace.view": 1,
  "task.write": 2,
  "project.write": 2,
  "members.manage": 3,
};

export function can(role: MemberRole, action: PermissionAction): boolean {
  return rank[role] >= requiredRank[action];
}
