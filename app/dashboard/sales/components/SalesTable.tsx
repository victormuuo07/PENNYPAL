type Sale = {
  id: string;
  Date: string;
  Name: string;
  Product: string;
  Quantity: number;
  Total: number;
  Payment_Status: string;
  Customer_Type: string | null;
  amount_paid: number | null;
  SALES_PEOPLE: { full_name: string }[] | null;
};

const STATUS_STYLES: Record<string, string> = {
  Paid: "bg-green-50 text-green-700",
  Credit: "bg-orange-50 text-orange-700",
};

const CUSTOMER_TYPE_STYLES: Record<string, string> = {
  "Consumer (B2C)": "bg-blue-50 text-blue-700",
  "Shop/Mama Mboga (B2B)": "bg-purple-50 text-purple-700",
  "Hotel/Restaurant": "bg-gold/10 text-gold-dark",
};

export default function SalesTable({ sales, isOwner }: { sales: Sale[]; isOwner: boolean }) {
  if (sales.length === 0) {
    return (
      <div className="bg-white rounded-card-lg shadow-soft p-6 text-ink-soft text-sm">
        No sales recorded yet.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-card-lg shadow-soft overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-cream-deep text-ink-soft text-left">
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Product</th>
            <th className="px-4 py-3 font-medium text-right">Qty</th>
            <th className="px-4 py-3 font-medium text-right">Total</th>
            <th className="px-4 py-3 font-medium">Status</th>
            {isOwner && <th className="px-4 py-3 font-medium">Sold By</th>}
          </tr>
        </thead>
        <tbody>
          {sales.map((s) => (
            <tr key={s.id} className="border-t border-cream-deep">
              <td className="px-4 py-3 text-ink-soft">{s.Date}</td>
              <td className="px-4 py-3">{s.Name}</td>
              <td className="px-4 py-3">
                {s.Customer_Type && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      CUSTOMER_TYPE_STYLES[s.Customer_Type] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {s.Customer_Type.includes("B2C") ? "B2C" : "B2B"}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-ink-soft">{s.Product}</td>
              <td className="px-4 py-3 text-right">{s.Quantity}</td>
              <td className="px-4 py-3 text-right font-medium">
                KES {s.Total?.toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    STATUS_STYLES[s.Payment_Status] ?? "bg-gray-100 text-gray-700"
                  }`}
                >
                  {s.Payment_Status}
                  {s.Payment_Status === "Credit" &&
                    ` (KES ${((s.Total ?? 0) - (s.amount_paid ?? 0)).toLocaleString()} due)`}
                </span>
              </td>
              {isOwner && (
                <td className="px-4 py-3 text-ink-soft">{s.SALES_PEOPLE?.[0]?.full_name ?? "—"}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
