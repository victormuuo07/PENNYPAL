"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { HotelPerformance, PerformanceTier } from "@/lib/territoryAnalysis";

const TIER_STYLES: Record<PerformanceTier, string> = {
  Star: "bg-green-50 text-green-700",
  Growing: "bg-blue-50 text-blue-700",
  Steady: "bg-gold/10 text-gold-dark",
  "At Risk": "bg-orange-50 text-orange-700",
  Dormant: "bg-red-50 text-red-bright",
  New: "bg-gray-100 text-gray-600",
};

export default function PerformanceOverview({ performance }: { performance: HotelPerformance[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ hotel_name: "", location: "", contact_phone: "", contact_person: "", status: "Active" });

  if (performance.length === 0) {
    return (
      <div className="bg-white rounded-card-lg shadow-soft p-6 text-ink-soft text-sm">
        No hotels added yet. Add your first hotel above!
      </div>
    );
  }

  const totalRevenue = performance.reduce((s, h) => s + h.total_revenue, 0);
  const starCount = performance.filter((h) => h.performance_tier === "Star").length;
  const atRiskCount = performance.filter((h) => h.performance_tier === "At Risk").length;
  const dueCount = performance.filter((h) => h.due_for_visit).length;

  const sorted = [...performance].sort((a, b) => b.performance_score - a.performance_score);

  function startEdit(h: HotelPerformance) {
    setEditingId(h.id);
    setEditForm({
      hotel_name: h.hotel_name,
      location: h.location ?? "",
      contact_phone: h.contact_phone ?? "",
      contact_person: h.contact_person ?? "",
      status: h.status,
    });
  }

  async function saveEdit(id: string) {
    setSaving(true);
    const { error } = await supabase.from("HOTELS").update(editForm).eq("id", id);
    setSaving(false);
    if (!error) {
      setEditingId(null);
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Kpi label="🏨 Total Hotels" value={performance.length} />
        <Kpi label="💰 Total Revenue" value={`KES ${totalRevenue.toLocaleString()}`} />
        <Kpi label="⭐ Star Performers" value={starCount} />
        <Kpi label="⚠️ At Risk" value={atRiskCount} />
        <Kpi label="🚚 Due for Refill" value={dueCount} />
      </div>

      <div className="bg-white rounded-card-lg shadow-soft overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-cream-deep text-ink-soft text-left">
              <th className="px-4 py-3 font-medium">Hotel</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium text-right">Visits</th>
              <th className="px-4 py-3 font-medium text-right">Revenue</th>
              <th className="px-4 py-3 font-medium text-right">Avg Order</th>
              <th className="px-4 py-3 font-medium">Frequency</th>
              <th className="px-4 py-3 font-medium">Performance</th>
              <th className="px-4 py-3 font-medium">Due?</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((h) =>
              editingId === h.id ? (
                <tr key={h.id} className="border-t border-cream-deep bg-gold/5">
                  <td className="px-2 py-2" colSpan={9}>
                    <div className="flex flex-wrap gap-2 items-center">
                      <input
                        value={editForm.hotel_name}
                        onChange={(e) => setEditForm((f) => ({ ...f, hotel_name: e.target.value }))}
                        className="rounded-card border border-cream-deep px-2 py-1 text-sm w-40"
                        placeholder="Hotel name"
                      />
                      <input
                        value={editForm.location}
                        onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
                        className="rounded-card border border-cream-deep px-2 py-1 text-sm w-32"
                        placeholder="Location"
                      />
                      <input
                        value={editForm.contact_phone}
                        onChange={(e) => setEditForm((f) => ({ ...f, contact_phone: e.target.value }))}
                        className="rounded-card border border-cream-deep px-2 py-1 text-sm w-32"
                        placeholder="Phone"
                      />
                      <input
                        value={editForm.contact_person}
                        onChange={(e) => setEditForm((f) => ({ ...f, contact_person: e.target.value }))}
                        className="rounded-card border border-cream-deep px-2 py-1 text-sm w-32"
                        placeholder="Contact person"
                      />
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                        className="rounded-card border border-cream-deep px-2 py-1 text-sm"
                      >
                        <option>Active</option>
                        <option>Inactive</option>
                      </select>
                      <button
                        onClick={() => saveEdit(h.id)}
                        disabled={saving}
                        className="bg-maroon text-cream rounded-card px-3 py-1 text-xs"
                      >
                        {saving ? "…" : "Save"}
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-xs text-ink-soft px-2">
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={h.id} className="border-t border-cream-deep">
                  <td className="px-4 py-3 font-medium">{h.hotel_name}</td>
                  <td className="px-4 py-3 text-ink-soft">{h.location}</td>
                  <td className="px-4 py-3 text-right">{h.visit_count}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    KES {h.total_revenue.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-ink-soft">
                    KES {Math.round(h.avg_order_value).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{h.tier}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIER_STYLES[h.performance_tier]}`}
                    >
                      {h.performance_tier} ({h.performance_score})
                    </span>
                  </td>
                  <td className="px-4 py-3">{h.due_for_visit ? "🚚 Yes" : "—"}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => startEdit(h)}
                      className="text-xs bg-cream-deep hover:bg-gold/20 rounded-card px-2 py-1"
                    >
                      ✏️ Edit
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-card-lg shadow-soft p-4">
      <div className="text-xs text-ink-soft">{label}</div>
      <div className="text-lg font-semibold text-maroon mt-1">{value}</div>
    </div>
  );
}
