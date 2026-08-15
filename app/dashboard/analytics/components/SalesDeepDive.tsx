"use client";

import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type Sale = { Date: string; Total: number; Product: string };

const DAY_MS = 1000 * 60 * 60 * 24;

export default function SalesDeepDive({ sales }: { sales: Sale[] }) {
  const insights = useMemo(() => {
    if (sales.length === 0) return null;

    const sorted = [...sales].sort((a, b) => a.Date.localeCompare(b.Date));

    // Cumulative running total, one point per day that had sales
    let running = 0;
    const cumulative = sorted.reduce<{ date: string; total: number }[]>((acc, s) => {
      running += s.Total ?? 0;
      const last = acc[acc.length - 1];
      if (last && last.date === s.Date) {
        last.total = running;
      } else {
        acc.push({ date: s.Date, total: running });
      }
      return acc;
    }, []);

    // Best/worst day of week (by total revenue)
    const byDow = new Map<number, number>();
    for (const s of sales) {
      const dow = new Date(s.Date).getDay();
      byDow.set(dow, (byDow.get(dow) ?? 0) + (s.Total ?? 0));
    }
    const dowNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dowEntries = Array.from(byDow.entries()).sort((a, b) => b[1] - a[1]);
    const bestDow = dowEntries[0] ? dowNames[dowEntries[0][0]] : null;
    const worstDow = dowEntries[dowEntries.length - 1] ? dowNames[dowEntries[dowEntries.length - 1][0]] : null;

    // This week vs last week
    const now = Date.now();
    const thisWeekStart = now - 7 * DAY_MS;
    const lastWeekStart = now - 14 * DAY_MS;
    const thisWeek = sales.filter((s) => new Date(s.Date).getTime() >= thisWeekStart).reduce((s, x) => s + (x.Total ?? 0), 0);
    const lastWeek = sales
      .filter((s) => {
        const t = new Date(s.Date).getTime();
        return t >= lastWeekStart && t < thisWeekStart;
      })
      .reduce((s, x) => s + (x.Total ?? 0), 0);
    const weekChange = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : null;

    // Top product overall
    const byProduct = new Map<string, number>();
    for (const s of sales) byProduct.set(s.Product, (byProduct.get(s.Product) ?? 0) + (s.Total ?? 0));
    const topProduct = Array.from(byProduct.entries()).sort((a, b) => b[1] - a[1])[0];

    // Average order value
    const avgOrderValue = sales.reduce((s, x) => s + (x.Total ?? 0), 0) / sales.length;

    return { cumulative, bestDow, worstDow, thisWeek, lastWeek, weekChange, topProduct, avgOrderValue };
  }, [sales]);

  if (!insights) {
    return (
      <div className="bg-white rounded-card-lg shadow-soft p-6 text-ink-soft text-sm">
        No sales recorded yet — insights will appear here once you have some history.
      </div>
    );
  }

  const { cumulative, bestDow, worstDow, thisWeek, lastWeek, weekChange, topProduct, avgOrderValue } = insights;

  return (
    <div className="bg-white rounded-card-lg shadow-soft p-6">
      <h2 className="text-lg font-medium text-ink mb-4">🔍 Sales Deep-Dive</h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Insight label="This week" value={`KES ${thisWeek.toLocaleString()}`} />
        <Insight
          label="vs last week"
          value={weekChange !== null ? `${weekChange >= 0 ? "▲" : "▼"} ${Math.abs(weekChange).toFixed(1)}%` : "N/A"}
          tone={weekChange !== null ? (weekChange >= 0 ? "good" : "bad") : undefined}
        />
        <Insight label="Best day" value={bestDow ?? "—"} />
        <Insight label="Avg order value" value={`KES ${Math.round(avgOrderValue).toLocaleString()}`} />
      </div>

      <ul className="text-sm text-ink-soft space-y-1 mb-5">
        {bestDow && <li>📅 Your strongest selling day is <span className="text-ink font-medium">{bestDow}</span></li>}
        {worstDow && worstDow !== bestDow && (
          <li>📉 Your quietest day is <span className="text-ink font-medium">{worstDow}</span> — worth a push there</li>
        )}
        {topProduct && (
          <li>
            🏆 Best-selling product overall: <span className="text-ink font-medium">{topProduct[0]}</span> (KES{" "}
            {topProduct[1].toLocaleString()})
          </li>
        )}
        {weekChange !== null && weekChange < -10 && (
          <li className="text-orange-700">⚠️ Sales dropped {Math.abs(weekChange).toFixed(0)}% vs last week — worth a look</li>
        )}
        {lastWeek === 0 && <li>ℹ️ Not enough history yet for a full week-over-week comparison</li>}
      </ul>

      <div className="text-xs font-medium text-ink-soft mb-2">Cumulative sales (all time)</div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={cumulative}>
          <CartesianGrid strokeDasharray="3 3" stroke="#fbead2" />
          <XAxis dataKey="date" stroke="#5c4436" fontSize={10} tick={false} />
          <YAxis stroke="#5c4436" fontSize={11} />
          <Tooltip formatter={(v: number) => `KES ${v.toLocaleString()}`} labelFormatter={(l) => l} />
          <Area type="monotone" dataKey="total" stroke="#a01d1d" fill="#a01d1d" fillOpacity={0.15} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function Insight({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  const color = tone === "good" ? "text-green-700" : tone === "bad" ? "text-red-bright" : "text-ink";
  return (
    <div className="bg-cream-deep/50 rounded-card p-3">
      <div className="text-xs text-ink-soft">{label}</div>
      <div className={`text-sm font-semibold mt-0.5 ${color}`}>{value}</div>
    </div>
  );
}
