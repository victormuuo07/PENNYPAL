type FinishedGood = {
  id: string;
  product_type: string;
  current_stock: number;
  unit_price: number;
  reorder_level: number;
  total_produced: number;
  total_sold: number;
};

export default function FinishedGoodsPanel({ goods }: { goods: FinishedGood[] }) {
  return (
    <div className="bg-white rounded-card-lg shadow-soft p-6">
      <h2 className="font-medium text-ink mb-3">📦 Finished Goods</h2>
      {goods.length === 0 ? (
        <p className="text-ink-soft text-sm">
          No finished goods yet — they appear here once you save a production batch above.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-cream-deep text-ink-soft text-left">
              <th className="px-3 py-2 font-medium">Product</th>
              <th className="px-3 py-2 font-medium text-right">In Stock</th>
              <th className="px-3 py-2 font-medium text-right">Unit Price</th>
              <th className="px-3 py-2 font-medium text-right">Total Produced</th>
              <th className="px-3 py-2 font-medium text-right">Total Sold</th>
            </tr>
          </thead>
          <tbody>
            {goods.map((g) => {
              const low = g.current_stock <= g.reorder_level;
              return (
                <tr key={g.id} className="border-t border-cream-deep">
                  <td className="px-3 py-2">{g.product_type}</td>
                  <td className={`px-3 py-2 text-right font-medium ${low ? "text-red-bright" : ""}`}>
                    {g.current_stock} {low && "⚠️"}
                  </td>
                  <td className="px-3 py-2 text-right text-ink-soft">KES {g.unit_price}</td>
                  <td className="px-3 py-2 text-right text-ink-soft">{g.total_produced}</td>
                  <td className="px-3 py-2 text-right text-ink-soft">{g.total_sold}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
