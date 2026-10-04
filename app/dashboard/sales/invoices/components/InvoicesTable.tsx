"use client";

import { buildInvoicePdf } from "@/lib/invoicePdf";
import { fmtDate, type Invoice } from "@/lib/invoices";

export default function InvoicesTable({ invoices }: { invoices: Invoice[] }) {
  if (invoices.length === 0) {
    return <div className="bg-white rounded-card-lg shadow-soft p-6 text-ink-soft text-sm">No invoices in this period.</div>;
  }

  function download(inv: Invoice) {
    buildInvoicePdf(inv).save(`${inv.invoice_number}.pdf`);
  }

  return (
    <div className="bg-white rounded-card-lg shadow-soft overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-cream-deep text-ink-soft text-left">
              <th className="px-4 py-3 font-medium">Invoice #</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium text-right">Net (excl. VAT)</th>
              <th className="px-4 py-3 font-medium text-right">VAT</th>
              <th className="px-4 py-3 font-medium text-right">Total</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-t border-cream-deep">
                <td className="px-4 py-3 font-mono text-xs">{inv.invoice_number}</td>
                <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{fmtDate(inv.invoice_date)}</td>
                <td className="px-4 py-3">{inv.customer_name?.trim() || "Walk-in"}</td>
                <td className="px-4 py-3 text-right">KES {inv.subtotal.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-ink-soft">KES {inv.vat.toLocaleString()}</td>
                <td className="px-4 py-3 text-right font-medium">KES {inv.total.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${inv.status === "Paid" ? "bg-green-50 text-green-700" : "bg-gold/10 text-gold-dark"}`}>{inv.status}</span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <button onClick={() => download(inv)} className="text-xs bg-cream-deep hover:bg-gold/20 rounded-card px-2.5 py-1">
                    ⬇ Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
