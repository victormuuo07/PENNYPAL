import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/requireOwner";
import { GROUPS, RECORD_TYPES, RECORD_TYPE_MAP, fmtDate } from "@/lib/qc/config";
import { ccpSummary, currentMonth, fetchDueItems, fetchQcRecords, isValidMonth, monthLabel, monthRange, todayNairobi } from "@/lib/qc/queries";
import MonthPicker from "./components/MonthPicker";

export const dynamic = "force-dynamic";

export default async function QcHubPage({ searchParams }: { searchParams: { month?: string } }) {
  await requireOwner();
  const supabase = createClient();

  const month = isValidMonth(searchParams.month) ? searchParams.month : currentMonth();
  const { from, to } = monthRange(month);
  const today = todayNairobi();

  // Probe first so a missing migration shows a clear setup message instead of an empty page
  const probe = await supabase.from("QC_RECORDS").select("id", { head: true, count: "exact" });
  if (probe.error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-maroon">Quality & HACCP</h1>
        <div className="bg-gold/10 border border-gold/30 rounded-card-lg p-5 text-sm text-ink-soft space-y-2">
          <div className="font-medium text-ink">One-time setup needed</div>
          <p>
            The QC tables aren&apos;t in the database yet. Open the Supabase SQL editor and run{" "}
            <code className="bg-white px-1 rounded">supabase/qc_schema.sql</code>, then refresh this page.
          </p>
          <p className="text-xs">({probe.error.message})</p>
        </div>
      </div>
    );
  }

  const [records, due, openRes, lastEntries] = await Promise.all([
    fetchQcRecords(supabase, { from, to }),
    fetchDueItems(supabase, today),
    supabase.from("QC_RECORDS").select("id, record_type, record_date, data").eq("is_open", true).order("record_date"),
    Promise.all(
      RECORD_TYPES.map((t) =>
        supabase.from("QC_RECORDS").select("record_date").eq("record_type", t.key).order("record_date", { ascending: false }).limit(1)
      )
    ),
  ]);

  const openItems = openRes.data ?? [];
  const lastByType = new Map(RECORD_TYPES.map((t, i) => [t.key, lastEntries[i].data?.[0]?.record_date as string | undefined]));

  const stats = new Map<string, { count: number; flagged: number }>();
  for (const r of records) {
    const s = stats.get(r.record_type) ?? { count: 0, flagged: 0 };
    s.count += 1;
    if (r.is_flagged) s.flagged += 1;
    stats.set(r.record_type, s);
  }
  const totalFlagged = records.filter((r) => r.is_flagged).length;
  const ccps = ccpSummary(records);
  const emptyTypes = RECORD_TYPES.filter((t) => !stats.get(t.key));
  const overdue = due.filter((d) => d.daysUntil < 0);

  const daysSince = (d?: string) => (d ? Math.round((new Date(`${today}T00:00:00Z`).getTime() - new Date(`${d}T00:00:00Z`).getTime()) / 86400000) : null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-maroon">Quality & HACCP</h1>
          <p className="text-ink-soft text-sm">Food safety records for {monthLabel(month)} — everything logged here feeds the database and the monthly report</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MonthPicker basePath="/dashboard/qc" month={month} />
          <Link href={`/dashboard/qc/report?month=${month}`} className="bg-maroon hover:bg-red text-cream rounded-card px-4 py-2 text-sm font-medium transition-colors">
            📄 Monthly report
          </Link>
          <Link href="/dashboard/qc/haccp" className="bg-white shadow-soft hover:bg-cream-deep text-maroon rounded-card px-4 py-2 text-sm font-medium">
            HACCP plan
          </Link>
        </div>
      </div>

      {/* CCP monitoring */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ccps.map((c) => {
          const cfgCcp = c.id === "CCP-1" ? { title: "CCP-1 · Drying moisture", note: "Limit ≤ 11%", type: "in_process_qc" } : { title: "CCP-2 · Foreign body / metal", note: "Zero detectable", type: "final_product_qc" };
          const bad = c.breaches > 0;
          return (
            <Link key={c.id} href={`/dashboard/qc/${cfgCcp.type}?month=${month}`} className={`rounded-card-lg shadow-soft p-5 block ${bad ? "bg-red-50" : "bg-white"} hover:shadow-md transition-shadow`}>
              <div className="text-xs uppercase tracking-wide text-ink-soft">{cfgCcp.note}</div>
              <div className="font-semibold text-ink">{cfgCcp.title}</div>
              <div className="mt-2 flex items-baseline gap-4 text-sm">
                <span>
                  <span className="text-2xl font-semibold text-maroon">{c.checks}</span> <span className="text-ink-soft">checks</span>
                </span>
                <span className={bad ? "text-red-bright font-semibold" : "text-green-700"}>
                  {bad ? `⚑ ${c.breaches} breach${c.breaches > 1 ? "es" : ""}` : c.checks === 0 ? "No checks logged yet" : "✔ Within limit"}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Attention list */}
      {(overdue.length > 0 || due.length > 0 || openItems.length > 0 || totalFlagged > 0) && (
        <div className="bg-white rounded-card-lg shadow-soft p-6">
          <h2 className="text-lg font-medium text-ink mb-3">Needs attention</h2>
          <ul className="space-y-2 text-sm">
            {totalFlagged > 0 && (
              <li className="flex gap-2">
                <span>⚑</span>
                <span>
                  <strong>{totalFlagged}</strong> flagged {totalFlagged === 1 ? "entry" : "entries"} in {monthLabel(month)} — see the amber counts below.
                </span>
              </li>
            )}
            {openItems.map((o) => {
              const cfg = RECORD_TYPE_MAP[o.record_type];
              const d = o.data as Record<string, string>;
              const summary = d.nature ?? d.description ?? "";
              return (
                <li key={o.id} className="flex gap-2">
                  <span>📂</span>
                  <span>
                    <Link href={`/dashboard/qc/${o.record_type}?month=${o.record_date.slice(0, 7)}`} className="text-maroon hover:underline font-medium">
                      Open {cfg?.label ?? o.record_type}
                    </Link>{" "}
                    <span className="text-ink-soft">
                      — {fmtDate(o.record_date)}
                      {summary ? `: ${summary.slice(0, 80)}${summary.length > 80 ? "…" : ""}` : ""}
                    </span>
                  </span>
                </li>
              );
            })}
            {due.map((d) => (
              <li key={`${d.recordType}-${d.label}`} className="flex gap-2">
                <span>{d.daysUntil < 0 ? "🔴" : "🟡"}</span>
                <span>
                  <Link href={`/dashboard/qc/${d.recordType}`} className="text-maroon hover:underline font-medium">
                    {d.label}
                  </Link>{" "}
                  <span className={d.daysUntil < 0 ? "text-red-bright" : "text-ink-soft"}>
                    — {d.daysUntil < 0 ? `overdue by ${-d.daysUntil} day${d.daysUntil === -1 ? "" : "s"}` : d.daysUntil === 0 ? "due today" : `due in ${d.daysUntil} days`} ({fmtDate(d.dueDate)})
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {emptyTypes.length > 0 && month === currentMonth() && (
        <div className="bg-gold/10 border border-gold/30 rounded-card-lg px-5 py-3 text-sm text-ink-soft">
          <strong className="text-ink">{emptyTypes.length} log{emptyTypes.length > 1 ? "s have" : " has"} no entries this month:</strong>{" "}
          {emptyTypes.map((t) => t.label).join(", ")}. Log real entries — or a NIL entry where allowed — so the monthly report has no gaps.
        </div>
      )}

      {/* Log cards */}
      {GROUPS.map((g) => (
        <div key={g.key}>
          <h2 className="text-lg font-medium text-ink">{g.title}</h2>
          <p className="text-xs text-ink-soft mb-3">{g.blurb}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {RECORD_TYPES.filter((t) => t.group === g.key).map((t) => {
              const s = stats.get(t.key);
              const last = lastByType.get(t.key);
              const since = daysSince(last);
              const stale = t.staleDays !== undefined && (since === null || since > t.staleDays);
              return (
                <Link key={t.key} href={`/dashboard/qc/${t.key}?month=${month}`} className="bg-white rounded-card-lg shadow-soft p-5 hover:shadow-md transition-shadow block">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium text-ink">
                      {t.icon} {t.label}
                    </div>
                    {s && s.flagged > 0 && <span className="text-xs font-semibold bg-red-50 text-red-bright rounded-full px-2 py-0.5 whitespace-nowrap">⚑ {s.flagged}</span>}
                  </div>
                  <div className="text-xs text-ink-soft mt-1 line-clamp-2">{t.description}</div>
                  <div className="mt-3 flex items-baseline justify-between text-sm">
                    <span>
                      <span className="text-xl font-semibold text-maroon">{s?.count ?? 0}</span> <span className="text-ink-soft">this month</span>
                    </span>
                    <span className={`text-xs ${stale ? "text-red-bright font-medium" : "text-ink-soft"}`}>
                      {last ? `Last: ${fmtDate(last)}` : "Never logged"}
                      {stale && last ? " · overdue" : ""}
                    </span>
                  </div>
                  <div className="text-[11px] text-ink-soft mt-1">{t.frequency}</div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
