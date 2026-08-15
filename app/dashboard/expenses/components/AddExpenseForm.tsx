"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const CATEGORIES = [
  "Raw Materials",
  "Packaging",
  "Transport",
  "Salaries",
  "Marketing",
  "Utilities",
  "Other",
];

export default function AddExpenseForm() {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    category: CATEGORIES[0],
    description: "",
    amount: 0,
    payment_method: "Cash",
    paid_by: "",
    status: "Paid",
    date: new Date().toISOString().slice(0, 10),
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { error } = await supabase.from("EXPENSES").insert({
      date: form.date,
      category: form.category,
      description: form.description,
      amount: form.amount,
      payment_method: form.payment_method,
      paid_by: form.paid_by,
      status: form.status,
    });

    setSaving(false);
    if (error) {
      setError(error.message);
    } else {
      setOpen(false);
      setForm({ ...form, description: "", amount: 0, paid_by: "", date: new Date().toISOString().slice(0, 10) });
      router.refresh();
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-maroon hover:bg-red text-cream rounded-card px-4 py-2 text-sm font-medium transition-colors"
      >
        + Add Expense
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-card-lg shadow-soft p-6 grid grid-cols-1 sm:grid-cols-3 gap-4"
    >
      <select
        value={form.category}
        onChange={(e) => update("category", e.target.value)}
        className="rounded-card border border-cream-deep px-3 py-2"
      >
        {CATEGORIES.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <input
        placeholder="Description"
        value={form.description}
        onChange={(e) => update("description", e.target.value)}
        className="rounded-card border border-cream-deep px-3 py-2 sm:col-span-2"
      />
      <input
        type="number"
        min={0}
        placeholder="Amount (KES)"
        value={form.amount}
        onChange={(e) => update("amount", Number(e.target.value))}
        className="rounded-card border border-cream-deep px-3 py-2"
      />
      <select
        value={form.payment_method}
        onChange={(e) => update("payment_method", e.target.value)}
        className="rounded-card border border-cream-deep px-3 py-2"
      >
        <option>Cash</option>
        <option>M-Pesa</option>
        <option>Bank</option>
      </select>
      <input
        placeholder="Paid by"
        value={form.paid_by}
        onChange={(e) => update("paid_by", e.target.value)}
        className="rounded-card border border-cream-deep px-3 py-2"
      />
      <input
        type="date"
        max={new Date().toISOString().slice(0, 10)}
        value={form.date}
        onChange={(e) => update("date", e.target.value)}
        className="rounded-card border border-cream-deep px-3 py-2"
      />

      <div className="sm:col-span-3 flex gap-2 justify-end items-center">
        {error && <span className="text-red-bright text-sm mr-auto">{error}</span>}
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 rounded-card text-sm text-ink-soft hover:bg-cream-deep"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="bg-maroon hover:bg-red text-cream rounded-card px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save expense"}
        </button>
      </div>
    </form>
  );
}
