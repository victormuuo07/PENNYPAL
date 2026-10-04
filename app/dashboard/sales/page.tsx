import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SalesTable from "./components/SalesTable";
import AddSaleForm from "./components/AddSaleForm";
import CustomerMixSummary from "./components/CustomerMixSummary";
import CreditTracker from "./components/CreditTracker";
import { fetchInvoices, periodRange, summarizeVat, todayNairobi } from "@/lib/invoices";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, sales_person_id, full_name")
    .eq("id", user!.id)
    .single();

  const isOwner = profile?.role === "owner";

  // Any authenticated user can read HOTELS/MAMA_MBOGAS (matches original
  // app behavior), needed so a hotel/shop sale can be linked to a real
  // tracked record for Distribution.
  const [{ data: hotels }, { data: mamas }] = await Promise.all([
    supabase.from("HOTELS").select("id, hotel_name").order("hotel_name"),
    supabase.from("MAMA_MBOGAS").select("id, shop_name").order("shop_name"),
  ]);

  // RLS already scopes this to "own sales" for reps and "all sales" for
  // owners — no client-side filtering needed.
  const { data: sales } = await supabase
    .from("SALES")
    .select("*, SALES_PEOPLE(full_name)")
    .order("Date", { ascending: false })
    .limit(200);

  const rows = sales ?? [];

  // Deliberately separate from the SALES list above (which is capped to the
  // last 200 transactions and stores Total gross-of-VAT): this reads the
  // exact net/VAT split already stored per-invoice, for the current month
  // specifically, so it's never approximated or blended with "Sales".
  const { from, to, label: monthLabel } = periodRange("month", todayNairobi());
  const monthVat = isOwner ? summarizeVat(await fetchInvoices(supabase, from, to)) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-maroon">Sales</h1>
        <p className="text-ink-soft text-sm">
          {isOwner ? "Record and review sales transactions" : "Record and review your own sales"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <AddSaleForm
          salesPersonId={profile?.sales_person_id ?? null}
          salesPersonName={profile?.full_name ?? ""}
          hotels={hotels ?? []}
          mamas={mamas ?? []}
        />
        <Link
          href="/dashboard/sales/customers"
          className="bg-white shadow-soft hover:bg-cream-deep text-maroon rounded-card px-4 py-2 text-sm font-medium"
        >
          📞 B2C Customers to Call
        </Link>
        <Link
          href="/dashboard/sales/invoices"
          className="bg-white shadow-soft hover:bg-cream-deep text-maroon rounded-card px-4 py-2 text-sm font-medium"
        >
          🧾 Invoices & VAT
        </Link>
      </div>

      {monthVat && monthVat.invoiceCount > 0 && (
        <div className="bg-white rounded-card-lg shadow-soft p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-ink">{monthLabel}: Net Sales vs VAT</h2>
            <Link href="/dashboard/sales/invoices" className="text-xs text-maroon hover:underline whitespace-nowrap">
              Full VAT report →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-ink-soft text-xs">Net Sales (excl. VAT)</div>
              <div className="font-semibold text-maroon text-lg">KES {monthVat.netSales.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-ink-soft text-xs">VAT Collected (owed to KRA)</div>
              <div className="font-semibold text-red-bright text-lg">KES {monthVat.vatCollected.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-ink-soft text-xs">Gross Total Invoiced</div>
              <div className="font-semibold text-ink text-lg">KES {monthVat.grossTotal.toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}

      {isOwner && <CustomerMixSummary sales={rows} />}
      <CreditTracker sales={rows} />
      <SalesTable sales={rows} isOwner={isOwner} />
    </div>
  );
}
