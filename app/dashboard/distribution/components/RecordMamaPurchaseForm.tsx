"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { MamaMboga } from "@/lib/territoryAnalysis";

const PRICES: Record<string, number> = {
  "100g Bottle": 150,
  "100g Refill": 120,
  "60g Refill": 100,
  "30g Refill": 50,
  "Sachet 5": 5,
  "Sachet 40": 40,
};

export default function RecordMamaPurchaseForm({ mamas }: { mamas: MamaMboga[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    mama_id: mamas[0]?.id ?? "",
    product_type: Object.keys(PRICES)[0],
    quantity: 1,
    purchase_date: new Date().toISOString().slice(0, 10),
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const unitPrice = PRICES[form.product_type];
  const total = unitPrice * form.quantity;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.mama_id || form.quantity <= 0) return;
    setSaving(true);
    setError(null);

    const { error } = await supabase.from("MAMA_MBOGAS_PURCHASES").insert({
      mama_id: form.mama_id,
      purchase_date: form.purchase_date,
      product_type: form.product_type,
      quantity: form.quantity,
      unit_price: unitPrice,
      total_amount: total,
      payment_status: "Paid",
    });

    setSaving(false);
    if (error) {
      setError(error.message);
    } else {
      setForm({ ...form, quantity: 1, purchase_date: new Date().toISOString().slice(0, 10) });
      router.refresh();
    }
  }

  if (mamas.length === 0) {
    return (
      <div className="bg-white rounded-card-lg shadow-soft p-6 text-ink-soft text-sm">
        Add a Mama Mboga/shop first before recording a purchase.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-card-lg shadow-soft p-6 space-y-3">
      <h2 className="font-medium text-ink">🛒 Record Mama Mboga Purchase</h2>
      <select
        value={form.mama_id}
        onChange={(e) => update("mama_id", e.target.value)}
        className="w-full rounded-card border border-cream-deep px-3 py-2 text-sm"
      >
        {mamas.map((m) => (
          <option key={m.id} value={m.id}>
            {m.shop_name}
          </option>
        ))}
      </select>
      <select
        value={form.product_type}
        onChange={(e) => update("product_type", e.target.value)}
        className="w-full rounded-card border border-cream-deep px-3 py-2 text-sm"
      >
        {Object.keys(PRICES).map((p) => (
          <option key={p}>{p}</option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-3">
        <input
          type="number"
          min={1}
          placeholder="Quantity"
          value={form.quantity}
          onChange={(e) => update("quantity", Number(e.target.value))}
          className="rounded-card border border-cream-deep px-3 py-2 text-sm"
        />
        <div className="flex items-center text-ink-soft text-sm">Total: KES {total.toLocaleString()}</div>
      </div>
      <label className="block text-xs text-ink-soft">
        Purchase date
        <input
          type="date"
          max={new Date().toISOString().slice(0, 10)}
          value={form.purchase_date}
          onChange={(e) => update("purchase_date", e.target.value)}
          className="w-full mt-1 rounded-card border border-cream-deep px-3 py-2 text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={saving}
        className="bg-maroon hover:bg-red text-cream rounded-card px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {saving ? "Saving…" : "Record purchase"}
      </button>
      {error && <p className="text-red-bright text-sm">{error}</p>}
    </form>
  );
}
