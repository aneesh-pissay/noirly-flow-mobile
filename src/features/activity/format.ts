import type { ActivityEvent } from "../../types";
import { memberName, type WorkspaceMember } from "../workspace/members";

/** Same sentences as the web feed (`src/features/activity/format.ts`). */

function formatChange(value: unknown): string {
  if (value == null) return "none";
  if (typeof value === "string") return value.replace(/_/g, " ");
  return String(value);
}

export function describeActivity(
  event: ActivityEvent,
  members: WorkspaceMember[],
): string {
  const actor = memberName(members, event.actorId);
  const meta = event.metadata ?? {};

  switch (event.verb) {
    case "task.created": {
      const title = typeof meta.title === "string" ? ` “${meta.title}”` : "";
      return `${actor} created a task${title}`;
    }
    case "task.deleted": {
      const title = typeof meta.title === "string" ? ` “${meta.title}”` : "";
      return `${actor} deleted a task${title}`;
    }
    case "comment.created":
      return `${actor} commented`;
    case "task.assigned": {
      const to = Array.isArray(meta.to)
        ? meta.to.map((id) => memberName(members, String(id)))
        : [];
      return to.length
        ? `${actor} assigned ${to.join(", ")}`
        : `${actor} cleared assignees`;
    }
    case "task.updated": {
      const parts: string[] = [];
      for (const [field, change] of Object.entries(meta)) {
        if (
          change &&
          typeof change === "object" &&
          "from" in change &&
          "to" in change
        ) {
          const typed = change as { from: unknown; to: unknown };
          parts.push(
            `${field} ${formatChange(typed.from)} → ${formatChange(typed.to)}`,
          );
        }
      }
      return parts.length
        ? `${actor} updated ${parts.join(", ")}`
        : `${actor} updated a task`;
    }
    default:
      return `${actor} ${event.verb}`;
  }
}
