type MonthRow = { month: string; sales: number; expenses: number };

function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-KE", { month: "long", year: "numeric" });
}

export default function TradeHistorySinceLaunch({ monthly }: { monthly: MonthRow[] }) {
  if (monthly.length === 0) return null;

  const sorted = [...monthly].sort((a, b) => a.month.localeCompare(b.month));
  const firstMonth = monthLabel(sorted[0].month);
  const totalSales = sorted.reduce((s, m) => s + m.sales, 0);
  const totalExpenses = sorted.reduce((s, m) => s + m.expenses, 0);

  let cumulative = 0;
  const rows = sorted.map((m) => {
    const net = m.sales - m.expenses;
    cumulative += net;
    return { ...m, net, cumulative };
  });

  return (
    <div className="bg-white rounded-card-lg shadow-soft p-6">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h2 className="text-lg font-medium text-ink">📅 Trade History Since {firstMonth}</h2>
        <span className="text-sm text-ink-soft">
          Total sales: <span className="font-medium text-ink">KES {totalSales.toLocaleString()}</span>
        </span>
      </div>
      <p className="text-xs text-ink-soft mb-4">
        Every month since your first recorded sale — not just the last 6. For deeper breakdowns (weekly, daily,
        custom date ranges), use the Analytics page.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-cream-deep text-ink-soft text-left">
              <th className="px-3 py-2 font-medium">Month</th>
              <th className="px-3 py-2 font-medium text-right">Sales</th>
              <th className="px-3 py-2 font-medium text-right">Expenses</th>
              <th className="px-3 py-2 font-medium text-right">Net</th>
              <th className="px-3 py-2 font-medium text-right">Cumulative</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.month} className="border-t border-cream-deep">
                <td className="px-3 py-2 font-medium">{monthLabel(r.month)}</td>
                <td className="px-3 py-2 text-right text-green-700">KES {r.sales.toLocaleString()}</td>
                <td className="px-3 py-2 text-right text-red-bright">KES {r.expenses.toLocaleString()}</td>
                <td className={`px-3 py-2 text-right font-medium ${r.net >= 0 ? "text-ink" : "text-red-bright"}`}>
                  KES {r.net.toLocaleString()}
                </td>
                <td className={`px-3 py-2 text-right font-medium ${r.cumulative >= 0 ? "text-maroon" : "text-red-bright"}`}>
                  KES {r.cumulative.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-cream-deep font-medium">
              <td className="px-3 py-2">Total</td>
              <td className="px-3 py-2 text-right text-green-700">KES {totalSales.toLocaleString()}</td>
              <td className="px-3 py-2 text-right text-red-bright">KES {totalExpenses.toLocaleString()}</td>
              <td className="px-3 py-2 text-right">KES {(totalSales - totalExpenses).toLocaleString()}</td>
              <td className="px-3 py-2 text-right">—</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
