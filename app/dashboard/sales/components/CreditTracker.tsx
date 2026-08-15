type CreditSale = {
  id: string;
  Date: string;
  Name: string;
  Phone: number | null;
  Total: number;
  amount_paid: number | null;
  due_date: string | null;
};

export default function CreditTracker({ sales }: { sales: CreditSale[] }) {
  const outstanding = sales
    .filter((s) => (s.Total ?? 0) - (s.amount_paid ?? 0) > 0)
    .map((s) => ({ ...s, balance: (s.Total ?? 0) - (s.amount_paid ?? 0) }))
    .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));

  if (outstanding.length === 0) return null;

  const totalOwed = outstanding.reduce((sum, s) => sum + s.balance, 0);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="bg-white rounded-card-lg shadow-soft p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-medium text-ink">💳 Credit Tracker</h2>
        <span className="text-sm font-medium text-orange-700">
          KES {totalOwed.toLocaleString()} outstanding
        </span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-cream-deep text-ink-soft text-left">
            <th className="px-3 py-2 font-medium">Customer</th>
            <th className="px-3 py-2 font-medium">Phone</th>
            <th className="px-3 py-2 font-medium text-right">Balance</th>
            <th className="px-3 py-2 font-medium">Due</th>
          </tr>
        </thead>
        <tbody>
          {outstanding.map((s) => {
            const overdue = s.due_date && s.due_date < today;
            return (
              <tr key={s.id} className="border-t border-cream-deep">
                <td className="px-3 py-2">{s.Name}</td>
                <td className="px-3 py-2 text-ink-soft">{s.Phone ?? "—"}</td>
                <td className="px-3 py-2 text-right font-medium text-orange-700">
                  KES {s.balance.toLocaleString()}
                </td>
                <td className={`px-3 py-2 ${overdue ? "text-red-bright font-medium" : "text-ink-soft"}`}>
                  {s.due_date ?? "—"} {overdue && "⚠️ Overdue"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-xs text-ink-soft mt-3">
        Once Customer Messaging is connected to a contact for these customers, overdue balances here can
        trigger a reminder SMS automatically — that wiring isn&apos;t built yet.
      </p>
    </div>
  );
}
