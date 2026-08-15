import type { HotelPerformance } from "@/lib/territoryAnalysis";

export default function SilentHotelsAlert({ performance }: { performance: HotelPerformance[] }) {
  const silent = performance
    .filter((h) => h.performance_tier === "Dormant" || h.performance_tier === "At Risk")
    .sort((a, b) => (b.days_since_last_restock ?? 0) - (a.days_since_last_restock ?? 0));

  if (silent.length === 0) return null;

  return (
    <div className="bg-red-50 border border-red-100 rounded-card-lg p-6">
      <h2 className="font-medium text-red-bright mb-3">🔕 Gone Quiet — Needs a Visit</h2>
      <div className="space-y-2">
        {silent.map((h) => (
          <div key={h.id} className="flex items-center justify-between bg-white rounded-card px-4 py-2 text-sm">
            <div>
              <span className="font-medium">{h.hotel_name}</span>
              <span className="text-ink-soft ml-2">{h.location}</span>
            </div>
            <div className="text-right">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  h.performance_tier === "Dormant" ? "bg-red-100 text-red-bright" : "bg-orange-50 text-orange-700"
                }`}
              >
                {h.performance_tier}
              </span>
              <span className="text-ink-soft ml-2">
                {h.days_since_last_restock !== null
                  ? `${Math.round(h.days_since_last_restock)} days since last refill`
                  : "never refilled"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
