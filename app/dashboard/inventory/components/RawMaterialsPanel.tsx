"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Material = {
  id: string;
  material_name: string;
  current_stock_kg: number;
  unit_cost: number;
  reorder_level: number;
  last_restock_date: string | null;
};

const RECIPE_MATERIALS = ["Salt", "African Birds Eye", "Cayenne Pepper", "Onion Powder", "Garlic Powder", "Paprika"];

export default function RawMaterialsPanel({ materials }: { materials: Material[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    material_name: materials[0]?.material_name ?? RECIPE_MATERIALS[0],
    quantity_kg: 5,
    cost_per_kg: 100,
    supplier: "",
    notes: "",
    restock_date: new Date().toISOString().slice(0, 10),
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleRestock(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { error } = await supabase.rpc("record_material_restock", {
      p_material_name: form.material_name,
      p_quantity_kg: form.quantity_kg,
      p_cost_per_kg: form.cost_per_kg,
      p_supplier: form.supplier || "Unknown",
      p_restock_date: form.restock_date,
      p_notes: form.notes,
    });

    setSaving(false);
    if (error) {
      setError(error.message);
    } else {
      setForm({ ...form, quantity_kg: 5, supplier: "", notes: "", restock_date: new Date().toISOString().slice(0, 10) });
      router.refresh();
    }
  }

  const materialOptions = materials.length > 0 ? materials.map((m) => m.material_name) : RECIPE_MATERIALS;

  return (
    <div className="bg-white rounded-card-lg shadow-soft p-6 space-y-4">
      <h2 className="font-medium text-ink">📦 Raw Materials</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-cream-deep text-ink-soft text-left">
              <th className="px-3 py-2 font-medium">Material</th>
              <th className="px-3 py-2 font-medium text-right">Stock (kg)</th>
              <th className="px-3 py-2 font-medium text-right">Unit Cost</th>
              <th className="px-3 py-2 font-medium text-right">Reorder Level</th>
              <th className="px-3 py-2 font-medium">Last Restock</th>
            </tr>
          </thead>
          <tbody>
            {materials.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-ink-soft text-center">
                  No materials yet — record your first restock below.
                </td>
              </tr>
            )}
            {materials.map((m) => {
              const low = m.current_stock_kg <= m.reorder_level;
              return (
                <tr key={m.id} className="border-t border-cream-deep">
                  <td className="px-3 py-2">{m.material_name}</td>
                  <td className={`px-3 py-2 text-right font-medium ${low ? "text-red-bright" : ""}`}>
                    {m.current_stock_kg?.toFixed(2)} {low && "⚠️"}
                  </td>
                  <td className="px-3 py-2 text-right text-ink-soft">KES {m.unit_cost}</td>
                  <td className="px-3 py-2 text-right text-ink-soft">{m.reorder_level}</td>
                  <td className="px-3 py-2 text-ink-soft">{m.last_restock_date ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <form onSubmit={handleRestock} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-cream-deep">
        <select
          value={form.material_name}
          onChange={(e) => update("material_name", e.target.value)}
          className="rounded-card border border-cream-deep px-3 py-2 text-sm"
        >
          {materialOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={0.1}
          step={0.1}
          placeholder="Quantity (kg)"
          value={form.quantity_kg}
          onChange={(e) => update("quantity_kg", Number(e.target.value))}
          className="rounded-card border border-cream-deep px-3 py-2 text-sm"
        />
        <input
          type="number"
          min={0}
          placeholder="Cost per kg (KES)"
          value={form.cost_per_kg}
          onChange={(e) => update("cost_per_kg", Number(e.target.value))}
          className="rounded-card border border-cream-deep px-3 py-2 text-sm"
        />
        <input
          placeholder="Supplier"
          value={form.supplier}
          onChange={(e) => update("supplier", e.target.value)}
          className="rounded-card border border-cream-deep px-3 py-2 text-sm"
        />
        <input
          placeholder="Notes"
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          className="rounded-card border border-cream-deep px-3 py-2 text-sm sm:col-span-2"
        />
        <label className="text-xs text-ink-soft">
          Restock date
          <input
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            value={form.restock_date}
            onChange={(e) => update("restock_date", e.target.value)}
            className="w-full mt-1 rounded-card border border-cream-deep px-3 py-2 text-sm"
          />
        </label>
        <div className="sm:col-span-3 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-maroon hover:bg-red text-cream rounded-card px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {saving ? "Saving…" : "💾 Record restock"}
          </button>
          {error && <span className="text-red-bright text-sm">{error}</span>}
        </div>
      </form>
    </div>
  );
}
