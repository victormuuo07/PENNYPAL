"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const PRODUCTS: Record<string, { price: number; unit: string }> = {
  "Sachet - 5 KES": { price: 5, unit: "sachet" },
  "Sachet - 20 KES": { price: 20, unit: "sachet" },
  "Sachet - 40 KES": { price: 40, unit: "sachet" },
  "Bottle (100g New)": { price: 150, unit: "bottle" },
  "Bottle (100g Refill)": { price: 120, unit: "bottle" },
  "Bottle (60g Refill)": { price: 80, unit: "bottle" },
  "Bottle (30g Refill)": { price: 50, unit: "bottle" },
};

const CUSTOMER_TYPES = ["Consumer (B2C)", "Shop/Mama Mboga (B2B)", "Hotel/Restaurant"];
const VAT_RATE = 0.16; // Kenya standard VAT — matches the INVOICES.vat field, so this lines up
// with what eTIMS will eventually expect once real KRA credentials are wired in.

let invoiceCounter = 0;
function nextInvoiceNumber() {
  invoiceCounter += 1;
  return `INV-${Date.now().toString().slice(-6)}-${invoiceCounter}`;
}

export default function AddSaleForm({
  salesPersonId,
  salesPersonName,
  hotels,
  mamas,
}: {
  salesPersonId: string | null;
  salesPersonName: string;
  hotels: { id: string; hotel_name: string }[];
  mamas: { id: string; shop_name: string }[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    Name: "",
    Phone: "",
    Location: "",
    Product: Object.keys(PRODUCTS)[0],
    Customer_Type: CUSTOMER_TYPES[0],
    hotel_id: "",
    mama_id: "",
    Quantity: 1,
    Payment_Status: "Paid",
    amount_paid: 0,
    due_date: "",
    sale_date: new Date().toISOString().slice(0, 10),
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const isHotelSale = form.Customer_Type === "Hotel/Restaurant";
  const isMamaSale = form.Customer_Type === "Shop/Mama Mboga (B2B)";

  const unitPrice = PRODUCTS[form.Product].price;
  const subtotal = useMemo(() => unitPrice * form.Quantity, [unitPrice, form.Quantity]);
  const vat = useMemo(() => Math.round(subtotal * VAT_RATE), [subtotal]);
  const total = subtotal + vat;
  const isCredit = form.Payment_Status === "Credit";
  const balanceDue = isCredit ? total - form.amount_paid : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const today = form.sale_date;
    const invoiceNumber = nextInvoiceNumber();

    const { data: sale, error: saleError } = await supabase
      .from("SALES")
      .insert({
        Date: today,
        Name: form.Name,
        Phone: form.Phone.replace(/\D/g, "") ? Number(form.Phone.replace(/\D/g, "")) : null,
        Location: form.Location,
        Product: form.Product,
        Product_Type: form.Product,
        Customer_Type: form.Customer_Type,
        Quantity: form.Quantity,
        Price_per_Unit: unitPrice,
        Total: total,
        Payment_Status: form.Payment_Status,
        amount_paid: isCredit ? form.amount_paid : total,
        due_date: isCredit ? form.due_date || null : null,
        sales_person_id: salesPersonId,
        Tracking_Hotel: isHotelSale && form.hotel_id ? hotels.find((h) => h.id === form.hotel_id)?.hotel_name : null,
        Tracking_Mama: isMamaSale && form.mama_id ? mamas.find((m) => m.id === form.mama_id)?.shop_name : null,
      })
      .select()
      .single();

    if (saleError) {
      setError(saleError.message);
      setSaving(false);
      return;
    }

    // This is the point of linking a sale to a tracked hotel/mama at all:
    // one entry here also feeds Distribution's refill/purchase history, so
    // there's no need to separately go re-enter the same transaction there.
    if (isHotelSale && form.hotel_id) {
      await supabase.from("HOTEL_REFILLS").insert({
        hotel_id: form.hotel_id,
        refill_date: today,
        product_type: form.Product,
        quantity: form.Quantity,
        amount_paid: total,
        payment_status: form.Payment_Status,
        notes: `Auto-logged from Sales (sold by ${salesPersonName || "owner"})`,
      });
    }
    if (isMamaSale && form.mama_id) {
      await supabase.from("MAMA_MBOGAS_PURCHASES").insert({
        mama_id: form.mama_id,
        purchase_date: today,
        product_type: form.Product,
        quantity: form.Quantity,
        unit_price: unitPrice,
        total_amount: total,
        payment_status: form.Payment_Status,
      });
    }

    // Invoice-style record alongside the sale — this is the shape that'll
    // feed eTIMS once real KRA/eTIMS device credentials are set up. Not
    // submitted anywhere yet, just structured correctly from day one.
    const { error: invoiceError } = await supabase.from("INVOICES").insert({
      invoice_number: invoiceNumber,
      customer_name: form.Name,
      customer_phone: form.Phone,
      invoice_date: today,
      due_date: isCredit ? form.due_date || null : today,
      subtotal,
      vat,
      total,
      status: isCredit ? "Unpaid" : "Paid",
      payment_date: isCredit ? null : today,
      notes: salesPersonName ? `Sold by ${salesPersonName}` : "",
      items: [
        {
          product: form.Product,
          quantity: form.Quantity,
          unit_price: unitPrice,
          line_total: subtotal,
          sale_id: sale?.id,
        },
      ],
    });

    setSaving(false);
    if (invoiceError) {
      setError(`Sale saved but invoice failed: ${invoiceError.message}`);
    } else {
      setOpen(false);
      setForm({
        ...form,
        Name: "",
        Phone: "",
        Location: "",
        Quantity: 1,
        amount_paid: 0,
        due_date: "",
        hotel_id: "",
        mama_id: "",
        sale_date: new Date().toISOString().slice(0, 10),
      });
      router.refresh();
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-maroon hover:bg-red text-cream rounded-card px-4 py-2 text-sm font-medium transition-colors"
      >
        + New Sale (Invoice)
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-card-lg shadow-soft overflow-hidden">
      <div className="bg-maroon text-cream px-6 py-4 flex items-center justify-between">
        <div>
          <div className="font-semibold">🧾 New Sale — Invoice</div>
          <div className="text-xs text-cream-deep">SpiseUp • {new Date().toLocaleDateString()}</div>
        </div>
        {salesPersonName && <div className="text-xs">Sold by: {salesPersonName}</div>}
      </div>

      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            placeholder="Customer name"
            required
            value={form.Name}
            onChange={(e) => update("Name", e.target.value)}
            className="rounded-card border border-cream-deep px-3 py-2 text-sm"
          />
          <input
            placeholder="Phone"
            value={form.Phone}
            onChange={(e) => update("Phone", e.target.value)}
            className="rounded-card border border-cream-deep px-3 py-2 text-sm"
          />
          <input
            placeholder="Location"
            value={form.Location}
            onChange={(e) => update("Location", e.target.value)}
            className="rounded-card border border-cream-deep px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select
            value={form.Customer_Type}
            onChange={(e) => update("Customer_Type", e.target.value)}
            className="rounded-card border border-cream-deep px-3 py-2 text-sm"
          >
            {CUSTOMER_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <label className="text-xs text-ink-soft">
            Sale date
            <input
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={form.sale_date}
              onChange={(e) => update("sale_date", e.target.value)}
              className="w-full mt-1 rounded-card border border-cream-deep px-3 py-2 text-sm"
            />
          </label>
        </div>

        {isHotelSale && (
          <div>
            <label className="text-xs text-ink-soft">
              Which tracked hotel? (optional — links this sale to Distribution's refill history)
              <select
                value={form.hotel_id}
                onChange={(e) => update("hotel_id", e.target.value)}
                className="w-full mt-1 rounded-card border border-cream-deep px-3 py-2 text-sm"
              >
                <option value="">— Not tracked / one-off —</option>
                {hotels.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.hotel_name}
                  </option>
                ))}
              </select>
            </label>
            {form.hotel_id && (
              <p className="text-xs text-green-700 mt-1">
                ✅ This will also log a refill for this hotel — no need to enter it again on Distribution.
              </p>
            )}
          </div>
        )}

        {isMamaSale && (
          <div>
            <label className="text-xs text-ink-soft">
              Which tracked Mama Mboga/shop? (optional — links this sale to Distribution's purchase history)
              <select
                value={form.mama_id}
                onChange={(e) => update("mama_id", e.target.value)}
                className="w-full mt-1 rounded-card border border-cream-deep px-3 py-2 text-sm"
              >
                <option value="">— Not tracked / one-off —</option>
                {mamas.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.shop_name}
                  </option>
                ))}
              </select>
            </label>
            {form.mama_id && (
              <p className="text-xs text-green-700 mt-1">
                ✅ This will also log a purchase for this shop — no need to enter it again on Distribution.
              </p>
            )}
          </div>
        )}

        <div className="border border-cream-deep rounded-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cream-deep text-ink-soft text-left">
                <th className="px-3 py-2 font-medium">Item</th>
                <th className="px-3 py-2 font-medium text-right">Qty</th>
                <th className="px-3 py-2 font-medium text-right">Unit Price</th>
                <th className="px-3 py-2 font-medium text-right">Line Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-cream-deep">
                <td className="px-3 py-2">
                  <select
                    value={form.Product}
                    onChange={(e) => update("Product", e.target.value)}
                    className="w-full border-none text-sm bg-transparent"
                  >
                    {Object.keys(PRODUCTS).map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={1}
                    value={form.Quantity}
                    onChange={(e) => update("Quantity", Number(e.target.value))}
                    className="w-16 text-right border border-cream-deep rounded px-2 py-1"
                  />
                </td>
                <td className="px-3 py-2 text-right text-ink-soft">KES {unitPrice}</td>
                <td className="px-3 py-2 text-right font-medium">KES {subtotal.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <div className="w-full sm:w-64 text-sm space-y-1">
            <div className="flex justify-between text-ink-soft">
              <span>Subtotal</span>
              <span>KES {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-ink-soft">
              <span>VAT (16%)</span>
              <span>KES {vat.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-semibold text-maroon border-t border-cream-deep pt-1">
              <span>Total</span>
              <span>KES {total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select
            value={form.Payment_Status}
            onChange={(e) => update("Payment_Status", e.target.value)}
            className="rounded-card border border-cream-deep px-3 py-2 text-sm"
          >
            <option>Paid</option>
            <option>Credit</option>
          </select>
          {isCredit && (
            <>
              <input
                type="number"
                min={0}
                placeholder="Amount paid now (KES)"
                value={form.amount_paid}
                onChange={(e) => update("amount_paid", Number(e.target.value))}
                className="rounded-card border border-cream-deep px-3 py-2 text-sm"
              />
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => update("due_date", e.target.value)}
                className="rounded-card border border-cream-deep px-3 py-2 text-sm"
              />
            </>
          )}
        </div>
        {isCredit && (
          <p className="text-sm text-orange-700">
            ⚠️ Balance due: KES {balanceDue.toLocaleString()} — this shows up on the Credit Tracker below,
            and once messaging automation is wired up it can trigger a reminder SMS as the due date nears.
          </p>
        )}

        {error && <p className="text-red-bright text-sm">{error}</p>}

        <div className="flex gap-2 justify-end pt-2 border-t border-cream-deep">
          <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-ink-soft">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-maroon hover:bg-red text-cream rounded-card px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {saving ? "Saving…" : "💾 Save sale & generate invoice"}
          </button>
        </div>
      </div>
    </form>
  );
}
