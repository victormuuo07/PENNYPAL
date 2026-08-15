type Sale = { Total: number; Customer_Type: string | null };

export default function CustomerMixSummary({ sales }: { sales: Sale[] }) {
  const b2c = sales.filter((s) => s.Customer_Type?.includes("B2C")).reduce((s, x) => s + (x.Total ?? 0), 0);
  const b2b = sales.filter((s) => s.Customer_Type && !s.Customer_Type.includes("B2C")).reduce((s, x) => s + (x.Total ?? 0), 0);
  const total = b2c + b2b;
  const b2cPct = total > 0 ? Math.round((b2c / total) * 100) : 0;
  const b2bPct = total > 0 ? 100 - b2cPct : 0;

  if (total === 0) return null;

  return (
    <div className="bg-white rounded-card-lg shadow-soft p-6">
      <h2 className="font-medium text-ink mb-3">B2C vs B2B Revenue</h2>
      <div className="flex h-6 rounded-full overflow-hidden mb-3">
        <div className="bg-blue-500" style={{ width: `${b2cPct}%` }} />
        <div className="bg-purple-500" style={{ width: `${b2bPct}%` }} />
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-ink-soft">Consumer (B2C)</span>
          </div>
          <div className="font-semibold text-ink mt-1">
            KES {b2c.toLocaleString()} <span className="text-ink-soft font-normal">({b2cPct}%)</span>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span className="text-ink-soft">Hotels + Shops (B2B)</span>
          </div>
          <div className="font-semibold text-ink mt-1">
            KES {b2b.toLocaleString()} <span className="text-ink-soft font-normal">({b2bPct}%)</span>
          </div>
        </div>
      </div>
      <p className="text-xs text-ink-soft mt-3">
        {b2b > b2c
          ? "B2B (hotels & shops) is generating more revenue than direct consumer sales."
          : "Direct consumer (B2C) sales are outpacing B2B — worth checking if your sales reps' hotel/shop pipeline needs more attention."}
      </p>
    </div>
  );
}
