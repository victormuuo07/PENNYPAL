"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { groupByPeriod, lastN } from "@/lib/analytics";

type Txn = { date: string; amount: number; name: string };

export default function DistributionAnalytics({
  title,
  icon,
  transactions,
}: {
  title: string;
  icon: string;
  transactions: Txn[];
}) {
  const trend = useMemo(() => {
    const grouped = groupByPeriod(transactions, (t) => t.date, "week", {
      count: (acc) => acc + 1,
      revenue: (acc, t) => acc + (t.amount ?? 0),
    });
    return lastN(grouped, 12);
  }, [transactions]);

  const topByRevenue = useMemo(() => {
    const totals = new Map<string, number>();
    for (const t of transactions) totals.set(t.name, (totals.get(t.name) ?? 0) + (t.amount ?? 0));
    return Array.from(totals.entries())
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [transactions]);

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-card-lg shadow-soft p-6 text-ink-soft text-sm">
        No {title.toLowerCase()} data yet.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-card-lg shadow-soft p-6">
      <h2 className="text-lg font-medium text-ink mb-4">
        {icon} {title}
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="text-xs font-medium text-ink-soft mb-2">Refill/purchase frequency (last 12 weeks)</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#fbead2" />
              <XAxis dataKey="label" stroke="#5c4436" fontSize={10} />
              <YAxis stroke="#5c4436" fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#f2b705" name="Visits" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div>
          <div className="text-xs font-medium text-ink-soft mb-2">Top by revenue</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topByRevenue} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#fbead2" />
              <XAxis type="number" stroke="#5c4436" fontSize={10} />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#5c4436"
                fontSize={10}
                width={110}
                tickFormatter={(v: string) => (v.length > 14 ? v.slice(0, 13) + "…" : v)}
              />
              <Tooltip formatter={(v: number) => `KES ${v.toLocaleString()}`} />
              <Bar dataKey="revenue" fill="#a01d1d" name="Revenue" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
