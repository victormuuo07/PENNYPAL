export type Period = "day" | "half-month" | "week" | "month" | "quarter" | "year";

function isoWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function bucketKey(dateStr: string, period: Period): string {
  const d = new Date(dateStr);
  if (period === "day") return dateStr.slice(0, 10);
  if (period === "week") return isoWeekKey(d);
  if (period === "half-month") {
    const half = d.getDate() <= 15 ? "A" : "B"; // A = 1st-15th, B = 16th-end
    return `${dateStr.slice(0, 7)}-${half}`;
  }
  if (period === "month") return dateStr.slice(0, 7);
  if (period === "year") return String(d.getFullYear());
  // quarter
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `${d.getFullYear()}-Q${q}`;
}

export function bucketLabel(key: string, period: Period): string {
  if (period === "day") {
    const d = new Date(key);
    return d.toLocaleDateString("en-KE", { month: "short", day: "numeric" });
  }
  if (period === "week") return key; // e.g. 2026-W32
  if (period === "half-month") {
    const [y, m, half] = key.split("-");
    const monthLabel = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-KE", { month: "short" });
    return `${monthLabel} ${half === "A" ? "1-15" : "16-end"}`;
  }
  if (period === "month") {
    const [y, m] = key.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-KE", { month: "short", year: "2-digit" });
  }
  if (period === "year") return key;
  return key; // quarter already readable, e.g. 2026-Q3
}

/** Groups rows by period, applying `reducers` to accumulate arbitrary fields. */
export function groupByPeriod<T, K extends string>(
  rows: T[],
  getDate: (row: T) => string,
  period: Period,
  reducers: Record<K, (acc: number, row: T) => number>
): Array<{ key: string; label: string } & Record<K, number>> {
  const fieldNames = Object.keys(reducers) as K[];
  const buckets = new Map<string, Record<K, number>>();

  for (const row of rows) {
    const date = getDate(row);
    if (!date) continue;
    const bucket = bucketKey(date, period);
    const existing =
      buckets.get(bucket) ?? (Object.fromEntries(fieldNames.map((k) => [k, 0])) as Record<K, number>);
    for (const field of fieldNames) {
      existing[field] = reducers[field](existing[field], row);
    }
    buckets.set(bucket, existing);
  }

  return Array.from(buckets.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([bucket, values]) => ({ key: bucket, label: bucketLabel(bucket, period), ...values }));
}

/** Filters rows to a date range (inclusive). Pass "" for either bound to leave it open. */
export function filterByDateRange<T>(rows: T[], getDate: (row: T) => string, from: string, to: string): T[] {
  return rows.filter((row) => {
    const date = getDate(row);
    if (!date) return false;
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  });
}

/** Limits to the most recent N buckets — call after groupByPeriod. */
export function lastN<T>(rows: T[], n: number): T[] {
  return rows.slice(-n);
}

/**
 * Simple trailing moving average over `window` points (including the
 * current one). Standard way to smooth out a noisy trend line so the
 * underlying direction is easier to see than the raw up-and-down.
 */
export function movingAverage<T>(data: T[], getValue: (row: T) => number, window: number): number[] {
  return data.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = data.slice(start, i + 1);
    const sum = slice.reduce((s, d) => s + getValue(d), 0);
    return sum / slice.length;
  });
}
