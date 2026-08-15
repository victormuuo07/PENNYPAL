"use client";

type Props = {
  profitMargin: number; // %
  salesGrowth: number; // % (last 7 days vs previous 7 days)
  runwayMonths: number;
  cashBalance: number;
};

function scoreOf(profitMargin: number, salesGrowth: number, runwayMonths: number, cashBalance: number) {
  let score = 0;
  if (profitMargin > 20) score += 30;
  else if (profitMargin > 10) score += 20;
  else if (profitMargin > 0) score += 10;

  if (salesGrowth > 20) score += 30;
  else if (salesGrowth > 10) score += 20;
  else if (salesGrowth > 0) score += 10;

  if (runwayMonths > 12) score += 25;
  else if (runwayMonths > 6) score += 15;
  else if (runwayMonths > 3) score += 10;

  if (cashBalance > 100000) score += 15;
  else if (cashBalance > 50000) score += 10;
  else if (cashBalance > 10000) score += 5;

  return score;
}

function statusOf(score: number) {
  if (score >= 70)
    return { label: "🔥 HOT — Business is on fire!", color: "#10b981", advice: "Excellent! Keep doing what you're doing. Consider expanding." };
  if (score >= 50)
    return { label: "🌡️ WARM — Good, but room for improvement", color: "#f2b705", advice: "You're on the right track. Focus on increasing sales and managing costs." };
  if (score >= 30)
    return { label: "❄️ COOL — Needs attention", color: "#f97316", advice: "Review your expenses and look for ways to increase revenue." };
  return { label: "🧊 COLD — Critical attention needed", color: "#ef4444", advice: "Urgent action required. Focus on cash flow and cost reduction." };
}

export default function BusinessHealthGauge({ profitMargin, salesGrowth, runwayMonths, cashBalance }: Props) {
  const score = scoreOf(profitMargin, salesGrowth, runwayMonths, cashBalance);
  const status = statusOf(score);

  // Semi-circle gauge drawn by hand with SVG arcs — no chart library needed
  // for a single gauge, and it keeps full control over the color bands.
  const radius = 80;
  const circumference = Math.PI * radius; // half circle
  const filled = (score / 100) * circumference;

  return (
    <div className="bg-white rounded-card-lg shadow-soft p-6">
      <h2 className="text-lg font-medium text-ink mb-4">🌡️ Business Health Score</h2>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative">
          <svg width="200" height="110" viewBox="0 0 200 110">
            <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#fbead2" strokeWidth="16" strokeLinecap="round" />
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke={status.color}
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={`${filled} ${circumference}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
            <div className="text-3xl font-bold text-ink">{score}</div>
            <div className="text-xs text-ink-soft">/ 100</div>
          </div>
        </div>
        <div className="text-center sm:text-left">
          <div className="text-lg font-semibold text-ink">{status.label}</div>
          <p className="text-sm text-ink-soft mt-1">{status.advice}</p>
          <div className="text-xs text-ink-soft mt-3 space-y-0.5">
            <div>Profit margin: {profitMargin.toFixed(1)}%</div>
            <div>Sales growth (7d): {salesGrowth.toFixed(1)}%</div>
            <div>Cash runway: {runwayMonths > 0 ? `${runwayMonths.toFixed(1)} months` : "N/A"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
