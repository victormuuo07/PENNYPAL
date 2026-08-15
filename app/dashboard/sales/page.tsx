import { createClient } from "@/lib/supabase/server";
import SalesTable from "./components/SalesTable";
import AddSaleForm from "./components/AddSaleForm";
import CustomerMixSummary from "./components/CustomerMixSummary";
import CreditTracker from "./components/CreditTracker";

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-maroon">Sales</h1>
        <p className="text-ink-soft text-sm">
          {isOwner ? "Record and review sales transactions" : "Record and review your own sales"}
        </p>
      </div>

      <AddSaleForm
        salesPersonId={profile?.sales_person_id ?? null}
        salesPersonName={profile?.full_name ?? ""}
        hotels={hotels ?? []}
        mamas={mamas ?? []}
      />

      {isOwner && <CustomerMixSummary sales={rows} />}
      <CreditTracker sales={rows} />
      <SalesTable sales={rows} isOwner={isOwner} />
    </div>
  );
}
