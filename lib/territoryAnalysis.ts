export type Hotel = {
  id: string;
  hotel_name: string;
  location: string | null;
  contact_phone: string | null;
  contact_person: string | null;
  joined_date: string;
  status: string;
};

export type HotelRefill = {
  id: string;
  hotel_id: string;
  refill_date: string;
  product_type: string;
  quantity: number;
  amount_paid: number;
  payment_status: string;
  notes: string | null;
};

export type PerformanceTier = "Star" | "Growing" | "Steady" | "At Risk" | "Dormant" | "New";
export type FrequencyTier = "High" | "Medium" | "Low" | "New/Unknown";

export type HotelPerformance = Hotel & {
  visit_count: number;
  total_units: number;
  total_revenue: number;
  avg_order_value: number;
  avg_days_between_restocks: number | null;
  days_since_last_restock: number | null;
  tier: FrequencyTier;
  performance_score: number;
  performance_tier: PerformanceTier;
  due_for_visit: boolean;
};

const DAY_MS = 1000 * 60 * 60 * 24;

/**
 * Direct port of get_hotel_territory_analysis() from supabase_client.py.
 * Same scoring: revenue (40pts) + frequency (30pts) + recency (30pts),
 * same tier thresholds. Keep this in sync if the Python version changes.
 */
export type MamaMboga = {
  id: string;
  shop_name: string;
  location: string | null;
  contact_phone: string | null;
  joined_date: string;
  status: string;
  sales_volume: string | null;
};

export type MamaPurchase = {
  id: string;
  mama_id: string;
  purchase_date: string;
  product_type: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_status: string;
};

export type MamaPerformance = MamaMboga & {
  visit_count: number;
  total_revenue: number;
  days_since_last_purchase: number | null;
  performance_tier: PerformanceTier;
  due_for_visit: boolean;
};

/**
 * Same scoring approach as computeHotelPerformance — revenue + recency —
 * simplified slightly since Mama Mboga purchases don't track a separate
 * "amount_paid" field the way hotel refills do (total_amount covers it).
 */
export function computeMamaPerformance(mamas: MamaMboga[], purchases: MamaPurchase[]): MamaPerformance[] {
  const byMama = new Map<string, MamaPurchase[]>();
  for (const p of purchases) {
    const list = byMama.get(p.mama_id) ?? [];
    list.push(p);
    byMama.set(p.mama_id, list);
  }

  return mamas.map((mama) => {
    const mamaPurchases = (byMama.get(mama.id) ?? []).slice().sort(
      (a, b) => new Date(a.purchase_date).getTime() - new Date(b.purchase_date).getTime()
    );
    const visit_count = mamaPurchases.length;
    const total_revenue = mamaPurchases.reduce((s, p) => s + (p.total_amount ?? 0), 0);

    if (visit_count === 0) {
      return {
        ...mama,
        visit_count: 0,
        total_revenue: 0,
        days_since_last_purchase: null,
        performance_tier: "New",
        due_for_visit: true,
      };
    }

    const last = new Date(mamaPurchases[mamaPurchases.length - 1].purchase_date).getTime();
    const days_since_last_purchase = (Date.now() - last) / DAY_MS;
    const avgGapDays =
      visit_count >= 2
        ? (last - new Date(mamaPurchases[0].purchase_date).getTime()) / DAY_MS / Math.max(visit_count - 1, 1)
        : 14;

    let performance_tier: PerformanceTier;
    if (visit_count < 2) performance_tier = "New";
    else if (days_since_last_purchase > 2 * avgGapDays) performance_tier = "Dormant";
    else if (days_since_last_purchase > avgGapDays) performance_tier = "At Risk";
    else if (total_revenue > 5000) performance_tier = "Star";
    else performance_tier = "Steady";

    return {
      ...mama,
      visit_count,
      total_revenue,
      days_since_last_purchase,
      performance_tier,
      due_for_visit: days_since_last_purchase > avgGapDays,
    };
  });
}
export function computeHotelPerformance(hotels: Hotel[], refills: HotelRefill[]): HotelPerformance[] {
  const byHotel = new Map<string, HotelRefill[]>();
  for (const r of refills) {
    const list = byHotel.get(r.hotel_id) ?? [];
    list.push(r);
    byHotel.set(r.hotel_id, list);
  }

  const rows: HotelPerformance[] = hotels.map((hotel) => {
    const hotelRefills = (byHotel.get(hotel.id) ?? []).slice().sort(
      (a, b) => new Date(a.refill_date).getTime() - new Date(b.refill_date).getTime()
    );

    const visit_count = hotelRefills.length;
    const total_units = hotelRefills.reduce((s, r) => s + (r.quantity ?? 0), 0);
    const total_revenue = hotelRefills.reduce((s, r) => s + (r.amount_paid ?? 0), 0);

    if (visit_count === 0) {
      return {
        ...hotel,
        visit_count: 0,
        total_units: 0,
        total_revenue: 0,
        avg_order_value: 0,
        avg_days_between_restocks: null,
        days_since_last_restock: null,
        tier: "New/Unknown",
        performance_score: 0,
        performance_tier: "New",
        due_for_visit: true,
      };
    }

    const avg_order_value = total_revenue / visit_count;
    const first = new Date(hotelRefills[0].refill_date).getTime();
    const last = new Date(hotelRefills[hotelRefills.length - 1].refill_date).getTime();
    const spanDays = (last - first) / DAY_MS;
    const avg_days_between_restocks =
      visit_count >= 2 ? spanDays / Math.max(visit_count - 1, 1) : null;

    const days_since_last_restock = (Date.now() - last) / DAY_MS;

    let tier: FrequencyTier = "New/Unknown";
    if (avg_days_between_restocks !== null && visit_count >= 2) {
      if (avg_days_between_restocks <= 10) tier = "High";
      else if (avg_days_between_restocks <= 21) tier = "Medium";
      else tier = "Low";
    }

    const due_for_visit =
      avg_days_between_restocks === null
        ? true
        : days_since_last_restock > avg_days_between_restocks;

    return {
      ...hotel,
      visit_count,
      total_units,
      total_revenue,
      avg_order_value,
      avg_days_between_restocks,
      days_since_last_restock,
      tier,
      performance_score: 0, // filled in below
      performance_tier: "New",
      due_for_visit,
    };
  });

  const maxRevenue = Math.max(...rows.map((r) => r.total_revenue), 1);

  for (const row of rows) {
    if (row.visit_count < 1) {
      row.performance_score = 0;
      row.performance_tier = "New";
      continue;
    }

    const revenueScore = Math.min((row.total_revenue / maxRevenue) * 40, 40);

    let freqScore: number;
    if (row.visit_count < 2 || row.avg_days_between_restocks === null) {
      freqScore = 10;
    } else {
      const d = Math.max(row.avg_days_between_restocks, 1);
      freqScore = Math.max(0, Math.min(30, 30 - d / 2));
    }

    let recencyScore = 0;
    if (row.days_since_last_restock !== null) {
      const expected =
        row.avg_days_between_restocks && row.avg_days_between_restocks > 0
          ? row.avg_days_between_restocks
          : 14;
      const overdueRatio = row.days_since_last_restock / expected;
      recencyScore = Math.max(0, Math.min(30, 30 - overdueRatio * 15));
    }

    row.performance_score = Math.round((revenueScore + freqScore + recencyScore) * 10) / 10;

    if (row.visit_count < 2) {
      row.performance_tier = "New";
    } else {
      const d = row.avg_days_between_restocks;
      const dsr = row.days_since_last_restock;
      if (d && dsr !== null && d > 0 && dsr > 2 * d) {
        row.performance_tier = "Dormant";
      } else if (row.performance_score >= 65) {
        row.performance_tier = "Star";
      } else if (row.performance_score >= 45) {
        row.performance_tier = "Growing";
      } else if (row.performance_score >= 25) {
        row.performance_tier = "Steady";
      } else {
        row.performance_tier = "At Risk";
      }
    }
  }

  return rows;
}
