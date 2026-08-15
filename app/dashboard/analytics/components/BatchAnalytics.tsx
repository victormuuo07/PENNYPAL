"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { groupByPeriod, lastN } from "@/lib/analytics";

type Batch = { production_date: string; total_kg_produced: number };
type Output = { batch_id: string; product_type: string; quantity_produced: number };

export default function BatchAnalytics({ batches, outputs }: { batches: Batch[]; outputs: Output[] }) {
  const batchTrend = useMemo(() => {
    const grouped = groupByPeriod(batches, (b) => b.production_date, "month", {
      batches: (acc) => acc + 1,
      kg: (acc, b) => acc + (b.total_kg_produced ?? 0),
    });
    return lastN(grouped, 12);
  }, [batches]);

  const productMix = useMemo(() => {
    const totals = new Map<string, number>();
    for (const o of outputs) totals.set(o.product_type, (totals.get(o.product_type) ?? 0) + o.quantity_produced);
    return Array.from(totals.entries()).map(([name, qty]) => ({ name, qty }));
  }, [outputs]);

  const avgDaysBetweenBatches = useMemo(() => {
    if (batches.length < 2) return null;
    const dates = batches.map((b) => new Date(b.production_date).getTime()).sort((a, b) => a - b);
    const span = (dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24);
    return span / (dates.length - 1);
  }, [batches]);

  if (batches.length === 0) {
    return (
      <div className="bg-white rounded-card-lg shadow-soft p-6 text-ink-soft text-sm">
        No production batches recorded yet.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-card-lg shadow-soft p-6">
      <h2 className="text-lg font-medium text-ink mb-1">🏭 Production Frequency</h2>
      {avgDaysBetweenBatches !== null && (
        <p className="text-sm text-ink-soft mb-4">
          Averaging a new batch every <span className="font-medium text-ink">{Math.round(avgDaysBetweenBatches)} days</span>
        </p>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="text-xs font-medium text-ink-soft mb-2">Batches & kg produced per month</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={batchTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#fbead2" />
              <XAxis dataKey="label" stroke="#5c4436" fontSize={11} />
              <YAxis yAxisId="left" stroke="#5c4436" fontSize={11} allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" stroke="#5c4436" fontSize={11} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="batches" fill="#f2b705" name="Batches" />
              <Bar yAxisId="right" dataKey="kg" fill="#a01d1d" name="Kg produced" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div>
          <div className="text-xs font-medium text-ink-soft mb-2">Total units produced by type</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={productMix} layout="vertical" margin={{ left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#fbead2" />
              <XAxis type="number" stroke="#5c4436" fontSize={10} />
              <YAxis type="category" dataKey="name" stroke="#5c4436" fontSize={10} width={110} />
              <Tooltip />
              <Bar dataKey="qty" fill="#5c0f10" name="Units" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
