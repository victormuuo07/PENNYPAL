type Expense = {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  payment_method: string;
  status: string;
};

export default function ExpensesTable({ expenses }: { expenses: Expense[] }) {
  if (expenses.length === 0) {
    return (
      <div className="bg-white rounded-card-lg shadow-soft p-6 text-ink-soft text-sm">
        No expenses recorded yet.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-card-lg shadow-soft overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-cream-deep text-ink-soft text-left">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Method</th>
              <th className="px-4 py-3 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className="border-t border-cream-deep">
                <td className="px-4 py-3 text-ink-soft">{e.date}</td>
                <td className="px-4 py-3">{e.category}</td>
                <td className="px-4 py-3 text-ink-soft">{e.description}</td>
                <td className="px-4 py-3 text-ink-soft">{e.payment_method}</td>
                <td className="px-4 py-3 text-right font-medium text-red-bright">
                  KES {e.amount?.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
