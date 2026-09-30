"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ACTIVITY_TYPES, fmtDateTime, fmtDate, type Activity, type ActivityType, type EntityType } from "@/lib/crm";

/**
 * Drop this on any hotel, mama mboga, contact, or B2C customer row to get a
 * "Log activity" button plus a collapsible timeline of everything logged
 * against that one entity. Self-contained — fetches its own activities, so
 * a parent list of 50 hotels doesn't need to preload all of their history.
 */
export default function ActivityLog({
  entityType,
  entityId,
  entityLabel,
  activities: initial,
  compact = false,
}: {
  entityType: EntityType;
  entityId: string;
  entityLabel: string;
  activities: Activity[];
  compact?: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [logging, setLogging] = useState(false);
  const [type, setType] = useState<ActivityType>("call");
  const [notes, setNotes] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [makeTask, setMakeTask] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const latest = initial[0];
  const sorted = useMemo(() => initial, [initial]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user?.id ?? "").single();
    const loggedByName = profile?.full_name ?? user?.email ?? "";

    const { error: dbError } = await supabase.from("ACTIVITIES").insert({
      entity_type: entityType,
      entity_id: entityId,
      entity_label: entityLabel,
      activity_type: type,
      notes: notes.trim() || null,
      follow_up_date: followUp || null,
      logged_by_name: loggedByName,
    });
    if (dbError) {
      setSaving(false);
      setError(dbError.message.includes("ACTIVITIES") ? "The CRM tables aren't set up yet — run supabase/crm_schema.sql in Supabase first." : dbError.message);
      return;
    }

    if (followUp && makeTask) {
      await supabase.from("TASKS").insert({
        title: `Follow up: ${entityLabel}`,
        notes: notes.trim() || null,
        due_date: followUp,
        entity_type: entityType,
        entity_id: entityId,
        entity_label: entityLabel,
        assigned_to: user?.id ?? null,
        assigned_to_name: loggedByName,
        created_by_name: loggedByName,
      });
    }

    setSaving(false);
    setLogging(false);
    setNotes("");
    setFollowUp("");
    setMakeTask(false);
    setOpen(true);
    router.refresh();
  }

  return (
    <div className={compact ? "text-xs" : "text-sm"}>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`text-ink-soft hover:text-maroon ${compact ? "text-xs" : "text-sm"}`}
        >
          {latest ? (
            <>
              🕘 Last: {ACTIVITY_TYPES.find((a) => a.value === latest.activity_type)?.icon} {fmtDate(latest.created_at.slice(0, 10))}
              {sorted.length > 1 ? ` · ${sorted.length} logged` : ""} {open ? "▲" : "▼"}
            </>
          ) : (
            <>No activity logged yet {open ? "▲" : "▼"}</>
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setLogging((v) => !v);
            setOpen(true);
          }}
          className="ml-auto bg-maroon hover:bg-red text-cream rounded-card px-2.5 py-1 text-xs font-medium"
        >
          + Log activity
        </button>
      </div>

      {open && (
        <div className="mt-2 space-y-2">
          {logging && (
            <form onSubmit={save} className="bg-cream-deep/50 rounded-card p-3 space-y-2">
              <div className="flex flex-wrap gap-2">
                {ACTIVITY_TYPES.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => setType(a.value)}
                    className={`px-2.5 py-1 rounded-card text-xs ${type === a.value ? "bg-maroon text-cream" : "bg-white text-ink-soft hover:bg-cream"}`}
                  >
                    {a.icon} {a.label}
                  </button>
                ))}
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What happened / what was said…"
                rows={2}
                className="w-full rounded-card border border-cream-deep px-2.5 py-1.5 text-xs bg-white"
              />
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-ink-soft">Follow up on:</label>
                <input
                  type="date"
                  value={followUp}
                  onChange={(e) => setFollowUp(e.target.value)}
                  className="rounded-card border border-cream-deep px-2 py-1 text-xs"
                />
                {followUp && (
                  <label className="flex items-center gap-1 text-xs text-ink-soft">
                    <input type="checkbox" checked={makeTask} onChange={(e) => setMakeTask(e.target.checked)} />
                    Create a task for this
                  </label>
                )}
                {error && <span className="text-red-bright text-xs basis-full">{error}</span>}
                <button type="submit" disabled={saving} className="ml-auto bg-maroon hover:bg-red text-cream rounded-card px-3 py-1.5 text-xs font-medium disabled:opacity-60">
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          )}

          {sorted.length > 0 && (
            <ul className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {sorted.map((a) => (
                <li key={a.id} className="border-l-2 border-cream-deep pl-2.5">
                  <div className="flex items-center gap-1.5 text-ink-soft text-xs">
                    <span>{ACTIVITY_TYPES.find((x) => x.value === a.activity_type)?.icon}</span>
                    <span className="font-medium text-ink">{ACTIVITY_TYPES.find((x) => x.value === a.activity_type)?.label}</span>
                    <span>· {fmtDateTime(a.created_at)}</span>
                    {a.logged_by_name && <span>· {a.logged_by_name}</span>}
                  </div>
                  {a.notes && <div className="text-ink-soft">{a.notes}</div>}
                  {a.follow_up_date && <div className="text-gold-dark text-xs">Follow up: {fmtDate(a.follow_up_date)}</div>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
