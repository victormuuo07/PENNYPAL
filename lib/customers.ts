import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * B2C customers to call — derived entirely from existing SALES rows where
 * Customer_Type = "Consumer (B2C)". No new table: shops and hotels are
 * excluded by that same field, since they're logged as "Shop/Mama Mboga
 * (B2B)" or "Hotel/Restaurant" (see AddSaleForm.tsx).
 *
 * RLS on SALES already scopes this correctly with no extra work: owners see
 * every customer, reps see only customers from their own sales.
 */

export const B2C_TYPE = "Consumer (B2C)";

// ------------------------------------------------------------------ months
// (kept local to this feature rather than shared with lib/qc, so the two
// stay independent — see lib/qc/queries.ts for the same small helpers)

export function todayNairobi(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
}
export function currentMonth(): string {
  return todayNairobi().slice(0, 7);
}
export function isValidMonth(m: string | undefined | null): m is string {
  return !!m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m);
}
export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number);
  return { from: `${month}-01`, to: new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10) };
}
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}
export function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return s;
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${m[3]}-${MONTHS[Number(m[2]) - 1] ?? m[2]}-${m[1]}`;
}

// ------------------------------------------------------------------- types

type SaleRow = {
  Date: string;
  Name: string | null;
  Phone: number | string | null;
  Location: string | null;
  Product: string | null;
  Quantity: number | null;
  Total: number | null;
};

export type CustomerItem = { product: string; quantity: number };

export type B2CCustomer = {
  key: string;
  name: string;
  phone: string | null; // digits only, ready for a tel: link
  location: string | null;
  items: CustomerItem[]; // what they bought within the selected month
  visitsInMonth: number;
  totalSpentInMonth: number;
  firstPurchaseDate: string; // lifetime, so "new" is meaningful
  lastPurchaseDate: string; // within the selected month
  isNew: boolean; // first-ever purchase falls inside the selected month
};

export type B2CResult = { customers: B2CCustomer[]; newCount: number };

// ------------------------------------------------------------------ fetch

/** Pages through PostgREST's 1000-row cap. Fetches lifetime history (not just the month) — needed to tell a new customer from a returning one. */
async function fetchAllB2CSales(supabase: SupabaseClient): Promise<SaleRow[]> {
  const pageSize = 1000;
  let all: SaleRow[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("SALES")
      .select("Date, Name, Phone, Location, Product, Quantity, Total")
      .eq("Customer_Type", B2C_TYPE)
      .order("Date", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error || !data) break;
    all = all.concat(data as SaleRow[]);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

function phoneDigits(p: SaleRow["Phone"]): string {
  return p === null || p === undefined ? "" : String(p).replace(/\D/g, "");
}

function customerKey(row: SaleRow): string {
  const p = phoneDigits(row.Phone);
  if (p) return `p:${p}`;
  return `n:${(row.Name ?? "").trim().toLowerCase()}|${(row.Location ?? "").trim().toLowerCase()}`;
}

/** Builds the "who to call" list for one month, using lifetime data only to tell new customers from returning ones. */
export async function fetchB2CCustomers(supabase: SupabaseClient, month: string): Promise<B2CResult> {
  const { from, to } = monthRange(month);
  const rows = await fetchAllB2CSales(supabase); // ascending by Date

  const firstSeen = new Map<string, SaleRow>();
  const inMonth = new Map<string, SaleRow[]>();

  for (const row of rows) {
    if (!row.Date) continue;
    const key = customerKey(row);
    if (!firstSeen.has(key)) firstSeen.set(key, row); // ascending order → first occurrence is the earliest

    if (row.Date >= from && row.Date < to) {
      const list = inMonth.get(key) ?? [];
      list.push(row);
      inMonth.set(key, list);
    }
  }

  const customers: B2CCustomer[] = [];
  for (const [key, sales] of inMonth) {
    const items = new Map<string, number>();
    let total = 0;
    let last = sales[0].Date;
    for (const s of sales) {
      const product = s.Product ?? "—";
      items.set(product, (items.get(product) ?? 0) + (s.Quantity ?? 0));
      total += s.Total ?? 0;
      if (s.Date > last) last = s.Date;
    }
    const rep = sales[sales.length - 1]; // most recent name/phone/location on file for this customer
    const first = firstSeen.get(key)!;

    customers.push({
      key,
      name: rep.Name?.trim() || "(no name given)",
      phone: phoneDigits(rep.Phone) || null,
      location: rep.Location?.trim() || null,
      items: Array.from(items, ([product, quantity]) => ({ product, quantity })),
      visitsInMonth: sales.length,
      totalSpentInMonth: total,
      firstPurchaseDate: first.Date,
      lastPurchaseDate: last,
      isNew: first.Date >= from && first.Date < to,
    });
  }

  customers.sort((a, b) => (a.lastPurchaseDate < b.lastPurchaseDate ? 1 : -1));
  return { customers, newCount: customers.filter((c) => c.isNew).length };
}
