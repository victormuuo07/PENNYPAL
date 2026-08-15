import { computeHotelPerformance, type Hotel, type HotelRefill } from "@/lib/territoryAnalysis";

type Material = { material_name: string; current_stock_kg: number; reorder_level: number };
type FinishedGood = { product_type: string; current_stock: number; reorder_level: number };
type Sale = { Total: number; Customer_Type: string | null; Payment_Status: string; amount_paid: number | null };

export default function BusinessHealthPanel({
  sales,
  materials,
  finishedGoods,
  hotels,
  refills,
}: {
  sales: Sale[];
  materials: Material[];
  finishedGoods: FinishedGood[];
  hotels: Hotel[];
  refills: HotelRefill[];
}) {
  const lowMaterials = materials.filter((m) => m.current_stock_kg <= m.reorder_level);
  const lowGoods = finishedGoods.filter((g) => g.current_stock <= g.reorder_level);

  const creditOutstanding = sales
    .filter((s) => s.Payment_Status === "Credit")
    .reduce((sum, s) => sum + ((s.Total ?? 0) - (s.amount_paid ?? 0)), 0);

  const performance = computeHotelPerformance(hotels, refills);
  const silentHotels = performance.filter((h) => h.performance_tier === "Dormant" || h.performance_tier === "At Risk");

  const b2c = sales.filter((s) => s.Customer_Type?.includes("B2C")).reduce((s, x) => s + (x.Total ?? 0), 0);
  const b2b = sales.filter((s) => s.Customer_Type && !s.Customer_Type.includes("B2C")).reduce((s, x) => s + (x.Total ?? 0), 0);

  const bottlenecks: { icon: string; text: string; severity: "high" | "medium" }[] = [];
  if (lowMaterials.length > 0)
    bottlenecks.push({
      icon: "🧂",
      text: `${lowMaterials.length} raw material${lowMaterials.length > 1 ? "s" : ""} at/below reorder level (${lowMaterials.map((m) => m.material_name).join(", ")})`,
      severity: "high",
    });
  if (lowGoods.length > 0)
    bottlenecks.push({
      icon: "📦",
      text: `${lowGoods.length} finished good${lowGoods.length > 1 ? "s" : ""} running low — risk of stockout before next batch`,
      severity: "high",
    });
  if (creditOutstanding > 0)
    bottlenecks.push({
      icon: "💳",
      text: `KES ${creditOutstanding.toLocaleString()} tied up in unpaid credit sales`,
      severity: creditOutstanding > 20000 ? "high" : "medium",
    });
  if (silentHotels.length > 0)
    bottlenecks.push({
      icon: "🔕",
      text: `${silentHotels.length} hotel${silentHotels.length > 1 ? "s" : ""} gone quiet or at risk (see Distribution page for names)`,
      severity: "medium",
    });

  return (
    <div className="bg-white rounded-card-lg shadow-soft p-6 space-y-4">
      <h2 className="text-lg font-medium text-ink">🩺 Business Health</h2>

      {bottlenecks.length === 0 ? (
        <p className="text-green-700 text-sm">✅ No obvious bottlenecks right now — stock, credit, and hotel activity all look healthy.</p>
      ) : (
        <div className="space-y-2">
          {bottlenecks.map((b, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 px-3 py-2 rounded-card text-sm ${
                b.severity === "high" ? "bg-red-50 text-red-bright" : "bg-orange-50 text-orange-700"
              }`}
            >
              <span>{b.icon}</span>
              <span>{b.text}</span>
            </div>
          ))}
        </div>
      )}

      {(b2c > 0 || b2b > 0) && (
        <div className="pt-3 border-t border-cream-deep grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-ink-soft text-xs">B2C revenue</div>
            <div className="font-semibold text-ink">KES {b2c.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-ink-soft text-xs">B2B revenue (hotels + shops)</div>
            <div className="font-semibold text-ink">KES {b2b.toLocaleString()}</div>
          </div>
        </div>
      )}
    </div>
  );
}
