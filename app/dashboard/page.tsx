import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import SummaryCard from "@/components/SummaryCard";
import SpendingChart from "@/components/SpendingChart";
import BusinessHealthPanel from "@/components/BusinessHealthPanel";
import TopPerformers from "@/components/TopPerformers";
import RecentActivity from "@/components/RecentActivity";
import TradeHistorySinceLaunch from "@/components/TradeHistorySinceLaunch";

// Never serve a cached/static snapshot — every sale, restock, or expense
// entered should be reflected on the very next load.
export const dynamic = "force-dynamic";

type SaleRow = {
  Total: number;
  Date: string;
  Customer_Type: string | null;
  Payment_Status: string;
  amount_paid: number | null;
  Product: string;
  sales_person_id: string | null;
  SALES_PEOPLE: { full_name: string }[] | null;
};

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  const isOwner = profile?.role === "owner";

  const [sales, { data: expenses }] = await Promise.all([
    fetchAllRows<SaleRow>(
      supabase,
      "SALES",
      "Total, Date, Customer_Type, Payment_Status, amount_paid, Product, sales_person_id, SALES_PEOPLE(full_name)",
      "Date"
    ),
    supabase.from("EXPENSES").select("amount, date, category"),
  ]);

  // "This month vs last month" is what makes a trend arrow meaningful — an
  // all-time total compared to last month's total would just be noise, since
  // the all-time number only ever grows. The 6-month chart below still shows
  // the longer history; these cards are the "how's *now* going" snapshot.
  const now = new Date();
  const thisMonthKey = now.toISOString().slice(0, 7);
  const lastMonthKey = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);

  const salesThisMonth = (sales ?? []).filter((s) => (s.Date ?? "").startsWith(thisMonthKey)).reduce((s, x) => s + (x.Total ?? 0), 0);
  const salesLastMonth = (sales ?? []).filter((s) => (s.Date ?? "").startsWith(lastMonthKey)).reduce((s, x) => s + (x.Total ?? 0), 0);
  const expensesThisMonth = (expenses ?? []).filter((e) => (e.date ?? "").startsWith(thisMonthKey)).reduce((s, x) => s + (x.amount ?? 0), 0);
  const expensesLastMonth = (expenses ?? []).filter((e) => (e.date ?? "").startsWith(lastMonthKey)).reduce((s, x) => s + (x.amount ?? 0), 0);
  const balanceThisMonth = salesThisMonth - expensesThisMonth;
  const balanceLastMonth = salesLastMonth - expensesLastMonth;
  const profitMarginThisMonth = salesThisMonth > 0 ? (balanceThisMonth / salesThisMonth) * 100 : 0;
  const profitMarginLastMonth = salesLastMonth > 0 ? (balanceLastMonth / salesLastMonth) * 100 : 0;

  const monthly: Record<string, { month: string; sales: number; expenses: number }> = {};
  for (const s of sales ?? []) {
    const key = (s.Date ?? "").slice(0, 7);
    if (!key) continue;
    monthly[key] ??= { month: key, sales: 0, expenses: 0 };
    monthly[key].sales += s.Total ?? 0;
  }
  for (const e of expenses ?? []) {
    const key = (e.date ?? "").slice(0, 7);
    if (!key) continue;
    monthly[key] ??= { month: key, sales: 0, expenses: 0 };
    monthly[key].expenses += e.amount ?? 0;
  }
  const allMonths = Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month));
  const chartData = allMonths.slice(-6);
  const totalSalesSinceLaunch = (sales ?? []).reduce((s, x) => s + (x.Total ?? 0), 0);

  // Business Health, Top Performers, and Recent Activity all pull
  // company-wide data — owner-only, so only fetched (and only allowed by
  // RLS) when the logged-in user actually is one.
  let materials: { material_name: string; current_stock_kg: number; reorder_level: number }[] = [];
  let finishedGoods: { product_type: string; current_stock: number; reorder_level: number }[] = [];
  let hotels: { id: string; hotel_name: string; location: string | null; contact_phone: string | null; contact_person: string | null; joined_date: string; status: string }[] = [];
  let refills: { id: string; hotel_id: string; refill_date: string; product_type: string; quantity: number; amount_paid: number; payment_status: string; notes: string | null }[] = [];
  let topProducts: { name: string; value: number }[] = [];
  let topRep: { name: string; value: number } | null = null;
  let topHotelOrShop: { name: string; value: number } | null = null;
  let activities: { icon: string; text: string; date: string }[] = [];

  if (isOwner) {
    const [m, g, h, r, mamas, mamaPurchases, restocks] = await Promise.all([
      supabase.from("RAW_MATERIALS_INVENTORY").select("material_name, current_stock_kg, reorder_level"),
      supabase.from("FINISHED_GOODS_INVENTORY").select("product_type, current_stock, reorder_level"),
      supabase.from("HOTELS").select("*"),
      supabase.from("HOTEL_REFILLS").select("*"),
      supabase.from("MAMA_MBOGAS").select("id, shop_name"),
      supabase.from("MAMA_MBOGAS_PURCHASES").select("mama_id, purchase_date, total_amount"),
      supabase.from("STOCK_RESTOCK").select("material_name, quantity_kg, restock_date").order("restock_date", { ascending: false }).limit(5),
    ]);
    materials = m.data ?? [];
    finishedGoods = g.data ?? [];
    hotels = h.data ?? [];
    refills = r.data ?? [];

    // Top products this month
    const productTotals = new Map<string, number>();
    for (const s of sales ?? []) {
      if (!(s.Date ?? "").startsWith(thisMonthKey)) continue;
      productTotals.set(s.Product, (productTotals.get(s.Product) ?? 0) + (s.Total ?? 0));
    }
    topProducts = Array.from(productTotals.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);

    // Top rep this month
    const repTotals = new Map<string, number>();
    for (const s of sales ?? []) {
      if (!(s.Date ?? "").startsWith(thisMonthKey)) continue;
      const repName = s.SALES_PEOPLE?.[0]?.full_name;
      if (!repName) continue;
      repTotals.set(repName, (repTotals.get(repName) ?? 0) + (s.Total ?? 0));
    }
    const topRepEntry = Array.from(repTotals.entries()).sort((a, b) => b[1] - a[1])[0];
    topRep = topRepEntry ? { name: topRepEntry[0], value: topRepEntry[1] } : null;

    // Top hotel/shop this month — combine refills + mama purchases
    const hotelNameById = new Map((hotels ?? []).map((hh) => [hh.id, hh.hotel_name]));
    const mamaNameById = new Map((mamas.data ?? []).map((mm) => [mm.id, mm.shop_name]));
    const venueTotals = new Map<string, number>();
    for (const ref of refills ?? []) {
      if (!ref.refill_date.startsWith(thisMonthKey)) continue;
      const name = hotelNameById.get(ref.hotel_id) ?? "Unknown hotel";
      venueTotals.set(name, (venueTotals.get(name) ?? 0) + (ref.amount_paid ?? 0));
    }
    for (const p of mamaPurchases.data ?? []) {
      if (!p.purchase_date.startsWith(thisMonthKey)) continue;
      const name = mamaNameById.get(p.mama_id) ?? "Unknown shop";
      venueTotals.set(name, (venueTotals.get(name) ?? 0) + (p.total_amount ?? 0));
    }
    const topVenueEntry = Array.from(venueTotals.entries()).sort((a, b) => b[1] - a[1])[0];
    topHotelOrShop = topVenueEntry ? { name: topVenueEntry[0], value: topVenueEntry[1] } : null;

    // Recent activity — merge last few sales + refills + restocks into one feed
    const recentSales = (sales ?? [])
      .slice()
      .sort((a, b) => (b.Date ?? "").localeCompare(a.Date ?? ""))
      .slice(0, 4)
      .map((s) => ({ icon: "💰", text: `Sale: ${s.Product} — KES ${(s.Total ?? 0).toLocaleString()}`, date: s.Date ?? "" }));
    const recentRefills = (refills ?? [])
      .slice()
      .sort((a, b) => b.refill_date.localeCompare(a.refill_date))
      .slice(0, 3)
      .map((rf) => ({
        icon: "🏨",
        text: `Refill: ${hotelNameById.get(rf.hotel_id) ?? "hotel"} — ${rf.quantity} ${rf.product_type}`,
        date: rf.refill_date,
      }));
    const recentRestocks = (restocks.data ?? []).map((rs) => ({
      icon: "📦",
      text: `Restocked ${rs.quantity_kg}kg ${rs.material_name}`,
      date: rs.restock_date,
    }));
    activities = [...recentSales, ...recentRefills, ...recentRestocks]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-maroon">Dashboard</h1>
        <p className="text-ink-soft text-sm">
          {isOwner ? "This month's overview of SpiseUp finances" : "Your sales overview"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryCard label="This Month's Balance" value={balanceThisMonth} tone="balance" previousValue={balanceLastMonth} />
        <SummaryCard label="This Month's Sales" value={salesThisMonth} tone="positive" previousValue={salesLastMonth} />
        <SummaryCard label="This Month's Expenses" value={expensesThisMonth} tone="negative" previousValue={expensesLastMonth} invertTrend />
        <SummaryCard
          label="Profit Margin"
          value={profitMarginThisMonth}
          tone="balance"
          format="percent"
          previousValue={profitMarginLastMonth}
        />
        <SummaryCard label="Total Sales Since Launch" value={totalSalesSinceLaunch} tone="positive" />
      </div>

      {isOwner && (
        <BusinessHealthPanel
          sales={sales ?? []}
          materials={materials}
          finishedGoods={finishedGoods}
          hotels={hotels}
          refills={refills}
        />
      )}

      {isOwner && <TopPerformers topProducts={topProducts} topRep={topRep} topHotelOrShop={topHotelOrShop} />}

      <div className="bg-white rounded-card-lg shadow-soft p-6">
        <h2 className="text-lg font-medium text-ink mb-4">Sales vs Expenses (last 6 months + next month est.)</h2>
        <SpendingChart data={chartData} />
      </div>

      {isOwner && <TradeHistorySinceLaunch monthly={allMonths} />}

      {isOwner && <RecentActivity activities={activities} />}
    </div>
  );
}
