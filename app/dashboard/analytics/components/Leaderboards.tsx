"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";

// Supabase's foreign-table join syntax (SALES_PEOPLE(full_name)) types as
// an array even for a many-to-one relationship like this one — at runtime
// it's a single-element array, not a bare object.
type Sale = { Total: number; sales_person_id: string | null; SALES_PEOPLE: { full_name: string }[] | null };
type Venue = { name: string; revenue: number; visits: number };

export default function Leaderboards({ sales, venues }: { sales: Sale[]; venues: Venue[] }) {
  const repRanking = useMemo(() => {
    const totals = new Map<string, { revenue: number; count: number }>();
    for (const s of sales) {
      const name = s.SALES_PEOPLE?.[0]?.full_name;
      if (!name) continue;
      const existing = totals.get(name) ?? { revenue: 0, count: 0 };
      existing.revenue += s.Total ?? 0;
      existing.count += 1;
      totals.set(name, existing);
    }
    return Array.from(totals.entries())
      .map(([name, v]) => ({ name, revenue: v.revenue, sales: v.count }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [sales]);

  const venueScatter = venues.map((v) => ({ ...v, avgOrder: v.visits > 0 ? Math.round(v.revenue / v.visits) : 0 }));

  return (
    <div className="space-y-4">
      {repRanking.length > 0 && (
        <div className="bg-white rounded-card-lg shadow-soft p-6">
          <h2 className="text-lg font-medium text-ink mb-4">🏅 Sales Rep Leaderboard</h2>
          <ResponsiveContainer width="100%" height={Math.max(180, repRanking.length * 40)}>
            <BarChart data={repRanking} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#fbead2" />
              <XAxis type="number" stroke="#5c4436" fontSize={10} />
              <YAxis type="category" dataKey="name" stroke="#5c4436" fontSize={11} width={100} />
              <Tooltip formatter={(v: number, name: string) => (name === "revenue" ? `KES ${v.toLocaleString()}` : v)} />
              <Bar dataKey="revenue" fill="#a01d1d" radius={[0, 4, 4, 0]} name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
          <table className="w-full text-sm mt-4">
            <thead>
              <tr className="text-left text-ink-soft border-b border-cream-deep">
                <th className="py-2">Rep</th>
                <th className="py-2 text-right">Sales made</th>
                <th className="py-2 text-right">Revenue</th>
                <th className="py-2 text-right">Avg order</th>
              </tr>
            </thead>
            <tbody>
              {repRanking.map((r) => (
                <tr key={r.name} className="border-b border-cream-deep last:border-0">
                  <td className="py-2 font-medium">{r.name}</td>
                  <td className="py-2 text-right">{r.sales}</td>
                  <td className="py-2 text-right">KES {r.revenue.toLocaleString()}</td>
                  <td className="py-2 text-right text-ink-soft">KES {Math.round(r.revenue / r.sales).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {venues.length > 0 && (
        <div className="bg-white rounded-card-lg shadow-soft p-6">
          <h2 className="text-lg font-medium text-ink mb-1">🏨 Hotel/Shop Performance</h2>
          <p className="text-xs text-ink-soft mb-4">
            Revenue vs number of visits — bubble size shows average order value. Top-right is your best customers;
            bottom-left is where you're spending visits without much return.
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ left: 10, right: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#fbead2" />
              <XAxis type="number" dataKey="visits" name="Visits" stroke="#5c4436" fontSize={11} label={{ value: "Visits", position: "insideBottom", offset: -5, fontSize: 11 }} />
              <YAxis type="number" dataKey="revenue" name="Revenue" stroke="#5c4436" fontSize={11} />
              <ZAxis type="number" dataKey="avgOrder" range={[60, 400]} name="Avg order" />
              <Tooltip
                formatter={(v: number, name: string) => (name === "Revenue" || name === "Avg order" ? `KES ${v.toLocaleString()}` : v)}
                cursor={{ strokeDasharray: "3 3" }}
              />
              <Scatter data={venueScatter} fill="#a01d1d" fillOpacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
