"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Commission = {
  id: string;
  product_name: string;
  quantity: number;
  total_sale_amount: number;
  commission_amount: number;
  commission_paid: boolean;
  payment_date: string | null;
  created_at: string;
  SALES_PEOPLE: { full_name: string }[] | null;
};

export default function CommissionsTable({
  commissions,
  isOwner,
}: {
  commissions: Commission[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [updating, setUpdating] = useState<string | null>(null);

  async function markPaid(id: string) {
    setUpdating(id);
    await supabase
      .from("SALES_COMMISSIONS")
      .update({ commission_paid: true, payment_date: new Date().toISOString().slice(0, 10) })
      .eq("id", id);
    setUpdating(null);
    router.refresh();
  }

  if (commissions.length === 0) {
    return (
      <div className="bg-white rounded-card-lg shadow-soft p-6 text-ink-soft text-sm">
        No commission records yet.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-card-lg shadow-soft overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-cream-deep text-ink-soft text-left">
            {isOwner && <th className="px-4 py-3 font-medium">Rep</th>}
            <th className="px-4 py-3 font-medium">Product</th>
            <th className="px-4 py-3 font-medium text-right">Qty</th>
            <th className="px-4 py-3 font-medium text-right">Sale Amount</th>
            <th className="px-4 py-3 font-medium text-right">Commission</th>
            <th className="px-4 py-3 font-medium">Status</th>
            {isOwner && <th className="px-4 py-3 font-medium"></th>}
          </tr>
        </thead>
        <tbody>
          {commissions.map((c) => (
            <tr key={c.id} className="border-t border-cream-deep">
              {isOwner && <td className="px-4 py-3">{c.SALES_PEOPLE?.[0]?.full_name ?? "—"}</td>}
              <td className="px-4 py-3">{c.product_name}</td>
              <td className="px-4 py-3 text-right">{c.quantity}</td>
              <td className="px-4 py-3 text-right text-ink-soft">
                KES {c.total_sale_amount?.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right font-medium">KES {c.commission_amount?.toLocaleString()}</td>
              <td className="px-4 py-3">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    c.commission_paid ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"
                  }`}
                >
                  {c.commission_paid ? `Paid ${c.payment_date ?? ""}` : "Pending"}
                </span>
              </td>
              {isOwner && (
                <td className="px-4 py-3">
                  {!c.commission_paid && (
                    <button
                      onClick={() => markPaid(c.id)}
                      disabled={updating === c.id}
                      className="text-xs bg-maroon hover:bg-red text-cream rounded-card px-3 py-1 disabled:opacity-60"
                    >
                      {updating === c.id ? "…" : "Mark paid"}
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
