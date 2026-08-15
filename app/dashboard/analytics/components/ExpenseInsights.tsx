"use client";

import { useMemo } from "react";

type Expense = { amount: number; category: string | null; date: string };

const SALARY_KEYWORDS = ["salar", "wage", "pay"];

export default function ExpenseInsights({ expenses }: { expenses: Expense[] }) {
  const insights = useMemo(() => {
    if (expenses.length === 0) return null;

    const total = expenses.reduce((s, e) => s + (e.amount ?? 0), 0);

    const salaryTotal = expenses
      .filter((e) => SALARY_KEYWORDS.some((k) => (e.category ?? "").toLowerCase().includes(k)))
      .reduce((s, e) => s + (e.amount ?? 0), 0);
    const salaryPct = total > 0 ? (salaryTotal / total) * 100 : 0;

    const byCategory = new Map<string, number>();
    for (const e of expenses) {
      const cat = e.category || "Uncategorized";
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + (e.amount ?? 0));
    }
    const sorted = Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]);
    const top = sorted[0];
    const topPct = top && total > 0 ? (top[1] / total) * 100 : 0;

    // This month vs last month, same idea used on the Dashboard
    const now = new Date();
    const thisMonthKey = now.toISOString().slice(0, 7);
    const lastMonthKey = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
    const thisMonth = expenses.filter((e) => e.date.startsWith(thisMonthKey)).reduce((s, e) => s + e.amount, 0);
    const lastMonth = expenses.filter((e) => e.date.startsWith(lastMonthKey)).reduce((s, e) => s + e.amount, 0);
    const monthChange = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : null;

    const recommendations: string[] = [];
    if (topPct > 40) recommendations.push(`${top![0]} alone is ${topPct.toFixed(0)}% of all spend — worth checking if that's negotiable or reducible.`);
    if (salaryPct > 50) recommendations.push(`Salaries are ${salaryPct.toFixed(0)}% of expenses — normal for a small team, but watch this ratio as you scale.`);
    if (monthChange !== null && monthChange > 25) recommendations.push(`Expenses jumped ${monthChange.toFixed(0)}% vs last month — worth reviewing what changed.`);
    if (sorted.length > 15) recommendations.push(`You're tracking ${sorted.length} different expense categories — consider consolidating similar ones for cleaner reporting.`);
    if (recommendations.length === 0) recommendations.push("Spending looks reasonably balanced — no single category is dominating.");

    return { total, salaryPct, top, topPct, monthChange, recommendations };
  }, [expenses]);

  if (!insights) return null;

  return (
    <div className="bg-white rounded-card-lg shadow-soft p-6">
      <h2 className="text-lg font-medium text-ink mb-4">💡 Expense Insights</h2>
      <ul className="text-sm text-ink-soft space-y-2">
        {insights.recommendations.map((r, i) => (
          <li key={i} className="flex gap-2">
            <span>💬</span>
            <span>{r}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
