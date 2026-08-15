import { createClient } from "@/lib/supabase/server";
import ExpensesTable from "./components/ExpensesTable";
import AddExpenseForm from "./components/AddExpenseForm";

export default async function ExpensesPage() {
  const supabase = createClient();
  const { data: expenses } = await supabase
    .from("EXPENSES")
    .select("*")
    .order("date", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-maroon">Expenses</h1>
        <p className="text-ink-soft text-sm">Track business spending</p>
      </div>

      <AddExpenseForm />
      <ExpensesTable expenses={expenses ?? []} />
    </div>
  );
}
