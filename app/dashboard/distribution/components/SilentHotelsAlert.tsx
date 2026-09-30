"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { HotelPerformance } from "@/lib/territoryAnalysis";
import { todayNairobi } from "@/lib/crm";

export default function SilentHotelsAlert({ performance }: { performance: HotelPerformance[] }) {
  const supabase = createClient();
  const [creating, setCreating] = useState<string | null>(null);
  const [created, setCreated] = useState<Set<string>>(new Set());

  const silent = performance
    .filter((h) => h.performance_tier === "Dormant" || h.performance_tier === "At Risk")
    .sort((a, b) => (b.days_since_last_restock ?? 0) - (a.days_since_last_restock ?? 0));

  if (silent.length === 0) return null;

  async function createTask(h: HotelPerformance) {
    setCreating(h.id);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user?.id ?? "").single();
    const name = profile?.full_name ?? user?.email ?? "";

    // Due tomorrow rather than today — this is a "plan the visit" reminder,
    // not something to squeeze in immediately.
    const tomorrow = new Date(`${todayNairobi()}T00:00:00Z`);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const { error } = await supabase.from("TASKS").insert({
      title: `Follow up: ${h.hotel_name} (${h.performance_tier.toLowerCase()})`,
      notes: `${h.days_since_last_restock !== null ? `${Math.round(h.days_since_last_restock)} days since last refill.` : "Never refilled."} Flagged by the Gone Quiet alert on Distribution.`,
      due_date: tomorrow.toISOString().slice(0, 10),
      entity_type: "hotel",
      entity_id: h.id,
      entity_label: h.hotel_name,
      assigned_to: user?.id ?? null,
      assigned_to_name: name,
      created_by_name: name,
    });
    setCreating(null);
    if (!error) setCreated((s) => new Set(s).add(h.id));
  }

  return (
    <div className="bg-red-50 border border-red-100 rounded-card-lg p-6">
      <h2 className="font-medium text-red-bright mb-3">🔕 Gone Quiet — Needs a Visit</h2>
      <div className="space-y-2">
        {silent.map((h) => (
          <div key={h.id} className="flex items-center justify-between bg-white rounded-card px-4 py-2 text-sm gap-3">
            <div>
              <span className="font-medium">{h.hotel_name}</span>
              <span className="text-ink-soft ml-2">{h.location}</span>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                  h.performance_tier === "Dormant" ? "bg-red-100 text-red-bright" : "bg-orange-50 text-orange-700"
                }`}
              >
                {h.performance_tier}
              </span>
              <span className="text-ink-soft whitespace-nowrap">
                {h.days_since_last_restock !== null ? `${Math.round(h.days_since_last_restock)} days since last refill` : "never refilled"}
              </span>
              {created.has(h.id) ? (
                <span className="text-green-700 text-xs font-medium whitespace-nowrap">✓ Task created</span>
              ) : (
                <button
                  onClick={() => createTask(h)}
                  disabled={creating === h.id}
                  className="text-xs bg-maroon hover:bg-red text-cream rounded-card px-2.5 py-1 whitespace-nowrap disabled:opacity-60"
                >
                  {creating === h.id ? "…" : "+ Task"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
