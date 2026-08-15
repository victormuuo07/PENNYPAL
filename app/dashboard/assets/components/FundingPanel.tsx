"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Funding = {
  id: string;
  funding_date: string;
  source: string;
  amount: number;
  funding_type: string;
  status: string;
};

export default function FundingPanel({ funding }: { funding: Funding[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    source: "",
    amount: 0,
    funding_type: "Equity",
    description: "",
    funding_date: new Date().toISOString().slice(0, 10),
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.source || form.amount <= 0) return;
    setSaving(true);

    const { error } = await supabase.from("FUNDING").insert({
      funding_date: form.funding_date,
      source: form.source,
      amount: form.amount,
      funding_type: form.funding_type,
      description: form.description,
      status: "Received",
    });

    setSaving(false);
    if (!error) {
      setOpen(false);
      setForm({ source: "", amount: 0, funding_type: "Equity", description: "", funding_date: new Date().toISOString().slice(0, 10) });
      router.refresh();
    }
  }

  const totalFunding = funding.reduce((s, f) => s + (f.amount ?? 0), 0);

  return (
    <div className="bg-white rounded-card-lg shadow-soft p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-ink">🏦 Funding</h2>
        <span className="text-sm text-ink-soft">Total raised: KES {totalFunding.toLocaleString()}</span>
      </div>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="bg-maroon hover:bg-red text-cream rounded-card px-4 py-2 text-sm font-medium"
        >
          + Add Funding
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            placeholder="Source (e.g. investor name)"
            required
            value={form.source}
            onChange={(e) => update("source", e.target.value)}
            className="rounded-card border border-cream-deep px-3 py-2 text-sm sm:col-span-2"
          />
          <select
            value={form.funding_type}
            onChange={(e) => update("funding_type", e.target.value)}
            className="rounded-card border border-cream-deep px-3 py-2 text-sm"
          >
            <option>Equity</option>
            <option>Loan</option>
            <option>Grant</option>
            <option>Personal</option>
          </select>
          <input
            type="number"
            min={0}
            placeholder="Amount (KES)"
            value={form.amount}
            onChange={(e) => update("amount", Number(e.target.value))}
            className="rounded-card border border-cream-deep px-3 py-2 text-sm"
          />
          <input
            placeholder="Description"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            className="rounded-card border border-cream-deep px-3 py-2 text-sm sm:col-span-2"
          />
          <label className="text-xs text-ink-soft">
            Date received
            <input
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={form.funding_date}
              onChange={(e) => update("funding_date", e.target.value)}
              className="w-full mt-1 rounded-card border border-cream-deep px-3 py-2 text-sm"
            />
          </label>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-ink-soft">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-maroon hover:bg-red text-cream rounded-card px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      )}

      {funding.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-cream-deep text-ink-soft text-left">
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Source</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium text-right">Amount</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {funding.map((f) => (
              <tr key={f.id} className="border-t border-cream-deep">
                <td className="px-3 py-2 text-ink-soft">{f.funding_date}</td>
                <td className="px-3 py-2">{f.source}</td>
                <td className="px-3 py-2 text-ink-soft">{f.funding_type}</td>
                <td className="px-3 py-2 text-right font-medium">KES {f.amount?.toLocaleString()}</td>
                <td className="px-3 py-2 text-ink-soft">{f.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
