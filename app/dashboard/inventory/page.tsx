import { createClient } from "@/lib/supabase/server";
import RawMaterialsPanel from "./components/RawMaterialsPanel";
import NewBatchForm from "./components/NewBatchForm";
import BatchHistory from "./components/BatchHistory";
import FinishedGoodsPanel from "./components/FinishedGoodsPanel";

export default async function InventoryPage() {
  const supabase = createClient();

  const [{ data: materials }, { data: batches }, { data: finishedGoods }, { data: outputs }] = await Promise.all([
    supabase.from("RAW_MATERIALS_INVENTORY").select("*").order("material_name"),
    supabase.from("BATCHES").select("*").order("production_date", { ascending: false }).limit(50),
    supabase.from("FINISHED_GOODS_INVENTORY").select("*").order("product_type"),
    supabase.from("PRODUCTION_OUTPUT").select("batch_id, product_type, quantity_produced"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-maroon">Inventory & Production</h1>
        <p className="text-ink-soft text-sm">
          Restock raw materials, record production batches, track finished goods
        </p>
      </div>

      <RawMaterialsPanel materials={materials ?? []} />
      <NewBatchForm materials={materials ?? []} />
      <BatchHistory batches={batches ?? []} outputs={outputs ?? []} />
      <FinishedGoodsPanel goods={finishedGoods ?? []} />
    </div>
  );
}
