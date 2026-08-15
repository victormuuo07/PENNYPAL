export default function CommissionSummary({ totalOwed, totalPaid }: { totalOwed: number; totalPaid: number }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-white rounded-card-lg shadow-soft p-5 bg-orange-50">
        <div className="text-xs uppercase tracking-wide font-medium text-orange-700 opacity-70">Pending</div>
        <div className="text-2xl font-semibold mt-1 text-orange-700">KES {totalOwed.toLocaleString()}</div>
      </div>
      <div className="bg-white rounded-card-lg shadow-soft p-5 bg-green-50">
        <div className="text-xs uppercase tracking-wide font-medium text-green-700 opacity-70">Paid</div>
        <div className="text-2xl font-semibold mt-1 text-green-700">KES {totalPaid.toLocaleString()}</div>
      </div>
    </div>
  );
}
