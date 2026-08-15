"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { groupByPeriod, filterByDateRange, lastN, type Period } from "@/lib/analytics";

type Expense = { date: string; amount: number; category: string | null };

const PERIODS: { value: Period; label: string; count: number }[] = [
  { value: "day", label: "Daily", count: 30 },
  { value: "week", label: "Weekly", count: 12 },
  { value: "half-month", label: "Half-Month", count: 12 },
  { value: "month", label: "Monthly", count: 12 },
  { value: "quarter", label: "Quarterly", count: 8 },
  { value: "year", label: "Yearly", count: 5 },
];

export default function ExpenseAnalytics({ expenses }: { expenses: Expense[] }) {
  const [period, setPeriod] = useState<Period>("month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(() => filterByDateRange(expenses, (e) => e.date, from, to), [expenses, from, to]);

  const byCategory = useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of filtered) {
      const cat = e.category || "Uncategorized";
      totals.set(cat, (totals.get(cat) ?? 0) + (e.amount ?? 0));
    }
    const sorted = Array.from(totals.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    if (sorted.length <= 8) return sorted;
    const top = sorted.slice(0, 8);
    const otherTotal = sorted.slice(8).reduce((s, c) => s + c.value, 0);
    return [...top, { name: `Other (${sorted.length - 8} categories)`, value: otherTotal }];
  }, [filtered]);

  const trend = useMemo(() => {
    const grouped = groupByPeriod(filtered, (e) => e.date, period, {
      total: (acc, e) => acc + (e.amount ?? 0),
    });
    if (from || to) return grouped;
    const count = PERIODS.find((p) => p.value === period)?.count ?? 12;
    return lastN(grouped, count);
  }, [filtered, period, from, to]);

  const totalSpend = byCategory.reduce((s, c) => s + c.value, 0);
  const topCategory = byCategory[0];

  return (
    <div className="bg-white rounded-card-lg shadow-soft p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h2 className="text-lg font-medium text-ink">🧾 Expense Analysis</h2>
        <div className="flex gap-1 bg-cream-deep rounded-card p-1 flex-wrap">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`text-xs px-3 py-1 rounded-card font-medium transition-colors ${
                period === p.value ? "bg-maroon text-cream" : "text-ink-soft hover:bg-white"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {topCategory && (
        <p className="text-sm text-ink-soft mb-3">
          Biggest category: <span className="font-medium text-ink">{topCategory.name}</span> (
          {Math.round((topCategory.value / totalSpend) * 100)}% of spend)
        </p>
      )}

      <div className="flex flex-wrap items-end gap-3 mb-4 bg-cream-deep/50 rounded-card p-3">
        <label className="text-xs text-ink-soft">
          From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="block mt-1 rounded-card border border-cream-deep px-2 py-1 text-sm" />
        </label>
        <label className="text-xs text-ink-soft">
          To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="block mt-1 rounded-card border border-cream-deep px-2 py-1 text-sm" />
        </label>
        {(from || to) && (
          <button onClick={() => { setFrom(""); setTo(""); }} className="text-xs text-ink-soft underline mb-1">
            Clear range
          </button>
        )}
        {(from || to) && <span className="text-xs text-ink-soft mb-1 ml-auto">Total in range: KES {totalSpend.toLocaleString()}</span>}
      </div>

      {filtered.length === 0 ? (
        <p className="text-ink-soft text-sm">No expenses for this period/range.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="text-xs font-medium text-ink-soft mb-2">Top categories by spend</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={byCategory} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" stroke="#5c4436" fontSize={10} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#5c4436"
                  fontSize={10}
                  width={140}
                  tickFormatter={(v: string) => (v.length > 18 ? v.slice(0, 17) + "…" : v)}
                />
                <Tooltip formatter={(v: number) => `KES ${v.toLocaleString()}`} />
                <Bar dataKey="value" fill="#a01d1d" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <div className="text-xs font-medium text-ink-soft mb-2">Trend</div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#fbead2" />
                <XAxis dataKey="label" stroke="#5c4436" fontSize={11} />
                <YAxis stroke="#5c4436" fontSize={11} />
                <Tooltip formatter={(v: number) => `KES ${v.toLocaleString()}`} />
                <Line type="monotone" dataKey="total" stroke="#a01d1d" strokeWidth={2} name="Expenses" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
