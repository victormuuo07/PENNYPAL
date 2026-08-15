"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Hotel } from "@/lib/territoryAnalysis";

const DEFAULT_PRICE: Record<string, number> = {
  "100g Bottle": 150,
  "100g Refill": 120,
};

export default function RecordRefillForm({
  hotels,
  products,
}: {
  hotels: Hotel[];
  products: string[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    hotel_id: hotels[0]?.id ?? "",
    product_type: products[0],
    quantity: 1,
    amount_paid: 0,
    notes: "",
    refill_date: new Date().toISOString().slice(0, 10),
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.hotel_id || form.quantity <= 0) return;
    setSaving(true);

    const fallback = form.quantity * (DEFAULT_PRICE[form.product_type] ?? 100);

    const { error } = await supabase.from("HOTEL_REFILLS").insert({
      hotel_id: form.hotel_id,
      refill_date: form.refill_date,
      product_type: form.product_type,
      quantity: form.quantity,
      amount_paid: form.amount_paid > 0 ? form.amount_paid : fallback,
      payment_status: "Paid",
      notes: form.notes,
    });

    setSaving(false);
    if (!error) {
      setForm({ ...form, quantity: 1, amount_paid: 0, notes: "", refill_date: new Date().toISOString().slice(0, 10) });
      router.refresh();
    }
  }

  if (hotels.length === 0) {
    return (
      <div className="bg-white rounded-card-lg shadow-soft p-6 text-ink-soft text-sm">
        Add a hotel first before recording a refill.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-card-lg shadow-soft p-6 space-y-3">
      <h2 className="font-medium text-ink">🔄 Record Hotel Refill</h2>
      <select
        value={form.hotel_id}
        onChange={(e) => update("hotel_id", e.target.value)}
        className="w-full rounded-card border border-cream-deep px-3 py-2 text-sm"
      >
        {hotels.map((h) => (
          <option key={h.id} value={h.id}>
            {h.hotel_name}
          </option>
        ))}
      </select>
      <select
        value={form.product_type}
        onChange={(e) => update("product_type", e.target.value)}
        className="w-full rounded-card border border-cream-deep px-3 py-2 text-sm"
      >
        {products.map((p) => (
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
        <input
          type="number"
          min={0}
          placeholder="Amount paid (auto if 0)"
          value={form.amount_paid || ""}
          onChange={(e) => update("amount_paid", Number(e.target.value))}
          className="rounded-card border border-cream-deep px-3 py-2 text-sm"
        />
      </div>
      <input
        placeholder="Notes"
        value={form.notes}
        onChange={(e) => update("notes", e.target.value)}
        className="w-full rounded-card border border-cream-deep px-3 py-2 text-sm"
      />
      <label className="block text-xs text-ink-soft">
        Refill date
        <input
          type="date"
          max={new Date().toISOString().slice(0, 10)}
          value={form.refill_date}
          onChange={(e) => update("refill_date", e.target.value)}
          className="w-full mt-1 rounded-card border border-cream-deep px-3 py-2 text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={saving}
        className="bg-maroon hover:bg-red text-cream rounded-card px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {saving ? "Saving…" : "Record refill"}
      </button>
    </form>
  );
}
