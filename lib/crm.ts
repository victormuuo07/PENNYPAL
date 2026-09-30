import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Shared CRM types. An "entity" is whatever an activity or task is about —
 * a hotel, a mama mboga shop, a CUSTOMER_CONTACTS row, or a B2C customer
 * (identified by the same key lib/customers.ts uses, e.g. "p:0712345678",
 * since B2C customers aren't rows in any table). entity_id is text so all
 * four fit the same column.
 */
export type EntityType = "hotel" | "mama" | "contact" | "b2c";
export type ActivityType = "call" | "visit" | "sms" | "whatsapp" | "email" | "note";
export type TaskStatus = "open" | "done";
export type TaskPriority = "low" | "normal" | "high";

export const ACTIVITY_TYPES: { value: ActivityType; label: string; icon: string }[] = [
  { value: "call", label: "Phone call", icon: "📞" },
  { value: "visit", label: "In-person visit", icon: "🚶" },
  { value: "sms", label: "SMS", icon: "💬" },
  { value: "whatsapp", label: "WhatsApp", icon: "🟢" },
  { value: "email", label: "Email", icon: "✉️" },
  { value: "note", label: "Note", icon: "📝" },
];

export const ENTITY_LABELS: Record<EntityType, string> = {
  hotel: "Hotel",
  mama: "Mama Mboga",
  contact: "Contact",
  b2c: "B2C Customer",
};

export type Activity = {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  entity_label: string;
  activity_type: ActivityType;
  notes: string | null;
  follow_up_date: string | null;
  logged_by_name: string | null;
  created_at: string;
};

export type Task = {
  id: string;
  title: string;
  notes: string | null;
  due_date: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  entity_type: EntityType | "other" | null;
  entity_id: string | null;
  entity_label: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  created_by: string | null;
  created_by_name: string | null;
  completed_at: string | null;
  created_at: string;
};

// -------------------------------------------------------------- date utils

export function todayNairobi(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return s;
  return `${m[3]}-${MONTHS[Number(m[2]) - 1] ?? m[2]}-${m[1]}`;
}

export function fmtDateTime(s: string | null | undefined): string {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return `${fmtDate(s)} · ${d.toLocaleTimeString("en-GB", { timeZone: "Africa/Nairobi", hour: "2-digit", minute: "2-digit" })}`;
}

/** Days between today and a date — negative means overdue. */
export function daysUntil(dateStr: string, today = todayNairobi()): number {
  return Math.round((new Date(`${dateStr}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 86400000);
}

export type DueBucket = "overdue" | "today" | "week" | "later" | "none";
export function dueBucket(dateStr: string | null, today = todayNairobi()): DueBucket {
  if (!dateStr) return "none";
  const d = daysUntil(dateStr, today);
  if (d < 0) return "overdue";
  if (d === 0) return "today";
  if (d <= 7) return "week";
  return "later";
}

// ------------------------------------------------------------------ fetch

/** Pages through PostgREST's 1000-row cap. */
async function fetchAll<T>(supabase: SupabaseClient, table: string, build: (q: ReturnType<SupabaseClient["from"]>) => any): Promise<T[]> {
  const pageSize = 1000;
  let all: T[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await build(supabase.from(table)).range(offset, offset + pageSize - 1);
    if (error || !data) break;
    all = all.concat(data as T[]);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

export async function fetchActivities(supabase: SupabaseClient, entityType: EntityType, entityId: string): Promise<Activity[]> {
  const { data } = await supabase
    .from("ACTIVITIES")
    .select("id, entity_type, entity_id, entity_label, activity_type, notes, follow_up_date, logged_by_name, created_at")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  return (data as Activity[]) ?? [];
}

/** Every activity across every entity, most recent first — used for a company-wide activity feed. */
export async function fetchAllActivities(supabase: SupabaseClient, limit = 200): Promise<Activity[]> {
  const { data } = await supabase
    .from("ACTIVITIES")
    .select("id, entity_type, entity_id, entity_label, activity_type, notes, follow_up_date, logged_by_name, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as Activity[]) ?? [];
}

/** All tasks visible to the current user (RLS already scopes reps to their own). Paged so a busy list is never silently truncated. */
export async function fetchTasks(supabase: SupabaseClient): Promise<Task[]> {
  return fetchAll<Task>(supabase, "TASKS", (q) =>
    q
      .select(
        "id, title, notes, due_date, status, priority, entity_type, entity_id, entity_label, assigned_to, assigned_to_name, created_by, created_by_name, completed_at, created_at"
      )
      .order("due_date", { ascending: true, nullsFirst: false })
  );
}

export function openTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => t.status === "open");
}

export function overdueCount(tasks: Task[], today = todayNairobi()): number {
  return openTasks(tasks).filter((t) => t.due_date && daysUntil(t.due_date, today) < 0).length;
}

export function dueTodayCount(tasks: Task[], today = todayNairobi()): number {
  return openTasks(tasks).filter((t) => t.due_date && daysUntil(t.due_date, today) === 0).length;
}
