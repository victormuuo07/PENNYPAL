"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { MamaPerformance, PerformanceTier } from "@/lib/territoryAnalysis";

const TIER_STYLES: Record<PerformanceTier, string> = {
  Star: "bg-green-50 text-green-700",
  Growing: "bg-blue-50 text-blue-700",
  Steady: "bg-gold/10 text-gold-dark",
  "At Risk": "bg-orange-50 text-orange-700",
  Dormant: "bg-red-50 text-red-bright",
  New: "bg-gray-100 text-gray-600",
};

export default function MamaPerformanceOverview({ performance }: { performance: MamaPerformance[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ shop_name: "", location: "", contact_phone: "", status: "Active" });

  if (performance.length === 0) {
    return (
      <div className="bg-white rounded-card-lg shadow-soft p-6 text-ink-soft text-sm">
        No Mama Mboga shops added yet.
      </div>
    );
  }

  const sorted = [...performance].sort((a, b) => b.total_revenue - a.total_revenue);
  const totalRevenue = performance.reduce((s, m) => s + m.total_revenue, 0);

  function startEdit(m: MamaPerformance) {
    setEditingId(m.id);
    setEditForm({
      shop_name: m.shop_name,
      location: m.location ?? "",
      contact_phone: m.contact_phone ?? "",
      status: m.status,
    });
  }

  async function saveEdit(id: string) {
    setSaving(true);
    const { error } = await supabase.from("MAMA_MBOGAS").update(editForm).eq("id", id);
    setSaving(false);
    if (!error) {
      setEditingId(null);
      router.refresh();
    }
  }

  return (
    <div className="bg-white rounded-card-lg shadow-soft overflow-x-auto">
      <div className="px-4 py-3 border-b border-cream-deep text-sm text-ink-soft">
        Total revenue: <span className="font-medium text-ink">KES {totalRevenue.toLocaleString()}</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-cream-deep text-ink-soft text-left">
            <th className="px-4 py-3 font-medium">Shop</th>
            <th className="px-4 py-3 font-medium">Location</th>
            <th className="px-4 py-3 font-medium text-right">Purchases</th>
            <th className="px-4 py-3 font-medium text-right">Revenue</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Due?</th>
            <th className="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((m) =>
            editingId === m.id ? (
              <tr key={m.id} className="border-t border-cream-deep bg-gold/5">
                <td className="px-2 py-2" colSpan={7}>
                  <div className="flex flex-wrap gap-2 items-center">
                    <input
                      value={editForm.shop_name}
                      onChange={(e) => setEditForm((f) => ({ ...f, shop_name: e.target.value }))}
                      className="rounded-card border border-cream-deep px-2 py-1 text-sm w-40"
                      placeholder="Shop name"
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
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                      className="rounded-card border border-cream-deep px-2 py-1 text-sm"
                    >
                      <option>Active</option>
                      <option>Inactive</option>
                    </select>
                    <button
                      onClick={() => saveEdit(m.id)}
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
              <tr key={m.id} className="border-t border-cream-deep">
                <td className="px-4 py-3 font-medium">{m.shop_name}</td>
                <td className="px-4 py-3 text-ink-soft">{m.location}</td>
                <td className="px-4 py-3 text-right">{m.visit_count}</td>
                <td className="px-4 py-3 text-right font-medium">KES {m.total_revenue.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIER_STYLES[m.performance_tier]}`}>
                    {m.performance_tier}
                  </span>
                </td>
                <td className="px-4 py-3">{m.due_for_visit ? "🛒 Yes" : "—"}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => startEdit(m)}
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
  );
}
