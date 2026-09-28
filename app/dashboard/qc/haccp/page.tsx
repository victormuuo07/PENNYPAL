import Link from "next/link";
import { requireOwner } from "@/lib/requireOwner";
import { HACCP_PLAN, RECORD_TYPE_MAP } from "@/lib/qc/config";
import PrintButton from "../components/PrintButton";

export const dynamic = "force-dynamic";

export default async function HaccpPlanPage() {
  await requireOwner();
  const th = "px-3 py-2 text-left font-medium";
  const td = "px-3 py-2 align-top border-t border-cream-deep";

  return (
    <div className="space-y-6">
      <style>{`@media print{@page{size:A4 landscape;margin:12mm}}`}</style>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/qc" className="text-xs text-ink-soft hover:text-maroon print:hidden">
            ← Quality & HACCP
          </Link>
          <h1 className="text-2xl font-semibold text-maroon mt-1">HACCP-Based Food Safety Plan</h1>
          <p className="text-ink-soft text-sm">SpiseUp Africa · Betarlux Skincare Innovation Hub / Riaor Industries Ltd — Kitengela, Kajiado County</p>
        </div>
        <PrintButton />
      </div>

      <section className="bg-white rounded-card-lg shadow-soft p-6">
        <h2 className="text-lg font-medium text-ink mb-3">Product description</h2>
        <table className="w-full text-sm">
          <tbody>
            {HACCP_PLAN.product.map(([k, v]) => (
              <tr key={k}>
                <td className={`${td} font-medium w-48 first:border-t-0`}>{k}</td>
                <td className={td}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="bg-white rounded-card-lg shadow-soft p-6">
        <h2 className="text-lg font-medium text-ink mb-3">Process flow</h2>
        <ol className="list-decimal pl-5 space-y-1 text-sm">
          {HACCP_PLAN.processFlow.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </section>

      <section className="bg-white rounded-card-lg shadow-soft p-6 overflow-x-auto">
        <h2 className="text-lg font-medium text-ink mb-3">Hazard analysis</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-cream-deep text-ink-soft">
              {["Process step", "Biological hazard", "Chemical hazard", "Physical hazard"].map((h) => (
                <th key={h} className={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HACCP_PLAN.hazards.map((row) => (
              <tr key={row[0]}>
                {row.map((c, i) => (
                  <td key={i} className={`${td} ${i === 0 ? "font-medium" : ""}`}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="bg-white rounded-card-lg shadow-soft p-6 overflow-x-auto">
        <h2 className="text-lg font-medium text-ink mb-1">Critical Control Points</h2>
        <p className="text-xs text-ink-soft mb-3">
          Critical limits are enforced automatically in the app: a moisture reading above the limit forces the In-Process result to Fail, and a foreign body / metal detection forces the Final QC result to Fail. Edit limits in <code>lib/qc/config.ts</code>.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-cream-deep text-ink-soft">
              {["CCP", "Step", "Hazard controlled", "Critical limit", "Monitoring", "Corrective action", "Verification"].map((h) => (
                <th key={h} className={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HACCP_PLAN.ccps.map((c) => (
              <tr key={c.id}>
                <td className={`${td} font-semibold text-maroon`}>{c.id}</td>
                <td className={td}>{c.step}</td>
                <td className={td}>{c.hazard}</td>
                <td className={td}>{c.limit}</td>
                <td className={td}>
                  {c.monitoring}{" "}
                  <Link href={`/dashboard/qc/${c.recordType}`} className="text-maroon hover:underline print:hidden">
                    → open log
                  </Link>
                </td>
                <td className={td}>{c.corrective}</td>
                <td className={td}>{c.verification}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="bg-white rounded-card-lg shadow-soft p-6">
        <h2 className="text-lg font-medium text-ink mb-3">Prerequisite programmes</h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-sm">
          {HACCP_PLAN.prps.map(([label, type]) => (
            <li key={type}>
              •{" "}
              <Link href={`/dashboard/qc/${type}`} className="hover:underline hover:text-maroon">
                {label}
              </Link>{" "}
              <span className="text-ink-soft text-xs">({RECORD_TYPE_MAP[type]?.frequency})</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-white rounded-card-lg shadow-soft p-6">
        <h2 className="text-lg font-medium text-ink mb-3">Verification & review</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          {HACCP_PLAN.verification.map((v) => (
            <li key={v}>{v}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
