import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/requireOwner";
import { RECORD_TYPE_MAP, str } from "@/lib/qc/config";
import { currentMonth, fetchQcRecords, isValidMonth, monthLabel, monthRange, type QcReview } from "@/lib/qc/queries";
import MonthPicker from "../components/MonthPicker";
import QcRecordManager, { type Suggestions } from "../components/QcRecordManager";
import ReviewSignoff from "../components/ReviewSignoff";

export const dynamic = "force-dynamic";

export default async function QcTypePage({ params, searchParams }: { params: { type: string }; searchParams: { month?: string } }) {
  await requireOwner();
  const cfg = RECORD_TYPE_MAP[params.type];
  if (!cfg) notFound();

  const supabase = createClient();
  const month = isValidMonth(searchParams.month) ? searchParams.month : currentMonth();
  const { from, to } = monthRange(month);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [records, profileRes, reviewRes, batchesRes, materialsRes, goodsRes, historyRes] = await Promise.all([
    fetchQcRecords(supabase, { from, to, type: cfg.key }),
    supabase.from("profiles").select("full_name").eq("id", user!.id).single(),
    supabase.from("QC_REVIEWS").select("record_type, reviewed_by, reviewed_at, notes").eq("review_month", `${month}-01`).eq("record_type", cfg.key).maybeSingle(),
    supabase.from("BATCHES").select("batch_number, production_date").order("production_date", { ascending: false }).limit(150),
    supabase.from("RAW_MATERIALS_INVENTORY").select("material_name").order("material_name"),
    supabase.from("FINISHED_GOODS_INVENTORY").select("product_type").order("product_type"),
    // Past values of this log's free-text fields → autocomplete for names, areas, suppliers
    supabase.from("QC_RECORDS").select("data").eq("record_type", cfg.key).eq("is_nil", false).order("created_at", { ascending: false }).limit(300),
  ]);

  const history: Record<string, string[]> = {};
  for (const f of cfg.fields.filter((f) => f.suggest === "history")) {
    const seen = new Set<string>();
    for (const row of historyRes.data ?? []) {
      const v = str(row.data as Record<string, string>, f.key);
      if (v) seen.add(v);
    }
    history[f.key] = Array.from(seen).slice(0, 40);
  }

  const batches = batchesRes.data ?? [];
  const suggestions: Suggestions = {
    batches: batches.map((b) => b.batch_number),
    batchDates: Object.fromEntries(batches.map((b) => [b.batch_number, b.production_date])),
    materials: (materialsRes.data ?? []).map((m) => m.material_name),
    products: (goodsRes.data ?? []).map((g) => g.product_type),
    history,
  };

  const reviewerName = profileRes.data?.full_name ?? user?.email ?? "Supervisor";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={`/dashboard/qc?month=${month}`} className="text-xs text-ink-soft hover:text-maroon">
            ← Quality & HACCP
          </Link>
          <h1 className="text-2xl font-semibold text-maroon mt-1">
            {cfg.icon} {cfg.label}
          </h1>
          <p className="text-ink-soft text-sm max-w-3xl">{cfg.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MonthPicker basePath={`/dashboard/qc/${cfg.key}`} month={month} />
        </div>
      </div>

      <ReviewSignoff typeKey={cfg.key} month={month} reviewerName={reviewerName} review={(reviewRes.data as QcReview | null) ?? null} />

      <div className="text-xs text-ink-soft -mb-2">
        {monthLabel(month)} · {records.length} {records.length === 1 ? "entry" : "entries"} · logged {cfg.frequency.toLowerCase()}
      </div>

      <QcRecordManager typeKey={cfg.key} records={records} suggestions={suggestions} enteredByName={reviewerName} />
    </div>
  );
}
