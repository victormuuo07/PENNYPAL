const TONE_STYLES: Record<string, string> = {
  positive: "text-green-700 bg-green-50",
  negative: "text-red-bright bg-red-50",
  balance: "text-maroon bg-gold/10",
};

export default function SummaryCard({
  label,
  value,
  tone,
  previousValue,
  invertTrend = false,
  format = "currency",
}: {
  label: string;
  value: number;
  tone: "positive" | "negative" | "balance";
  /** Last month's value for the same metric — pass to show a trend arrow. Omit to skip it. */
  previousValue?: number;
  /** For Expenses, "up" is bad, not good — flips the green/red so the color means what it should. */
  invertTrend?: boolean;
  /** "percent" for things like profit margin — value is already the percentage, e.g. 23.5 */
  format?: "currency" | "percent";
}) {
  const formatted =
    format === "percent"
      ? `${value.toFixed(1)}%`
      : new Intl.NumberFormat("en-KE", {
          style: "currency",
          currency: "KES",
          maximumFractionDigits: 0,
        }).format(value);

  const hasTrend = previousValue !== undefined && previousValue !== 0;
  const pctChange = hasTrend ? ((value - previousValue!) / Math.abs(previousValue!)) * 100 : 0;
  const isUp = pctChange >= 0;
  const isGood = invertTrend ? !isUp : isUp;

  return (
    <div className={`rounded-card-lg shadow-soft p-5 ${TONE_STYLES[tone]}`}>
      <div className="text-xs uppercase tracking-wide font-medium opacity-70">{label}</div>
      <div className="text-2xl font-semibold mt-1">{formatted}</div>
      {hasTrend && (
        <div className={`text-xs font-medium mt-1 ${isGood ? "text-green-700" : "text-red-bright"}`}>
          {isUp ? "▲" : "▼"} {Math.abs(pctChange).toFixed(1)}% vs last month
        </div>
      )}
    </div>
  );
}
