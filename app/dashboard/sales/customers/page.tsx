import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { currentMonth, fetchB2CCustomers, isValidMonth, monthLabel } from "@/lib/customers";
import CustomerMonthPicker from "./components/CustomerMonthPicker";
import B2CCustomersTable from "./components/B2CCustomersTable";

export const dynamic = "force-dynamic";

export default async function B2CCustomersPage({ searchParams }: { searchParams: { month?: string } }) {
  const supabase = createClient();
  const month = isValidMonth(searchParams.month) ? searchParams.month : currentMonth();

  // RLS on SALES does the access scoping for us: owners get every B2C
  // customer, reps only get customers from their own sales.
  const { customers, newCount } = await fetchB2CCustomers(supabase, month);
  const totalSpent = customers.reduce((sum, c) => sum + c.totalSpentInMonth, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/sales" className="text-xs text-ink-soft hover:text-maroon">
            ← Sales
          </Link>
          <h1 className="text-2xl font-semibold text-maroon mt-1">B2C Customers to Call</h1>
          <p className="text-ink-soft text-sm">Individual consumers only — shops and hotels are tracked separately in Distribution.</p>
        </div>
        <CustomerMonthPicker basePath="/dashboard/sales/customers" month={month} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-card-lg shadow-soft p-5">
          <div className="text-xs text-ink-soft uppercase tracking-wide">New customers</div>
          <div className="text-2xl font-semibold text-maroon">{newCount}</div>
          <div className="text-xs text-ink-soft">first bought in {monthLabel(month)}</div>
        </div>
        <div className="bg-white rounded-card-lg shadow-soft p-5">
          <div className="text-xs text-ink-soft uppercase tracking-wide">B2C customers this month</div>
          <div className="text-2xl font-semibold text-maroon">{customers.length}</div>
          <div className="text-xs text-ink-soft">{customers.filter((c) => !c.isNew).length} returning</div>
        </div>
        <div className="bg-white rounded-card-lg shadow-soft p-5">
          <div className="text-xs text-ink-soft uppercase tracking-wide">Total spent (B2C)</div>
          <div className="text-2xl font-semibold text-maroon">KES {totalSpent.toLocaleString()}</div>
          <div className="text-xs text-ink-soft">{monthLabel(month)}</div>
        </div>
      </div>

      <B2CCustomersTable customers={customers} />
    </div>
  );
}
