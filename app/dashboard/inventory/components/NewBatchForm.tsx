"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Material = { material_name: string; current_stock_kg: number };

const RATIOS: Record<string, number> = {
  Salt: 0.5,
  "African Birds Eye": 0.3,
  "Cayenne Pepper": 0.15,
  "Onion Powder": 0.02,
  "Garlic Powder": 0.02,
  Paprika: 0.01,
};

export default function NewBatchForm({ materials }: { materials: Material[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    batch_number: "",
    total_kg: 2,
    sachet_5: 0,
    sachet_30: 0,
    bottle_100g: 0,
    refill_100g: 0,
    notes: "",
    production_date: new Date().toISOString().slice(0, 10),
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const requirements = useMemo(
    () =>
      Object.entries(RATIOS).map(([name, ratio]) => {
        const needed = form.total_kg * ratio;
        const available = materials.find((m) => m.material_name === name)?.current_stock_kg ?? 0;
        return { name, needed, available, sufficient: available >= needed };
      }),
    [form.total_kg, materials]
  );

  const allSufficient = requirements.every((r) => r.sufficient);
  const totalUnits = form.sachet_5 + form.sachet_30 + form.bottle_100g + form.refill_100g;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.batch_number || totalUnits === 0 || !allSufficient) return;
    setSaving(true);
    setError(null);

    const { error } = await supabase.rpc("create_production_batch", {
      p_batch_number: form.batch_number,
      p_production_date: form.production_date,
      p_total_kg: form.total_kg,
      p_sachet_5_qty: form.sachet_5,
      p_sachet_30_qty: form.sachet_30,
      p_bottle_100g_qty: form.bottle_100g,
      p_refill_100g_qty: form.refill_100g,
      p_notes: form.notes,
    });

    setSaving(false);
    if (error) {
      setError(error.message);
    } else {
      setForm({ batch_number: "", total_kg: 2, sachet_5: 0, sachet_30: 0, bottle_100g: 0, refill_100g: 0, notes: "", production_date: new Date().toISOString().slice(0, 10) });
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-card-lg shadow-soft p-6 space-y-4">
      <h2 className="font-medium text-ink">🏭 New Production Batch</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          placeholder="Batch number (e.g. BATCH-001)"
          value={form.batch_number}
          onChange={(e) => update("batch_number", e.target.value)}
          className="rounded-card border border-cream-deep px-3 py-2 text-sm"
        />
        <input
          type="number"
          min={0.1}
          step={0.1}
          placeholder="Total kg produced"
          value={form.total_kg}
          onChange={(e) => update("total_kg", Number(e.target.value))}
          className="rounded-card border border-cream-deep px-3 py-2 text-sm"
        />
        <label className="text-xs text-ink-soft">
          Production date
          <input
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            value={form.production_date}
            onChange={(e) => update("production_date", e.target.value)}
            className="w-full mt-1 rounded-card border border-cream-deep px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div>
        <div className="text-xs font-medium text-ink-soft mb-2">Material requirements vs available</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm">
          {requirements.map((r) => (
            <div key={r.name} className="flex justify-between px-3 py-1.5 rounded-card bg-cream-deep/50">
              <span>{r.sufficient ? "✅" : "❌"} {r.name}</span>
              <span className="text-ink-soft">
                need {r.needed.toFixed(2)}kg · have {r.available.toFixed(2)}kg
              </span>
            </div>
          ))}
        </div>
        {!allSufficient && (
          <p className="text-red-bright text-sm mt-2">
            ⚠️ Insufficient materials for this batch size — restock or reduce total kg.
          </p>
        )}
      </div>

      <div>
        <div className="text-xs font-medium text-ink-soft mb-2">Finished goods produced</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <LabeledNumber label="5 KES Sachets" value={form.sachet_5} onChange={(v) => update("sachet_5", v)} />
          <LabeledNumber label="30 KES Sachets" value={form.sachet_30} onChange={(v) => update("sachet_30", v)} />
          <LabeledNumber label="100g Bottles" value={form.bottle_100g} onChange={(v) => update("bottle_100g", v)} />
          <LabeledNumber label="100g Refills" value={form.refill_100g} onChange={(v) => update("refill_100g", v)} />
        </div>
        <p className="text-ink-soft text-sm mt-2">📦 Total units: {totalUnits.toLocaleString()}</p>
      </div>

      <input
        placeholder="Production notes"
        value={form.notes}
        onChange={(e) => update("notes", e.target.value)}
        className="w-full rounded-card border border-cream-deep px-3 py-2 text-sm"
      />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving || totalUnits === 0 || !allSufficient || !form.batch_number}
          className="bg-maroon hover:bg-red text-cream rounded-card px-4 py-2 text-sm font-medium disabled:opacity-40"
        >
          {saving ? "Saving…" : "✅ Save production batch"}
        </button>
        {error && <span className="text-red-bright text-sm">{error}</span>}
      </div>
    </form>
  );
}

function LabeledNumber({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="text-xs text-ink-soft">
      {label}
      <input
        type="number"
        min={0}
        step={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full mt-1 rounded-card border border-cream-deep px-2 py-1.5 text-sm"
      />
    </label>
  );
}
