"use client";

import { useState } from "react";
import { buildInvoiceBatchPdf } from "@/lib/invoicePdf";
import type { Invoice } from "@/lib/invoices";

export default function DownloadAllButton({ invoices, periodLabel }: { invoices: Invoice[]; periodLabel: string }) {
  const [building, setBuilding] = useState(false);

  async function handle() {
    if (invoices.length === 0) return;
    setBuilding(true);
    // Let the "Building…" state paint before the (synchronous) PDF build
    // runs — jsPDF can take a moment for a few hundred invoices.
    await new Promise((r) => setTimeout(r, 0));
    const doc = buildInvoiceBatchPdf(invoices, periodLabel);
    const safeName = periodLabel.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    doc.save(`invoices-${safeName}.pdf`);
    setBuilding(false);
  }

  return (
    <button
      onClick={handle}
      disabled={invoices.length === 0 || building}
      className="bg-maroon hover:bg-red text-cream rounded-card px-4 py-2 text-sm font-medium disabled:opacity-60"
    >
      {building ? "Building PDF…" : `⬇ Download all ${invoices.length > 0 ? `(${invoices.length}) ` : ""}as PDF`}
    </button>
  );
}
