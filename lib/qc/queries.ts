import type { SupabaseClient } from "@supabase/supabase-js";
import { DUE_SOON_DAYS, RECORD_TYPES, RECORD_TYPE_MAP, str, type CcpId, type Data } from "./config";

export type QcRecord = {
  id: string;
  record_type: string;
  record_date: string;
  batch_number: string | null;
  data: Data;
  is_nil: boolean;
  is_flagged: boolean;
  flag_reason: string | null;
  is_open: boolean;
  entered_by_name: string | null;
  created_at: string;
};

export type QcReview = {
  record_type: string;
  reviewed_by: string;
  reviewed_at: string;
  notes: string | null;
};

// ------------------------------------------------------------------ months

/** Today's date in Kenya (EAT) as YYYY-MM-DD — avoids the UTC off-by-a-day between midnight and 3am. */
export function todayNairobi(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
}

export function currentMonth(): string {
  return todayNairobi().slice(0, 7);
}

export function isValidMonth(m: string | undefined | null): m is string {
  return !!m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m);
}

/** [from, to) date range for a "YYYY-MM" month. */
export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number);
  return { from: `${month}-01`, to: new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10) };
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

// ------------------------------------------------------------------- fetch

const COLUMNS = "id, record_type, record_date, batch_number, data, is_nil, is_flagged, flag_reason, is_open, entered_by_name, created_at";

/** Pages through PostgREST's 1000-row cap so a busy month is never silently truncated. */
export async function fetchQcRecords(
  supabase: SupabaseClient,
  opts: { from: string; to: string; type?: string }
): Promise<QcRecord[]> {
  const pageSize = 1000;
  let all: QcRecord[] = [];
  let offset = 0;

  while (true) {
    let q = supabase
      .from("QC_RECORDS")
      .select(COLUMNS)
      .gte("record_date", opts.from)
      .lt("record_date", opts.to)
      .order("record_date", { ascending: true })
      .order("created_at", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (opts.type) q = q.eq("record_type", opts.type);

    const { data, error } = await q;
    if (error || !data) break;
    all = all.concat(data as QcRecord[]);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

// ------------------------------------------------------------ due / overdue

export type DueItem = {
  recordType: string;
  label: string; // e.g. "Digital platform scale — calibration / maintenance"
  dueDate: string;
  daysUntil: number; // negative = overdue
};

/** Latest record per equipment / supplier / area / water source, compared with its next-due date. */
export async function fetchDueItems(supabase: SupabaseClient, today: string): Promise<DueItem[]> {
  const dueTypes = RECORD_TYPES.filter((t) => t.due);
  if (dueTypes.length === 0) return [];

  const { data } = await supabase
    .from("QC_RECORDS")
    .select("record_type, record_date, data, is_nil")
    .in("record_type", dueTypes.map((t) => t.key))
    .eq("is_nil", false)
    .order("record_date", { ascending: false })
    .limit(2000);

  const seen = new Set<string>();
  const items: DueItem[] = [];
  const todayMs = new Date(`${today}T00:00:00Z`).getTime();

  for (const row of (data ?? []) as Pick<QcRecord, "record_type" | "record_date" | "data">[]) {
    const cfg = RECORD_TYPE_MAP[row.record_type];
    if (!cfg?.due) continue;
    const group = str(row.data, cfg.due.groupKey).toLowerCase();
    if (!group) continue;
    const id = `${row.record_type}:${group}`;
    if (seen.has(id)) continue; // rows are newest-first, so the first one seen is the latest
    seen.add(id);

    const due = str(row.data, cfg.due.key);
    if (!due) continue;
    const daysUntil = Math.round((new Date(`${due}T00:00:00Z`).getTime() - todayMs) / 86400000);
    if (daysUntil <= DUE_SOON_DAYS) {
      items.push({
        recordType: row.record_type,
        label: `${str(row.data, cfg.due.groupKey)} — ${cfg.due.noun}`,
        dueDate: due,
        daysUntil,
      });
    }
  }
  return items.sort((a, b) => a.daysUntil - b.daysUntil);
}

// -------------------------------------------------------------- CCP summary

export type CcpSummary = { id: CcpId; checks: number; breaches: number };

export function ccpSummary(records: QcRecord[]): CcpSummary[] {
  const out: Record<CcpId, CcpSummary> = {
    "CCP-1": { id: "CCP-1", checks: 0, breaches: 0 },
    "CCP-2": { id: "CCP-2", checks: 0, breaches: 0 },
  };
  for (const r of records) {
    if (r.is_nil) continue;
    const tag = RECORD_TYPE_MAP[r.record_type]?.ccpTag?.(r.data);
    if (!tag) continue;
    out[tag].checks += 1;
    // For CCP-2 every final QC record is a check, but only a metal/foreign body detection is a CCP breach
    const isBreach = tag === "CCP-2" ? str(r.data, "foreign_body") === "Detected" : r.is_flagged;
    if (isBreach) out[tag].breaches += 1;
  }
  return [out["CCP-1"], out["CCP-2"]];
}
