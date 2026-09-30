"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { dueBucket, fmtDate, todayNairobi, type DueBucket, type Task, type TaskPriority } from "@/lib/crm";

type RepOption = { id: string; name: string };

const BUCKET_META: Record<Exclude<DueBucket, "none">, { label: string; tone: string }> = {
  overdue: { label: "Overdue", tone: "text-red-bright" },
  today: { label: "Today", tone: "text-gold-dark" },
  week: { label: "This week", tone: "text-ink" },
  later: { label: "Later", tone: "text-ink-soft" },
};

const PRIORITY_DOT: Record<TaskPriority, string> = { high: "bg-red-bright", normal: "bg-gold", low: "bg-ink-soft/40" };

export default function TaskManager({ tasks, reps, currentUserId }: { tasks: Task[]; reps: RepOption[]; currentUserId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [filter, setFilter] = useState<"mine" | "all" | "done">("mine");
  const [showForm, setShowForm] = useState(false);
  const today = todayNairobi();

  const visible = useMemo(() => {
    if (filter === "done") return tasks.filter((t) => t.status === "done");
    const open = tasks.filter((t) => t.status === "open");
    return filter === "mine" ? open.filter((t) => t.assigned_to === currentUserId || t.created_by === currentUserId) : open;
  }, [tasks, filter, currentUserId]);

  const grouped = useMemo(() => {
    const buckets: Record<string, Task[]> = { overdue: [], today: [], week: [], later: [], none: [] };
    for (const t of visible) buckets[t.due_date ? dueBucket(t.due_date, today) : "none"].push(t);
    return buckets;
  }, [visible, today]);

  async function toggleDone(t: Task) {
    const { error } = await supabase.from("TASKS").update({ status: t.status === "open" ? "done" : "open" }).eq("id", t.id);
    if (!error) router.refresh();
  }

  async function remove(t: Task) {
    if (!confirm(`Delete task "${t.title}"?`)) return;
    const { error } = await supabase.from("TASKS").delete().eq("id", t.id);
    if (!error) router.refresh();
  }

  const openCount = tasks.filter((t) => t.status === "open").length;
  const mineCount = tasks.filter((t) => t.status === "open" && (t.assigned_to === currentUserId || t.created_by === currentUserId)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setShowForm((v) => !v)} className="bg-maroon hover:bg-red text-cream rounded-card px-4 py-2 text-sm font-medium">
          + New task
        </button>
        <div className="ml-auto flex gap-1 text-sm">
          {(
            [
              ["mine", `Mine (${mineCount})`],
              ["all", `All open (${openCount})`],
              ["done", "Done"],
            ] as const
          ).map(([k, label]) => (
            <button key={k} onClick={() => setFilter(k)} className={`px-3 py-1.5 rounded-card ${filter === k ? "bg-maroon text-cream" : "bg-white shadow-soft text-ink-soft hover:bg-cream-deep"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {showForm && <NewTaskForm reps={reps} currentUserId={currentUserId} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); router.refresh(); }} />}

      {visible.length === 0 ? (
        <div className="bg-white rounded-card-lg shadow-soft p-6 text-ink-soft text-sm">
          {filter === "done" ? "No completed tasks yet." : "Nothing here — you're caught up."}
        </div>
      ) : (
        (["overdue", "today", "week", "later"] as const)
          .filter((b) => grouped[b].length > 0)
          .map((b) => (
            <div key={b}>
              <h3 className={`text-sm font-semibold mb-2 ${BUCKET_META[b].tone}`}>
                {BUCKET_META[b].label} ({grouped[b].length})
              </h3>
              <div className="bg-white rounded-card-lg shadow-soft divide-y divide-cream-deep">
                {grouped[b].map((t) => (
                  <TaskRow key={t.id} task={t} onToggle={() => toggleDone(t)} onDelete={() => remove(t)} />
                ))}
              </div>
            </div>
          ))
      )}

      {filter !== "done" && grouped.none.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 text-ink-soft">No due date ({grouped.none.length})</h3>
          <div className="bg-white rounded-card-lg shadow-soft divide-y divide-cream-deep">
            {grouped.none.map((t) => (
              <TaskRow key={t.id} task={t} onToggle={() => toggleDone(t)} onDelete={() => remove(t)} />
            ))}
          </div>
        </div>
      )}

      {filter === "done" && (
        <div className="bg-white rounded-card-lg shadow-soft divide-y divide-cream-deep">
          {visible.map((t) => (
            <TaskRow key={t.id} task={t} onToggle={() => toggleDone(t)} onDelete={() => remove(t)} />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, onToggle, onDelete }: { task: Task; onToggle: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <button
        onClick={onToggle}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${task.status === "done" ? "bg-green-600 border-green-600 text-white" : "border-ink-soft/40 hover:border-maroon"}`}
        aria-label={task.status === "done" ? "Mark open" : "Mark done"}
      >
        {task.status === "done" && "✓"}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[task.priority]}`} title={`${task.priority} priority`} />
          <span className={`font-medium ${task.status === "done" ? "line-through text-ink-soft" : "text-ink"}`}>{task.title}</span>
          {task.entity_label && <span className="text-xs bg-cream-deep text-ink-soft rounded-full px-2 py-0.5">{task.entity_label}</span>}
        </div>
        {task.notes && <div className="text-sm text-ink-soft mt-0.5">{task.notes}</div>}
        <div className="text-xs text-ink-soft mt-1 flex flex-wrap gap-x-3">
          {task.due_date && <span>Due {fmtDate(task.due_date)}</span>}
          {task.assigned_to_name && <span>Assigned to {task.assigned_to_name}</span>}
        </div>
      </div>
      <button onClick={onDelete} className="text-ink-soft hover:text-red-bright text-xs flex-shrink-0">
        Delete
      </button>
    </div>
  );
}

function NewTaskForm({ reps, currentUserId, onClose, onSaved }: { reps: RepOption[]; currentUserId: string; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState(todayNairobi());
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [assignedTo, setAssignedTo] = useState(currentUserId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Give the task a title");
      return;
    }
    setSaving(true);
    const assignedRep = reps.find((r) => r.id === assignedTo);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user?.id ?? "").single();

    const { error: dbError } = await supabase.from("TASKS").insert({
      title: title.trim(),
      notes: notes.trim() || null,
      due_date: dueDate || null,
      priority,
      assigned_to: assignedTo || null,
      assigned_to_name: assignedRep?.name ?? null,
      created_by_name: profile?.full_name ?? user?.email ?? "",
    });
    setSaving(false);
    if (dbError) {
      setError(dbError.message.includes("TASKS") ? "The CRM tables aren't set up yet — run supabase/crm_schema.sql in Supabase first." : dbError.message);
      return;
    }
    onSaved();
  }

  return (
    <form onSubmit={save} className="bg-white rounded-card-lg shadow-soft p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
      <label className="sm:col-span-2">
        <span className="block text-xs font-medium text-ink-soft mb-1">Title *</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Call Hotel X about their overdue invoice" className="w-full rounded-card border border-cream-deep px-3 py-2 text-sm" />
      </label>
      <label className="sm:col-span-2">
        <span className="block text-xs font-medium text-ink-soft mb-1">Notes</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-card border border-cream-deep px-3 py-2 text-sm" />
      </label>
      <label>
        <span className="block text-xs font-medium text-ink-soft mb-1">Due date</span>
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full rounded-card border border-cream-deep px-3 py-2 text-sm" />
      </label>
      <label>
        <span className="block text-xs font-medium text-ink-soft mb-1">Priority</span>
        <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className="w-full rounded-card border border-cream-deep px-3 py-2 text-sm">
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
        </select>
      </label>
      {reps.length > 0 && (
        <label className="sm:col-span-2">
          <span className="block text-xs font-medium text-ink-soft mb-1">Assign to</span>
          <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="w-full rounded-card border border-cream-deep px-3 py-2 text-sm">
            <option value="">Unassigned</option>
            {reps.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id === currentUserId ? `${r.name} (me)` : r.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="sm:col-span-2 flex justify-end gap-2 items-center">
        {error && <span className="text-red-bright text-sm mr-auto">{error}</span>}
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-card text-sm text-ink-soft hover:bg-cream-deep">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="bg-maroon hover:bg-red text-cream rounded-card px-4 py-2 text-sm font-medium disabled:opacity-60">
          {saving ? "Saving…" : "Create task"}
        </button>
      </div>
    </form>
  );
}
