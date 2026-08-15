"use client";

import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { groupByPeriod, filterByDateRange, lastN, type Period } from "@/lib/analytics";

type Sale = { Date: string; Total: number; Customer_Type: string | null };

const PERIODS: { value: Period; label: string; count: number }[] = [
  { value: "day", label: "Daily", count: 30 },
  { value: "week", label: "Weekly", count: 12 },
  { value: "half-month", label: "Half-Month", count: 12 },
  { value: "month", label: "Monthly", count: 12 },
  { value: "quarter", label: "Quarterly", count: 8 },
  { value: "year", label: "Yearly", count: 5 },
];

export default function SalesTrendChart({ sales }: { sales: Sale[] }) {
  const [period, setPeriod] = useState<Period>("month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(() => filterByDateRange(sales, (s) => s.Date, from, to), [sales, from, to]);

  const data = useMemo(() => {
    const grouped = groupByPeriod(filtered, (s) => s.Date, period, {
      b2c: (acc, s) => acc + (s.Customer_Type?.includes("B2C") ? s.Total ?? 0 : 0),
      b2b: (acc, s) => acc + (s.Customer_Type && !s.Customer_Type.includes("B2C") ? s.Total ?? 0 : 0),
    });
    // A manual date range means "show me everything in that range" — only
    // cap to the last N buckets when there's no explicit range set (the
    // default "recent activity" view).
    if (from || to) return grouped;
    const count = PERIODS.find((p) => p.value === period)?.count ?? 12;
    return lastN(grouped, count);
  }, [filtered, period, from, to]);

  const totalInRange = filtered.reduce((s, x) => s + (x.Total ?? 0), 0);

  return (
    <div className="bg-white rounded-card-lg shadow-soft p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-medium text-ink">📈 Sales Trend</h2>
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
        {(from || to) && <span className="text-xs text-ink-soft mb-1 ml-auto">Total in range: KES {totalInRange.toLocaleString()}</span>}
      </div>

      {data.length === 0 ? (
        <p className="text-ink-soft text-sm">No sales data for this period/range.</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#fbead2" />
            <XAxis dataKey="label" stroke="#5c4436" fontSize={11} />
            <YAxis stroke="#5c4436" fontSize={11} />
            <Tooltip formatter={(v: number) => `KES ${v.toLocaleString()}`} />
            <Legend />
            <Bar dataKey="b2c" stackId="a" fill="#3b82f6" name="B2C" />
            <Bar dataKey="b2b" stackId="a" fill="#a855f7" name="B2B" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
