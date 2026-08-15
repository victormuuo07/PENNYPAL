type TopItem = { name: string; value: number };

export default function TopPerformers({
  topProducts,
  topRep,
  topHotelOrShop,
}: {
  topProducts: TopItem[];
  topRep: TopItem | null;
  topHotelOrShop: TopItem | null;
}) {
  const hasAnything = topProducts.length > 0 || topRep || topHotelOrShop;
  if (!hasAnything) return null;

  return (
    <div className="bg-white rounded-card-lg shadow-soft p-6">
      <h2 className="text-lg font-medium text-ink mb-4">🏆 Top Performers This Month</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <div className="text-xs text-ink-soft mb-2">Top Products</div>
          {topProducts.length === 0 ? (
            <p className="text-sm text-ink-soft">No sales yet this month</p>
          ) : (
            <ol className="space-y-1">
              {topProducts.map((p, i) => (
                <li key={p.name} className="text-sm flex justify-between">
                  <span className="text-ink">
                    {i + 1}. {p.name}
                  </span>
                  <span className="text-ink-soft ml-2">KES {p.value.toLocaleString()}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div>
          <div className="text-xs text-ink-soft mb-2">Top Sales Rep</div>
          {topRep ? (
            <div>
              <div className="font-medium text-ink">🤝 {topRep.name}</div>
              <div className="text-sm text-ink-soft">KES {topRep.value.toLocaleString()} in sales</div>
            </div>
          ) : (
            <p className="text-sm text-ink-soft">No rep sales yet this month</p>
          )}
        </div>
        <div>
          <div className="text-xs text-ink-soft mb-2">Top Hotel/Shop</div>
          {topHotelOrShop ? (
            <div>
              <div className="font-medium text-ink">🏨 {topHotelOrShop.name}</div>
              <div className="text-sm text-ink-soft">KES {topHotelOrShop.value.toLocaleString()} in revenue</div>
            </div>
          ) : (
            <p className="text-sm text-ink-soft">No distribution revenue yet this month</p>
          )}
        </div>
      </div>
    </div>
  );
}
