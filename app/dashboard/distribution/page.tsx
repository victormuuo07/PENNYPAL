import { createClient } from "@/lib/supabase/server";
import { computeHotelPerformance, computeMamaPerformance } from "@/lib/territoryAnalysis";
import AddHotelForm from "./components/AddHotelForm";
import RecordRefillForm from "./components/RecordRefillForm";
import PerformanceOverview from "./components/PerformanceOverview";
import SilentHotelsAlert from "./components/SilentHotelsAlert";
import AddMamaForm from "./components/AddMamaForm";
import RecordMamaPurchaseForm from "./components/RecordMamaPurchaseForm";
import MamaPerformanceOverview from "./components/MamaPerformanceOverview";
import { REFILL_PRODUCTS } from "./constants";

export default async function DistributionPage() {
  const supabase = createClient();

  const [{ data: hotels }, { data: refills }, { data: mamas }, { data: mamaPurchases }] = await Promise.all([
    supabase.from("HOTELS").select("*").order("hotel_name"),
    supabase.from("HOTEL_REFILLS").select("*").order("refill_date", { ascending: false }),
    supabase.from("MAMA_MBOGAS").select("*").order("shop_name"),
    supabase.from("MAMA_MBOGAS_PURCHASES").select("*").order("purchase_date", { ascending: false }),
  ]);

  const performance = computeHotelPerformance(hotels ?? [], refills ?? []);
  const mamaPerformance = computeMamaPerformance(mamas ?? [], mamaPurchases ?? []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-maroon">Distribution</h1>
        <p className="text-ink-soft text-sm">
          Hotels, restaurants, and Mama Mboga shops — refills, purchases, and who's earning their keep
        </p>
      </div>

      <SilentHotelsAlert performance={performance} />

      <div>
        <h2 className="text-lg font-medium text-ink mb-3">🏨 Hotels & Restaurants</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <AddHotelForm />
          <RecordRefillForm hotels={hotels ?? []} products={REFILL_PRODUCTS} />
        </div>
        <PerformanceOverview performance={performance} />
      </div>

      <div>
        <h2 className="text-lg font-medium text-ink mb-3">🛒 Mama Mbogas & Shops</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <AddMamaForm />
          <RecordMamaPurchaseForm mamas={mamas ?? []} />
        </div>
        <MamaPerformanceOverview performance={mamaPerformance} />
      </div>
    </div>
  );
}
