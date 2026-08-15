"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type CostSettings = { id?: string; cost_per_gram: number; label_cost: number; bottle_cost: number; sachet_cost: number };

// Same product list, prices, and cost formula as the Streamlit Profit
// Calculator — ingredient cost = weight × cost_per_gram, packaging cost
// depends on sachet vs bottle vs refill.
const PRODUCTS = [
  { name: "1.5g Sachet (Street)", weight_g: 1.5, price: 10, channel: "Street", type: "sachet" as const },
  { name: "1.5g Sachet (School)", weight_g: 1.5, price: 5, channel: "School B2B", type: "sachet" as const },
  { name: "1.5g Sachet (B2B)", weight_g: 1.5, price: 2.9, channel: "Wholesale", type: "sachet" as const },
  { name: "5g Sachet", weight_g: 5, price: 20, channel: "Retail", type: "sachet" as const },
  { name: "10g Sachet (B2B)", weight_g: 10, price: 30, channel: "Wholesale", type: "sachet" as const },
  { name: "10g Sachet (B2C)", weight_g: 10, price: 40, channel: "Retail", type: "sachet" as const },
  { name: "100g Bottle (B2B)", weight_g: 100, price: 150, channel: "Wholesale", type: "bottle" as const },
  { name: "100g Bottle (B2C)", weight_g: 100, price: 200, channel: "Retail", type: "bottle" as const },
  { name: "100g Refill (B2B)", weight_g: 100, price: 100, channel: "Refill Wholesale", type: "refill" as const },
  { name: "100g Refill (B2C)", weight_g: 100, price: 120, channel: "Refill Retail", type: "refill" as const },
];

function packagingCost(type: "sachet" | "bottle" | "refill", costs: CostSettings) {
  if (type === "sachet") return costs.sachet_cost;
  if (type === "bottle") return costs.label_cost + costs.bottle_cost;
  return costs.label_cost; // refill — label only, no new bottle
}

export default function ProductProfitability({ initialCosts }: { initialCosts: CostSettings }) {
  const router = useRouter();
  const supabase = createClient();
  const [costs, setCosts] = useState<CostSettings>(initialCosts);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    return PRODUCTS.map((p) => {
      const ingredientCost = p.weight_g * costs.cost_per_gram;
      const packCost = packagingCost(p.type, costs);
      const totalCost = ingredientCost + packCost;
      const profit = p.price - totalCost;
      const margin = p.price > 0 ? (profit / p.price) * 100 : 0;
      return { ...p, ingredientCost, packCost, totalCost, profit, margin };
    });
  }, [costs]);

  const avgMargin = results.reduce((s, r) => s + r.margin, 0) / results.length;
  const mostProfitable = [...results].sort((a, b) => b.margin - a.margin)[0];
  const leastProfitable = [...results].sort((a, b) => a.margin - b.margin)[0];

  async function saveCosts() {
    setSaving(true);
    const payload = { ...costs, updated_at: new Date().toISOString() };
    const { error } = costs.id
      ? await supabase.from("COST_SETTINGS").update(payload).eq("id", costs.id)
      : await supabase.from("COST_SETTINGS").insert(payload).select().single();
    setSaving(false);
    if (!error) {
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <div className="bg-white rounded-card-lg shadow-soft p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-medium text-ink">💰 Product Profitability</h2>
        <button onClick={() => setOpen(!open)} className="text-xs bg-cream-deep hover:bg-gold/20 rounded-card px-3 py-1.5">
          ⚙️ {open ? "Hide costs" : "Edit costs"}
        </button>
      </div>
      <p className="text-sm text-ink-soft mb-4">
        Average margin across all products: <span className="font-medium text-ink">{avgMargin.toFixed(1)}%</span>
        {mostProfitable && (
          <>
            {" "}
            · Best: <span className="font-medium text-green-700">{mostProfitable.name}</span> ({mostProfitable.margin.toFixed(0)}%)
          </>
        )}
        {leastProfitable && (
          <>
            {" "}
            · Worst: <span className="font-medium text-red-bright">{leastProfitable.name}</span> ({leastProfitable.margin.toFixed(0)}%)
          </>
        )}
      </p>

      {open && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 bg-cream-deep/50 rounded-card p-4">
          <CostInput
            label="Cost per gram (KES)"
            value={costs.cost_per_gram}
            onChange={(v) => setCosts({ ...costs, cost_per_gram: v })}
          />
          <CostInput label="Label cost (KES)" value={costs.label_cost} onChange={(v) => setCosts({ ...costs, label_cost: v })} />
          <CostInput label="Bottle cost (KES)" value={costs.bottle_cost} onChange={(v) => setCosts({ ...costs, bottle_cost: v })} />
          <CostInput label="Sachet cost (KES)" value={costs.sachet_cost} onChange={(v) => setCosts({ ...costs, sachet_cost: v })} />
          <div className="col-span-2 sm:col-span-4">
            <button
              onClick={saveCosts}
              disabled={saving}
              className="bg-maroon hover:bg-red text-cream rounded-card px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save costs"}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-cream-deep text-ink-soft text-left">
              <th className="px-3 py-2 font-medium">Product</th>
              <th className="px-3 py-2 font-medium">Channel</th>
              <th className="px-3 py-2 font-medium text-right">Cost</th>
              <th className="px-3 py-2 font-medium text-right">Price</th>
              <th className="px-3 py-2 font-medium text-right">Profit</th>
              <th className="px-3 py-2 font-medium text-right">Margin</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.name} className="border-t border-cream-deep">
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2 text-ink-soft">{r.channel}</td>
                <td className="px-3 py-2 text-right text-ink-soft">KES {r.totalCost.toFixed(1)}</td>
                <td className="px-3 py-2 text-right">KES {r.price}</td>
                <td className={`px-3 py-2 text-right font-medium ${r.profit >= 0 ? "text-green-700" : "text-red-bright"}`}>
                  KES {r.profit.toFixed(1)}
                </td>
                <td className="px-3 py-2 text-right">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      r.margin >= 40 ? "bg-green-50 text-green-700" : r.margin >= 15 ? "bg-gold/10 text-gold-dark" : "bg-red-50 text-red-bright"
                    }`}
                  >
                    {r.margin.toFixed(0)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CostInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="text-xs text-ink-soft">
      {label}
      <input
        type="number"
        min={0}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full mt-1 rounded-card border border-cream-deep px-2 py-1.5 text-sm"
      />
    </label>
  );
}
