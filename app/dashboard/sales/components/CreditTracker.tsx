"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type CreditSale = {
  id: string;
  Date: string;
  Name: string;
  Phone: number | null;
  Total: number;
  amount_paid: number | null;
  due_date: string | null;
};

export default function CreditTracker({ sales }: { sales: CreditSale[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [isOwner, setIsOwner] = useState(false);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Only owners can update SALES (database rule), so only owners get the button.
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      setIsOwner(profile?.role === "owner");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function recordPayment(s: CreditSale & { balance: number }) {
    const entered = Number(amounts[s.id] ?? s.balance);
    if (!entered || entered <= 0) {
      setMessage("Enter an amount greater than 0.");
      return;
    }
    if (entered > s.balance) {
      setMessage(`That is more than the balance (KES ${s.balance.toLocaleString()}).`);
      return;
    }

    setBusyId(s.id);
    setMessage(null);

    const newPaid = (s.amount_paid ?? 0) + entered;
    const fullyPaid = newPaid >= (s.Total ?? 0);

    const { error } = await supabase
      .from("SALES")
      .update({ amount_paid: newPaid, Payment_Status: fullyPaid ? "Paid" : "Credit" })
      .eq("id", s.id);

    if (error) {
      setMessage(`Could not record payment: ${error.message}`);
      setBusyId(null);
      return;
    }

    // Keep the linked invoice in step, so the Invoices & VAT page shows it as paid too.
    if (fullyPaid) {
      const { error: invError } = await supabase
        .from("INVOICES")
        .update({ status: "Paid", payment_date: new Date().toISOString().slice(0, 10) })
        .eq("sale_id", s.id);
      if (invError) {
        setMessage(`Payment saved, but the invoice was not marked paid: ${invError.message}`);
      }
    }

    setAmounts((a) => {
      const { [s.id]: _removed, ...rest } = a;
      return rest;
    });
    setBusyId(null);
    router.refresh();
  }

  const outstanding = sales
    .filter((s) => (s.Total ?? 0) - (s.amount_paid ?? 0) > 0)
    .map((s) => ({ ...s, balance: (s.Total ?? 0) - (s.amount_paid ?? 0) }))
    .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));

  if (outstanding.length === 0) return null;

  const totalOwed = outstanding.reduce((sum, s) => sum + s.balance, 0);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="bg-white rounded-card-lg shadow-soft p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-medium text-ink">💳 Credit Tracker</h2>
        <span className="text-sm font-medium text-orange-700">
          KES {totalOwed.toLocaleString()} outstanding
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-cream-deep text-ink-soft text-left">
              <th className="px-3 py-2 font-medium">Customer</th>
              <th className="px-3 py-2 font-medium">Phone</th>
              <th className="px-3 py-2 font-medium text-right">Balance</th>
              <th className="px-3 py-2 font-medium">Due</th>
              {isOwner && <th className="px-3 py-2 font-medium">Record payment</th>}
            </tr>
          </thead>
          <tbody>
            {outstanding.map((s) => {
              const overdue = s.due_date && s.due_date < today;
              return (
                <tr key={s.id} className="border-t border-cream-deep">
                  <td className="px-3 py-2">{s.Name}</td>
                  <td className="px-3 py-2 text-ink-soft">{s.Phone ?? "—"}</td>
                  <td className="px-3 py-2 text-right font-medium text-orange-700">
                    KES {s.balance.toLocaleString()}
                  </td>
                  <td className={`px-3 py-2 ${overdue ? "text-red-bright font-medium" : "text-ink-soft"}`}>
                    {s.due_date ?? "—"} {overdue && "⚠️ Overdue"}
                  </td>
                  {isOwner && (
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={s.balance}
                          value={amounts[s.id] ?? s.balance}
                          onChange={(e) => setAmounts((a) => ({ ...a, [s.id]: e.target.value }))}
                          className="w-28 rounded-card border border-cream-deep px-2 py-1 text-sm"
                        />
                        <button
                          type="button"
                          disabled={busyId === s.id}
                          onClick={() => recordPayment(s)}
                          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-card px-3 py-1 text-sm font-medium whitespace-nowrap"
                        >
                          {busyId === s.id ? "Saving…" : "✓ Mark paid"}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {message && <p className="text-sm text-red-bright mt-3">{message}</p>}
      <p className="text-xs text-ink-soft mt-3">
        Once Customer Messaging is connected to a contact for these customers, overdue balances here can
        trigger a reminder SMS automatically — that wiring isn&apos;t built yet.
      </p>
    </div>
  );
}
