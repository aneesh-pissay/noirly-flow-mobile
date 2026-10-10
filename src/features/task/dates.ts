/**
 * Due-date helpers, ported from the web app's `src/features/task/dates.ts` so
 * both clients bucket "today" / "overdue" the same way.
 *
 * Dates travel as `YYYY-MM-DD` strings inside the app and become a noon-local
 * ISO timestamp on the wire — noon so a timezone shift of a few hours can never
 * push the stored day across midnight.
 */

export type DuePreset = "overdue" | "today" | "upcoming" | "none";
export type DueTone = "overdue" | "today" | "upcoming";

export function dateKeyToIso(value: string): string | null {
  if (!value) return null;
  const local = new Date(`${value}T12:00:00`);
  if (Number.isNaN(local.getTime())) return null;
  return local.toISOString();
}

export function isoToDateKey(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return dateKey(date.getFullYear(), date.getMonth(), date.getDate());
}

export function dateKey(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export function startOfDay(date = new Date()) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function dueTone(dueAt: string | null | undefined): DueTone | null {
  if (!dueAt) return null;
  const due = startOfDay(new Date(dueAt)).getTime();
  const today = startOfDay().getTime();
  if (due < today) return "overdue";
  if (due === today) return "today";
  return "upcoming";
}

export function formatDue(dueAt: string | null | undefined): string | null {
  if (!dueAt) return null;
  return new Date(dueAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function dueLabel(dueAt: string | null | undefined): string | null {
  const label = formatDue(dueAt);
  if (!label) return null;
  const tone = dueTone(dueAt);
  if (tone === "overdue") return `Overdue · ${label}`;
  if (tone === "today") return `Today · ${label}`;
  return label;
}

export function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

/** Monday-first index 0..6 for a JS `Date.getDay()` value. */
export function mondayIndex(jsDay: number) {
  return (jsDay + 6) % 7;
}

export function shiftMonth(
  cursor: { year: number; month: number },
  delta: number,
) {
  const date = new Date(cursor.year, cursor.month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}
