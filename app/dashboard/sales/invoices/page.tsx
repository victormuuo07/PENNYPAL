import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchInvoices, periodRange, summarizeVat, todayNairobi, type PeriodKey } from "@/lib/invoices";
import InvoicePeriodPicker from "./components/InvoicePeriodPicker";
import InvoicesTable from "./components/InvoicesTable";
import DownloadAllButton from "./components/DownloadAllButton";

export const dynamic = "force-dynamic";

const VALID_PERIODS: PeriodKey[] = ["day", "week", "month", "year", "custom"];

export default async function InvoicesPage({ searchParams }: { searchParams: { period?: string; anchor?: string; from?: string; to?: string } }) {
  const supabase = createClient();
  const today = todayNairobi();

  const period = (VALID_PERIODS.includes(searchParams.period as PeriodKey) ? searchParams.period : "month") as PeriodKey;
  const anchor = searchParams.anchor && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.anchor) ? searchParams.anchor : today;
  const { from, to, label } = periodRange(period, anchor, searchParams.from, searchParams.to);

  const probe = await supabase.from("INVOICES").select("id", { head: true, count: "exact" });
  if (probe.error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-maroon">Invoices & VAT</h1>
        <div className="bg-gold/10 border border-gold/30 rounded-card-lg p-5 text-sm text-ink-soft space-y-2">
          <div className="font-medium text-ink">One-time setup needed</div>
          <p>
            Run <code className="bg-white px-1 rounded">supabase/invoices_schema.sql</code> in the Supabase SQL editor, then refresh this page.
          </p>
          <p className="text-xs">({probe.error.message})</p>
        </div>
      </div>
    );
  }

  const invoices = await fetchInvoices(supabase, from, to);
  const summary = summarizeVat(invoices);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/sales" className="text-xs text-ink-soft hover:text-maroon">
            ← Sales
          </Link>
          <h1 className="text-2xl font-semibold text-maroon mt-1">Invoices & VAT</h1>
          <p className="text-ink-soft text-sm">Net sales, VAT collected, and every invoice — kept separate so they never get blended into one number.</p>
        </div>
        <DownloadAllButton invoices={invoices} periodLabel={label} />
      </div>

      <InvoicePeriodPicker period={period} anchor={anchor} customFrom={searchParams.from} customTo={searchParams.to} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-card-lg shadow-soft p-5">
          <div className="text-xs text-ink-soft uppercase tracking-wide">Net Sales (excl. VAT)</div>
          <div className="text-2xl font-semibold text-maroon">KES {summary.netSales.toLocaleString()}</div>
          <div className="text-xs text-ink-soft">{label}</div>
        </div>
        <div className="bg-red-50 rounded-card-lg shadow-soft p-5">
          <div className="text-xs text-ink-soft uppercase tracking-wide">VAT Collected</div>
          <div className="text-2xl font-semibold text-red-bright">KES {summary.vatCollected.toLocaleString()}</div>
          <div className="text-xs text-ink-soft">Payable to KRA — not business income</div>
        </div>
        <div className="bg-white rounded-card-lg shadow-soft p-5">
          <div className="text-xs text-ink-soft uppercase tracking-wide">Gross Total Invoiced</div>
          <div className="text-2xl font-semibold text-ink">KES {summary.grossTotal.toLocaleString()}</div>
          <div className="text-xs text-ink-soft">What customers paid, VAT included</div>
        </div>
        <div className="bg-white rounded-card-lg shadow-soft p-5">
          <div className="text-xs text-ink-soft uppercase tracking-wide">Invoices</div>
          <div className="text-2xl font-semibold text-ink">{summary.invoiceCount}</div>
          <div className="text-xs text-ink-soft">
            {summary.paidCount} paid · {summary.unpaidCount} unpaid
          </div>
        </div>
      </div>

      <div className="bg-gold/10 border border-gold/30 rounded-card-lg px-5 py-3 text-xs text-ink-soft">
        KRA VAT returns are normally due by the 20th of the month following the tax period — the monthly figure above is what you&apos;d be reporting for that return.
      </div>

      <InvoicesTable invoices={invoices} />
    </div>
  );
}
