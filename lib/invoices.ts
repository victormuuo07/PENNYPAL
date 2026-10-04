import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Invoices and VAT reporting.
 *
 * The split between "what the business actually earned" and "VAT held for
 * KRA" already exists in the data — AddSaleForm has always computed and
 * stored subtotal (net), vat, and total (gross) separately on INVOICES.
 * What was missing was anywhere that *read* that split back out. Everything
 * here works from INVOICES, not SALES.Total, specifically so VAT is never
 * silently folded back into a "sales" figure.
 */

export type InvoiceItem = { product: string; quantity: number; unit_price: number; line_total: number; sale_id?: string };

export type Invoice = {
  id: string;
  invoice_number: string;
  sale_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  invoice_date: string;
  due_date: string | null;
  subtotal: number;
  vat: number;
  total: number;
  status: string;
  payment_date: string | null;
  notes: string | null;
  items: InvoiceItem[];
};

const COLUMNS = "id, invoice_number, sale_id, customer_name, customer_phone, invoice_date, due_date, subtotal, vat, total, status, payment_date, notes, items";

/** Pages through PostgREST's 1000-row cap so a busy period is never silently truncated. */
export async function fetchInvoices(supabase: SupabaseClient, from: string, to: string): Promise<Invoice[]> {
  const pageSize = 1000;
  let all: Invoice[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("INVOICES")
      .select(COLUMNS)
      .gte("invoice_date", from)
      .lt("invoice_date", to)
      .order("invoice_date", { ascending: true })
      .order("invoice_number", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error || !data) break;
    all = all.concat(data as Invoice[]);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

export async function fetchInvoiceBySaleId(supabase: SupabaseClient, saleId: string): Promise<Invoice | null> {
  const { data } = await supabase.from("INVOICES").select(COLUMNS).eq("sale_id", saleId).maybeSingle();
  return (data as Invoice | null) ?? null;
}

export type VatSummary = { netSales: number; vatCollected: number; grossTotal: number; invoiceCount: number; paidCount: number; unpaidCount: number };

export function summarizeVat(invoices: Invoice[]): VatSummary {
  return invoices.reduce(
    (acc, inv) => ({
      netSales: acc.netSales + (inv.subtotal ?? 0),
      vatCollected: acc.vatCollected + (inv.vat ?? 0),
      grossTotal: acc.grossTotal + (inv.total ?? 0),
      invoiceCount: acc.invoiceCount + 1,
      paidCount: acc.paidCount + (inv.status === "Paid" ? 1 : 0),
      unpaidCount: acc.unpaidCount + (inv.status !== "Paid" ? 1 : 0),
    }),
    { netSales: 0, vatCollected: 0, grossTotal: 0, invoiceCount: 0, paidCount: 0, unpaidCount: 0 }
  );
}

// -------------------------------------------------------------- date utils

export function todayNairobi(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return s;
  return `${m[3]}-${MONTHS[Number(m[2]) - 1] ?? m[2]}-${m[1]}`;
}

export type PeriodKey = "day" | "week" | "month" | "year" | "custom";

/** [from, to) range — `to` is exclusive, matching the `.lt()` query above. Weeks run Monday–Sunday. */
export function periodRange(period: PeriodKey, anchor: string, customFrom?: string, customTo?: string): { from: string; to: string; label: string } {
  const d = new Date(`${anchor}T00:00:00Z`);

  if (period === "day") {
    const to = new Date(d);
    to.setUTCDate(to.getUTCDate() + 1);
    return { from: anchor, to: to.toISOString().slice(0, 10), label: fmtDate(anchor) };
  }
  if (period === "week") {
    const dow = d.getUTCDay() || 7; // Sunday (0) -> 7, so Monday is always day 1
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - (dow - 1));
    const nextMonday = new Date(monday);
    nextMonday.setUTCDate(monday.getUTCDate() + 7);
    const from = monday.toISOString().slice(0, 10);
    const to = nextMonday.toISOString().slice(0, 10);
    const sunday = new Date(nextMonday);
    sunday.setUTCDate(sunday.getUTCDate() - 1);
    return { from, to, label: `${fmtDate(from)} – ${fmtDate(sunday.toISOString().slice(0, 10))}` };
  }
  if (period === "month") {
    const from = `${anchor.slice(0, 7)}-01`;
    const [y, m] = anchor.slice(0, 7).split("-").map(Number);
    const to = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
    const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
    return { from, to, label };
  }
  if (period === "year") {
    const y = Number(anchor.slice(0, 4));
    return { from: `${y}-01-01`, to: `${y + 1}-01-01`, label: String(y) };
  }
  // custom
  const from = customFrom || anchor;
  const toExclusive = new Date(`${customTo || anchor}T00:00:00Z`);
  toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
  return { from, to: toExclusive.toISOString().slice(0, 10), label: `${fmtDate(from)} – ${fmtDate(customTo || anchor)}` };
}
