import { createClient } from "@/lib/supabase/server";
import CommissionsTable from "./components/CommissionsTable";
import CommissionSummary from "./components/CommissionSummary";

export default async function CommissionsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  const { data: commissions } = await supabase
    .from("SALES_COMMISSIONS")
    .select("*, SALES_PEOPLE(full_name)")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = commissions ?? [];
  const totalOwed = rows.filter((c) => !c.commission_paid).reduce((s, c) => s + (c.commission_amount ?? 0), 0);
  const totalPaid = rows.filter((c) => c.commission_paid).reduce((s, c) => s + (c.commission_amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-maroon">Commissions</h1>
        <p className="text-ink-soft text-sm">
          {profile?.role === "owner" ? "Track and settle sales rep commissions" : "Your commission history"}
        </p>
      </div>

      <CommissionSummary totalOwed={totalOwed} totalPaid={totalPaid} />
      <CommissionsTable commissions={rows} isOwner={profile?.role === "owner"} />
    </div>
  );
}
