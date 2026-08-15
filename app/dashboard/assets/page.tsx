import { createClient } from "@/lib/supabase/server";
import AssetsPanel from "./components/AssetsPanel";
import FundingPanel from "./components/FundingPanel";

export default async function AssetsPage() {
  const supabase = createClient();

  const [{ data: assets }, { data: funding }] = await Promise.all([
    supabase.from("ASSETS").select("*").order("purchase_date", { ascending: false }),
    supabase.from("FUNDING").select("*").order("funding_date", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-maroon">Assets & Funding</h1>
        <p className="text-ink-soft text-sm">Company assets and funding sources</p>
      </div>

      <AssetsPanel assets={assets ?? []} />
      <FundingPanel funding={funding ?? []} />
    </div>
  );
}
