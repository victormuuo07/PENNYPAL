import { jsPDF } from "jspdf";
import { fmtDate, summarizeVat, type Invoice, type VatSummary } from "./invoices";

// Fill in your actual KRA PIN once you have it — it's required on a real
// tax invoice in Kenya. Left as a placeholder rather than guessed, since a
// wrong PIN on a document handed to a customer is worse than a visible gap.
const BUSINESS = {
  name: "SpiseUp Africa",
  subtitle: "Betarlux Skincare Innovation Hub / Riaor Industries Ltd",
  address: "Kitengela, Kajiado County, Kenya",
  kraPin: "P0__________ (add your KRA PIN in lib/invoicePdf.ts)",
};

function money(n: number): string {
  return `KES ${Math.round(n).toLocaleString()}`;
}

/** Draws one invoice starting at the current page position. Returns the doc for chaining. */
function drawInvoice(doc: jsPDF, inv: Invoice): jsPDF {
  const left = 15;
  let y = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(BUSINESS.name, left, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  y += 6;
  doc.text(BUSINESS.subtitle, left, y);
  y += 4.5;
  doc.text(BUSINESS.address, left, y);
  y += 4.5;
  doc.text(`KRA PIN: ${BUSINESS.kraPin}`, left, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("TAX INVOICE", 195, 18, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Invoice #: ${inv.invoice_number}`, 195, 25, { align: "right" });
  doc.text(`Date: ${fmtDate(inv.invoice_date)}`, 195, 30, { align: "right" });
  if (inv.due_date) doc.text(`Due: ${fmtDate(inv.due_date)}`, 195, 35, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.text(inv.status === "Paid" ? "PAID" : "UNPAID", 195, 41, { align: "right" });
  doc.setFont("helvetica", "normal");

  y = 48;
  doc.setDrawColor(200);
  doc.line(left, y, 195, y);
  y += 7;

  doc.setFont("helvetica", "bold");
  doc.text("Bill To", left, y);
  doc.setFont("helvetica", "normal");
  y += 5.5;
  doc.text(inv.customer_name?.trim() || "Walk-in customer", left, y);
  if (inv.customer_phone) {
    y += 5;
    doc.text(inv.customer_phone, left, y);
  }

  y += 10;
  const colX = { product: left, qty: 125, price: 145, lineTotal: 170 };
  doc.setFillColor(245, 240, 230);
  doc.rect(left, y - 5, 180, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Product", colX.product + 2, y);
  doc.text("Qty", colX.qty, y);
  doc.text("Unit Price", colX.price, y);
  doc.text("Line Total", colX.lineTotal, y);
  doc.setFont("helvetica", "normal");
  y += 7;

  for (const item of inv.items ?? []) {
    doc.text(String(item.product).slice(0, 55), colX.product + 2, y);
    doc.text(String(item.quantity), colX.qty, y);
    doc.text(money(item.unit_price), colX.price, y);
    doc.text(money(item.line_total), colX.lineTotal, y);
    y += 6;
  }

  y += 4;
  doc.line(130, y, 195, y);
  y += 6;
  doc.text("Subtotal (excl. VAT)", 130, y);
  doc.text(money(inv.subtotal), 195, y, { align: "right" });
  y += 6;
  doc.text("VAT (16%)", 130, y);
  doc.text(money(inv.vat), 195, y, { align: "right" });
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Total", 130, y);
  doc.text(money(inv.total), 195, y, { align: "right" });
  doc.setFont("helvetica", "normal");

  if (inv.notes) {
    y += 12;
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(inv.notes, left, y);
    doc.setTextColor(0);
  }

  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text("Generated from PennyPal", left, 287);
  doc.setTextColor(0);

  return doc;
}

export function buildInvoicePdf(inv: Invoice): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  drawInvoice(doc, inv);
  return doc;
}

function drawVatSummaryCover(doc: jsPDF, periodLabel: string, summary: VatSummary): void {
  const left = 15;
  let y = 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(BUSINESS.name, left, y);
  y += 10;
  doc.setFontSize(14);
  doc.text("VAT & Sales Summary", left, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y += 7;
  doc.text(periodLabel, left, y);
  y += 12;

  const rows: [string, string][] = [
    ["Net sales (excl. VAT)", money(summary.netSales)],
    ["VAT collected (payable to KRA)", money(summary.vatCollected)],
    ["Gross total invoiced", money(summary.grossTotal)],
    ["Invoices in this period", String(summary.invoiceCount)],
    ["Paid / Unpaid", `${summary.paidCount} / ${summary.unpaidCount}`],
  ];
  for (const [label, value] of rows) {
    doc.setFont("helvetica", "normal");
    doc.text(label, left, y);
    doc.setFont("helvetica", "bold");
    doc.text(value, 195, y, { align: "right" });
    y += 8;
  }

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text("KRA VAT returns are due by the 20th of the month following the tax period. Net sales and VAT above are taken directly", left, y);
  y += 4.5;
  doc.text("from each invoice's stored subtotal/VAT split, not estimated.", left, y);
  doc.setTextColor(0);
}

/** One cover page with the period's VAT summary, then one page per invoice in date order. */
export function buildInvoiceBatchPdf(invoices: Invoice[], periodLabel: string): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const summary = summarizeVat(invoices);
  drawVatSummaryCover(doc, periodLabel, summary);

  for (const inv of invoices) {
    doc.addPage();
    drawInvoice(doc, inv);
  }
  return doc;
}
