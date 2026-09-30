"use client";

import { Fragment, useMemo, useState } from "react";
import { fmtDate, type B2CCustomer } from "@/lib/customers";
import ActivityLog from "@/components/crm/ActivityLog";
import type { Activity } from "@/lib/crm";

function formatKes(n: number): string {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(n);
}

/** Kenyan numbers are stored digits-only (e.g. 0712345678 or 254712345678) — tel: works with either. */
function telHref(phone: string): string {
  return `tel:${phone.startsWith("0") ? `+254${phone.slice(1)}` : phone.startsWith("254") ? `+${phone}` : phone}`;
}

export default function B2CCustomersTable({ customers, activitiesByCustomer = {} }: { customers: B2CCustomer[]; activitiesByCustomer?: Record<string, Activity[]> }) {
  const [query, setQuery] = useState("");
  const [newOnly, setNewOnly] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter((c) => {
      if (newOnly && !c.isNew) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || (c.phone ?? "").includes(q) || (c.location ?? "").toLowerCase().includes(q);
    });
  }, [customers, query, newOnly]);

  if (customers.length === 0) {
    return <div className="bg-white rounded-card-lg shadow-soft p-6 text-ink-soft text-sm">No B2C (consumer) sales recorded for this month yet.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, phone or location…"
          className="rounded-card border border-cream-deep px-3 py-2 text-sm flex-1 min-w-[14rem]"
        />
        <label className="flex items-center gap-2 text-sm text-ink-soft bg-white shadow-soft rounded-card px-3 py-2">
          <input type="checkbox" checked={newOnly} onChange={(e) => setNewOnly(e.target.checked)} />
          New customers only
        </label>
        <span className="text-xs text-ink-soft ml-auto">
          Showing {filtered.length} of {customers.length}
        </span>
      </div>

      <div className="bg-white rounded-card-lg shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cream-deep text-ink-soft text-left">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Bought</th>
                <th className="px-4 py-3 font-medium text-right">Visits</th>
                <th className="px-4 py-3 font-medium text-right">Spent</th>
                <th className="px-4 py-3 font-medium">Last bought</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <Fragment key={c.key}>
                  <tr className="border-t border-cream-deep align-top">
                    <td className="px-4 py-3 font-medium">
                      {c.name}
                      {c.isNew && <span className="ml-2 text-xs font-semibold bg-gold/20 text-gold-dark rounded-full px-2 py-0.5 whitespace-nowrap">NEW</span>}
                    </td>
                    <td className="px-4 py-3">
                      {c.phone ? (
                        <a href={telHref(c.phone)} className="text-maroon hover:underline whitespace-nowrap">
                          📞 {c.phone}
                        </a>
                      ) : (
                        <span className="text-ink-soft">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{c.location ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-soft">{c.items.map((i) => `${i.product}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`).join(", ")}</td>
                    <td className="px-4 py-3 text-right">{c.visitsInMonth}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatKes(c.totalSpentInMonth)}</td>
                    <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{fmtDate(c.lastPurchaseDate)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button onClick={() => setExpanded(expanded === c.key ? null : c.key)} className="text-xs bg-cream-deep hover:bg-gold/20 rounded-card px-2 py-1">
                        📋 Log
                      </button>
                    </td>
                  </tr>
                  {expanded === c.key && (
                    <tr className="border-t border-cream-deep bg-cream-deep/30">
                      <td className="px-4 py-3" colSpan={8}>
                        <ActivityLog entityType="b2c" entityId={c.key} entityLabel={c.name} activities={activitiesByCustomer[c.key] ?? []} compact />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
