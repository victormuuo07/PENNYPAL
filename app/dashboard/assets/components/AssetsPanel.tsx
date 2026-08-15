"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Asset = {
  id: string;
  asset_name: string;
  asset_type: string;
  purchase_date: string;
  purchase_cost: number;
  current_value: number | null;
  supplier: string | null;
  status: string;
};

export default function AssetsPanel({ assets }: { assets: Asset[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    asset_name: "",
    asset_type: "Equipment",
    purchase_cost: 0,
    supplier: "",
    purchase_date: new Date().toISOString().slice(0, 10),
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.asset_name) return;
    setSaving(true);

    const { error } = await supabase.from("ASSETS").insert({
      asset_name: form.asset_name,
      asset_type: form.asset_type,
      purchase_date: form.purchase_date,
      purchase_cost: form.purchase_cost,
      current_value: form.purchase_cost,
      supplier: form.supplier,
      status: "Active",
    });

    setSaving(false);
    if (!error) {
      setOpen(false);
      setForm({ asset_name: "", asset_type: "Equipment", purchase_cost: 0, supplier: "", purchase_date: new Date().toISOString().slice(0, 10) });
      router.refresh();
    }
  }

  const totalValue = assets.reduce((s, a) => s + (a.current_value ?? a.purchase_cost ?? 0), 0);

  return (
    <div className="bg-white rounded-card-lg shadow-soft p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-ink">🏷️ Assets</h2>
        <span className="text-sm text-ink-soft">Total value: KES {totalValue.toLocaleString()}</span>
      </div>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="bg-maroon hover:bg-red text-cream rounded-card px-4 py-2 text-sm font-medium"
        >
          + Add Asset
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            placeholder="Asset name"
            required
            value={form.asset_name}
            onChange={(e) => update("asset_name", e.target.value)}
            className="rounded-card border border-cream-deep px-3 py-2 text-sm sm:col-span-2"
          />
          <select
            value={form.asset_type}
            onChange={(e) => update("asset_type", e.target.value)}
            className="rounded-card border border-cream-deep px-3 py-2 text-sm"
          >
            <option>Equipment</option>
            <option>Vehicle</option>
            <option>Furniture</option>
            <option>Electronics</option>
            <option>Other</option>
          </select>
          <input
            type="number"
            min={0}
            placeholder="Cost (KES)"
            value={form.purchase_cost}
            onChange={(e) => update("purchase_cost", Number(e.target.value))}
            className="rounded-card border border-cream-deep px-3 py-2 text-sm"
          />
          <input
            placeholder="Supplier"
            value={form.supplier}
            onChange={(e) => update("supplier", e.target.value)}
            className="rounded-card border border-cream-deep px-3 py-2 text-sm sm:col-span-2"
          />
          <label className="text-xs text-ink-soft">
            Purchase date
            <input
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={form.purchase_date}
              onChange={(e) => update("purchase_date", e.target.value)}
              className="w-full mt-1 rounded-card border border-cream-deep px-3 py-2 text-sm"
            />
          </label>
          <div className="sm:col-span-2 flex gap-2 justify-end">
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-ink-soft">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-maroon hover:bg-red text-cream rounded-card px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save asset"}
            </button>
          </div>
        </form>
      )}

      {assets.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-cream-deep text-ink-soft text-left">
              <th className="px-3 py-2 font-medium">Asset</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Purchased</th>
              <th className="px-3 py-2 font-medium text-right">Cost</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.id} className="border-t border-cream-deep">
                <td className="px-3 py-2">{a.asset_name}</td>
                <td className="px-3 py-2 text-ink-soft">{a.asset_type}</td>
                <td className="px-3 py-2 text-ink-soft">{a.purchase_date}</td>
                <td className="px-3 py-2 text-right">KES {a.purchase_cost?.toLocaleString()}</td>
                <td className="px-3 py-2 text-ink-soft">{a.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
