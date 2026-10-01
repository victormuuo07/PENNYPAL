import { createClient } from "@/lib/supabase/server";
import { fetchTasks } from "@/lib/crm";
import TaskManager from "./components/TaskManager";
import CalendarFeedPanel from "./components/CalendarFeedPanel";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [tasks, profilesRes] = await Promise.all([
    fetchTasks(supabase),
    // Owners can assign to anyone; a rep only sees their own profile row
    // back from RLS, so the dropdown quietly narrows to "just me" for them.
    supabase.from("profiles").select("id, full_name").order("full_name"),
  ]);

  const reps = (profilesRes.data ?? []).map((p) => ({ id: p.id, name: p.full_name ?? "—" }));

  const probe = tasks.length === 0 ? await supabase.from("TASKS").select("id", { head: true, count: "exact" }) : null;
  if (probe?.error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-maroon">Tasks</h1>
        <div className="bg-gold/10 border border-gold/30 rounded-card-lg p-5 text-sm text-ink-soft space-y-2">
          <div className="font-medium text-ink">One-time setup needed</div>
          <p>
            The CRM tables aren&apos;t in the database yet. Open the Supabase SQL editor and run{" "}
            <code className="bg-white px-1 rounded">supabase/crm_schema.sql</code>, then refresh this page.
          </p>
          <p className="text-xs">({probe.error.message})</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-maroon">Tasks</h1>
        <p className="text-ink-soft text-sm">Follow-ups and reminders — created here or from Distribution, B2C Customers, and Quality & HACCP</p>
      </div>
      <CalendarFeedPanel />
      <TaskManager tasks={tasks} reps={reps} currentUserId={user!.id} />
    </div>
  );
}
