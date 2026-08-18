import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import BusinessHealthGauge from "./components/BusinessHealthGauge";
import SalesTrendChart from "./components/SalesTrendChart";
import SalesDeepDive from "./components/SalesDeepDive";
import Leaderboards from "./components/Leaderboards";
import ProductProfitability from "./components/ProductProfitability";
import ExpenseAnalytics from "./components/ExpenseAnalytics";
import ExpenseInsights from "./components/ExpenseInsights";
import DistributionAnalytics from "./components/DistributionAnalytics";
import BatchAnalytics from "./components/BatchAnalytics";

const DAY_MS = 1000 * 60 * 60 * 24;

// Same reasoning as Dashboard — this page must never serve a cached
// snapshot of sales/expense data.
export const dynamic = "force-dynamic";

type SaleRow = {
  Date: string;
  Total: number;
  Customer_Type: string | null;
  Product: string;
  sales_person_id: string | null;
  SALES_PEOPLE: { full_name: string }[] | null;
};

export default async function AnalyticsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  if (profile?.role !== "owner") redirect("/dashboard");

  const [
    sales,
    { data: expenses },
    { data: hotels },
    { data: refills },
    { data: mamas },
    { data: mamaPurchases },
    { data: batches },
    { data: outputs },
    { data: costSettingsRows },
  ] = await Promise.all([
    fetchAllRows<SaleRow>(
      supabase,
      "SALES",
      "Date, Total, Customer_Type, Product, sales_person_id, SALES_PEOPLE(full_name)",
      "Date"
    ),
    supabase.from("EXPENSES").select("date, amount, category"),
    supabase.from("HOTELS").select("id, hotel_name"),
    supabase.from("HOTEL_REFILLS").select("hotel_id, refill_date, amount_paid"),
    supabase.from("MAMA_MBOGAS").select("id, shop_name"),
    supabase.from("MAMA_MBOGAS_PURCHASES").select("mama_id, purchase_date, total_amount"),
    supabase.from("BATCHES").select("production_date, total_kg_produced"),
    supabase.from("PRODUCTION_OUTPUT").select("batch_id, product_type, quantity_produced"),
    supabase.from("COST_SETTINGS").select("*").limit(1),
  ]);

  const hotelNameById = new Map((hotels ?? []).map((h) => [h.id, h.hotel_name]));
  const hotelTxns = (refills ?? []).map((r) => ({
    date: r.refill_date,
    amount: r.amount_paid ?? 0,
    name: hotelNameById.get(r.hotel_id) ?? "Unknown",
  }));

  const mamaNameById = new Map((mamas ?? []).map((m) => [m.id, m.shop_name]));
  const mamaTxns = (mamaPurchases ?? []).map((p) => ({
    date: p.purchase_date,
    amount: p.total_amount ?? 0,
    name: mamaNameById.get(p.mama_id) ?? "Unknown",
  }));

  // Combined venue revenue+visits for the Leaderboards scatter
  const venueMap = new Map<string, { revenue: number; visits: number }>();
  for (const t of [...hotelTxns, ...mamaTxns]) {
    const existing = venueMap.get(t.name) ?? { revenue: 0, visits: 0 };
    existing.revenue += t.amount;
    existing.visits += 1;
    venueMap.set(t.name, existing);
  }
  const venues = Array.from(venueMap.entries()).map(([name, v]) => ({ name, ...v }));

  // Business Health Score inputs
  const totalSales = (sales ?? []).reduce((s, x) => s + (x.Total ?? 0), 0);
  const totalExpenses = (expenses ?? []).reduce((s, x) => s + (x.amount ?? 0), 0);
  const balance = totalSales - totalExpenses;
  const profitMargin = totalSales > 0 ? (balance / totalSales) * 100 : 0;

  const now = Date.now();
  const last7 = (sales ?? []).filter((s) => now - new Date(s.Date).getTime() < 7 * DAY_MS).reduce((s, x) => s + (x.Total ?? 0), 0);
  const prev7 = (sales ?? [])
    .filter((s) => {
      const t = now - new Date(s.Date).getTime();
      return t >= 7 * DAY_MS && t < 14 * DAY_MS;
    })
    .reduce((s, x) => s + (x.Total ?? 0), 0);
  const salesGrowth = prev7 > 0 ? ((last7 - prev7) / prev7) * 100 : 0;

  const last30Expenses = (expenses ?? []).filter((e) => now - new Date(e.date).getTime() < 30 * DAY_MS).reduce((s, x) => s + x.amount, 0);
  const monthlyBurn = last30Expenses > 0 ? last30Expenses : totalExpenses / 12 || 1;
  const runwayMonths = balance > 0 ? balance / monthlyBurn : 0;

  const costSettings = costSettingsRows?.[0] ?? { cost_per_gram: 0.34, label_cost: 11, bottle_cost: 12, sachet_cost: 0.5 };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-maroon">Analytics</h1>
        <p className="text-ink-soft text-sm">Deep-dive charts and financial analysis across every part of the business</p>
      </div>

      <BusinessHealthGauge profitMargin={profitMargin} salesGrowth={salesGrowth} runwayMonths={runwayMonths} cashBalance={balance} />

      <SalesTrendChart sales={sales ?? []} />
      <SalesDeepDive sales={sales ?? []} />
      <Leaderboards sales={sales ?? []} venues={venues} />
      <ProductProfitability initialCosts={costSettings} />

      <ExpenseAnalytics expenses={expenses ?? []} />
      <ExpenseInsights expenses={expenses ?? []} />

      <DistributionAnalytics title="Hotels & Restaurants" icon="🏨" transactions={hotelTxns} />
      <DistributionAnalytics title="Mama Mbogas & Shops" icon="🛒" transactions={mamaTxns} />
      <BatchAnalytics batches={batches ?? []} outputs={outputs ?? []} />
    </div>
  );
}
