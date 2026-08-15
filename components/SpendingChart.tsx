"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type Point = { month: string; sales: number; expenses: number };
type ChartRow = Point & { salesForecast?: number; expensesForecast?: number };

/**
 * Simplest honest forecast: average of the last 3 real months, projected
 * one month forward. Not machine learning — just a trailing average — but
 * it's a real estimate rather than nothing, and it's clearly labeled as
 * one. Worth swapping for something smarter once there's a couple years
 * of data to actually find seasonality in.
 */
export default function SpendingChart({ data }: { data: Point[] }) {
  if (data.length === 0) {
    return <p className="text-ink-soft text-sm">No data yet — add some sales or expenses.</p>;
  }

  const last3 = data.slice(-3);
  const avgSales = last3.reduce((s, d) => s + d.sales, 0) / last3.length;
  const avgExpenses = last3.reduce((s, d) => s + d.expenses, 0) / last3.length;

  const lastReal = data[data.length - 1];
  const chartData: ChartRow[] = [
    ...data.map((d) => ({ ...d, salesForecast: undefined, expensesForecast: undefined })),
    // Bridge point: same month as the last real data, but also carries the
    // forecast value, so the dashed line starts exactly where the solid
    // line ends instead of leaving a visual gap.
    { ...lastReal, salesForecast: lastReal.sales, expensesForecast: lastReal.expenses },
    {
      month: "Next (est.)",
      sales: undefined as unknown as number,
      expenses: undefined as unknown as number,
      salesForecast: avgSales,
      expensesForecast: avgExpenses,
    },
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#fbead2" />
        <XAxis dataKey="month" stroke="#5c4436" fontSize={12} />
        <YAxis stroke="#5c4436" fontSize={12} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="sales" stroke="#a01d1d" strokeWidth={2} name="Sales" connectNulls={false} />
        <Line type="monotone" dataKey="expenses" stroke="#b9860a" strokeWidth={2} name="Expenses" connectNulls={false} />
        <Line
          type="monotone"
          dataKey="salesForecast"
          stroke="#a01d1d"
          strokeWidth={2}
          strokeDasharray="5 5"
          name="Sales (est.)"
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="expensesForecast"
          stroke="#b9860a"
          strokeWidth={2}
          strokeDasharray="5 5"
          name="Expenses (est.)"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
