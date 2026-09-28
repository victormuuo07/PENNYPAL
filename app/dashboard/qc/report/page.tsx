import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/requireOwner";
import { GROUPS, RECORD_TYPES, fmtDate } from "@/lib/qc/config";
import { ccpSummary, currentMonth, fetchQcRecords, isValidMonth, monthLabel, monthRange, todayNairobi, type QcRecord, type QcReview } from "@/lib/qc/queries";
import MonthPicker from "../components/MonthPicker";
import PrintButton from "../components/PrintButton";
import QcTable from "../components/QcTable";

export const dynamic = "force-dynamic";

export default async function QcReportPage({ searchParams }: { searchParams: { month?: string } }) {
  await requireOwner();
  const supabase = createClient();

  const month = isValidMonth(searchParams.month) ? searchParams.month : currentMonth();
  const { from, to } = monthRange(month);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [records, reviewsRes, profileRes, openRes] = await Promise.all([
    fetchQcRecords(supabase, { from, to }),
    supabase.from("QC_REVIEWS").select("record_type, reviewed_by, reviewed_at, notes").eq("review_month", `${month}-01`),
    supabase.from("profiles").select("full_name").eq("id", user!.id).single(),
    // Items still open at print time, even if raised in an earlier month — an auditor will ask
    supabase.from("QC_RECORDS").select("id, record_type, record_date, data").eq("is_open", true).lt("record_date", from).order("record_date"),
  ]);

  const byType = new Map<string, QcRecord[]>();
  for (const r of records) {
    const list = byType.get(r.record_type) ?? [];
    list.push(r);
    byType.set(r.record_type, list);
  }
  const reviews = new Map<string, QcReview>((reviewsRes.data ?? []).map((r) => [r.record_type, r as QcReview]));
  const preparedBy = profileRes.data?.full_name ?? user?.email ?? "";
  const docNo = `SPU-HACCP-${month}`;

  const real = records.filter((r) => !r.is_nil);
  const flagged = records.filter((r) => r.is_flagged);
  const openNow = records.filter((r) => r.is_open);
  const carriedOpen = openRes.data ?? [];
  const ccps = ccpSummary(records);
  const gaps = RECORD_TYPES.filter((t) => !byType.get(t.key)?.length);
  const reviewed = RECORD_TYPES.filter((t) => reviews.has(t.key)).length;

  const th = "border border-gray-400 bg-gray-100 px-2 py-1 text-left text-[10px] font-semibold";
  const td = "border border-gray-400 px-2 py-1 text-[10px]";

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Landscape A4, tight margins — 10–12 column logs fit on one page width */}
      <style>{`@media print{@page{size:A4 landscape;margin:10mm}body{background:#fff!important}}`}</style>

      <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div>
          <Link href={`/dashboard/qc?month=${month}`} className="text-xs text-ink-soft hover:text-maroon">
            ← Quality & HACCP
          </Link>
          <h1 className="text-2xl font-semibold text-maroon mt-1">Monthly Food Safety Report</h1>
          <p className="text-ink-soft text-sm">Every log for the month in one document — use Print, then choose “Save as PDF” to keep a copy.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MonthPicker basePath="/dashboard/qc/report" month={month} />
          <PrintButton />
        </div>
      </div>

      {gaps.length > 0 && (
        <div className="bg-gold/10 border border-gold/30 rounded-card-lg px-5 py-3 text-sm text-ink-soft print:hidden">
          <strong className="text-ink">{gaps.length} log{gaps.length > 1 ? "s have" : " has"} no entries for {monthLabel(month)}:</strong> {gaps.map((g) => g.label).join(", ")}. They will print as “No entries recorded” — add entries or NIL entries first if that isn’t right.
        </div>
      )}

      <article className="bg-white rounded-card-lg shadow-soft p-8 print:shadow-none print:rounded-none print:p-0 space-y-6 print:space-y-4">
        {/* Header block */}
        <header>
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="text-xl font-semibold text-maroon print:text-black">SpiseUp Africa — Monthly Food Safety Record</div>
              <div className="text-sm text-ink-soft print:text-black">Betarlux Skincare Innovation Hub / Riaor Industries Ltd — Kitengela, Kajiado County</div>
            </div>
            <div className="text-right text-xs text-ink-soft print:text-black">HACCP-based records</div>
          </div>
          <table className="w-full mt-3 border-collapse">
            <tbody>
              <tr>
                <td className={td}>
                  <strong>Document No.:</strong> {docNo}
                </td>
                <td className={td}>
                  <strong>Period / Month:</strong> {monthLabel(month)}
                </td>
                <td className={td}>
                  <strong>Prepared By:</strong> {preparedBy}
                </td>
                <td className={td}>
                  <strong>Printed:</strong> {fmtDate(todayNairobi())}
                </td>
              </tr>
            </tbody>
          </table>
        </header>

        {/* Summary */}
        <section>
          <h2 className="text-sm font-semibold mb-1">Summary</h2>
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td className={td}>
                  <strong>{real.length}</strong> entries across {RECORD_TYPES.length - gaps.length} of {RECORD_TYPES.length} logs
                </td>
                <td className={td}>
                  <strong>{flagged.length}</strong> flagged {flagged.length === 1 ? "entry" : "entries"}
                </td>
                <td className={td}>
                  <strong>{openNow.length + carriedOpen.length}</strong> open complaint / non-conformance item{openNow.length + carriedOpen.length === 1 ? "" : "s"}
                  {carriedOpen.length > 0 ? ` (${carriedOpen.length} carried over)` : ""}
                </td>
                <td className={td}>
                  <strong>{reviewed}</strong> of {RECORD_TYPES.length} logs supervisor-reviewed
                </td>
              </tr>
              <tr>
                {ccps.map((c) => (
                  <td key={c.id} className={td} colSpan={2}>
                    <strong>{c.id}</strong>: {c.checks} check{c.checks === 1 ? "" : "s"} —{" "}
                    {c.checks === 0 ? <span className="font-semibold text-red-bright">none logged</span> : c.breaches > 0 ? <span className="font-semibold text-red-bright">{c.breaches} breach{c.breaches > 1 ? "es" : ""}</span> : "all within critical limit"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
          {carriedOpen.length > 0 && (
            <div className="mt-2 text-[10px]">
              <strong>Open from earlier months:</strong>{" "}
              {carriedOpen
                .map((o) => {
                  const t = RECORD_TYPES.find((x) => x.key === o.record_type);
                  return `${t?.label ?? o.record_type} (${fmtDate(o.record_date)})`;
                })
                .join("; ")}
            </div>
          )}
        </section>

        {/* One section per log, grouped */}
        {(() => {
          let n = 0;
          return GROUPS.map((g) => (
            <div key={g.key} className="space-y-6 print:space-y-4">
              <h2 className="text-base font-semibold text-maroon print:text-black border-b border-gray-300 pb-1 break-before-auto print:break-before-page">{g.title}</h2>
              {RECORD_TYPES.filter((t) => t.group === g.key).map((t) => {
                n += 1;
                const rows = byType.get(t.key) ?? [];
                const review = reviews.get(t.key);
                return (
                  <section key={t.key} className="break-inside-auto">
                    <div className="flex items-baseline justify-between gap-4 mb-1 print:break-after-avoid">
                      <h3 className="text-sm font-semibold">
                        {n}. {t.label}
                      </h3>
                      <span className="text-[10px] text-ink-soft print:text-black">{rows.length} {rows.length === 1 ? "entry" : "entries"}</span>
                    </div>
                    {rows.length === 0 ? (
                      <div className="border border-gray-400 px-2 py-2 text-[11px] italic">No entries recorded for {monthLabel(month)}.</div>
                    ) : (
                      <div className="overflow-x-auto print:overflow-visible">
                        <QcTable typeKey={t.key} records={rows} print />
                      </div>
                    )}
                    <table className="w-full border-collapse mt-1 print:break-inside-avoid">
                      <tbody>
                        <tr>
                          <td className={td}>
                            <strong>Supervisor review:</strong>{" "}
                            {review ? `${review.reviewed_by} — ${fmtDate(review.reviewed_at.slice(0, 10))}` : <span className="text-transparent select-none">________________________</span>}
                          </td>
                          <td className={`${td} w-1/3`}>
                            <strong>Signature:</strong>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </section>
                );
              })}
            </div>
          ));
        })()}

        <footer className="pt-2 text-[10px] text-ink-soft print:text-black border-t border-gray-300">
          {docNo} · {monthLabel(month)} · Generated from PennyPal on {fmtDate(todayNairobi())}. Flagged entries (⚑) breached a limit or recorded an issue; each carries its corrective action in the log above.
        </footer>
      </article>
    </div>
  );
}
