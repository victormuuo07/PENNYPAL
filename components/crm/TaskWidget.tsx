import Link from "next/link";
import { dueBucket, fmtDate, openTasks, type Task } from "@/lib/crm";

/** Lightweight — no client JS, just server-rendered counts and a short list. The full board lives at /dashboard/tasks. */
export default function TaskWidget({ tasks, currentUserId }: { tasks: Task[]; currentUserId: string }) {
  const mine = openTasks(tasks).filter((t) => t.assigned_to === currentUserId || t.created_by === currentUserId);
  if (mine.length === 0) return null;

  const overdue = mine.filter((t) => t.due_date && dueBucket(t.due_date) === "overdue");
  const today = mine.filter((t) => t.due_date && dueBucket(t.due_date) === "today");
  const upcoming = mine
    .slice()
    .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"))
    .slice(0, 4);

  return (
    <Link href="/dashboard/tasks" className="block bg-white rounded-card-lg shadow-soft p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-medium text-ink">✅ My Tasks</h2>
        <span className="text-xs text-ink-soft">{mine.length} open →</span>
      </div>
      {(overdue.length > 0 || today.length > 0) && (
        <div className="flex gap-3 text-sm mb-3">
          {overdue.length > 0 && <span className="text-red-bright font-medium">⚑ {overdue.length} overdue</span>}
          {today.length > 0 && <span className="text-gold-dark font-medium">📅 {today.length} due today</span>}
        </div>
      )}
      <ul className="space-y-1.5 text-sm">
        {upcoming.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-2">
            <span className="text-ink truncate">{t.title}</span>
            <span className="text-ink-soft text-xs whitespace-nowrap">{t.due_date ? fmtDate(t.due_date) : "No date"}</span>
          </li>
        ))}
      </ul>
    </Link>
  );
}
