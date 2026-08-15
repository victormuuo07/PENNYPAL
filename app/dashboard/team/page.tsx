import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CreateUserForm from "./components/CreateUserForm";
import TeamList from "./components/TeamList";

export default async function TeamPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: myProfile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();

  // Belt-and-braces: the sidebar already hides this link from reps, but a
  // rep typing the URL directly should still be bounced — RLS blocks their
  // actual data access either way, this just keeps the UI honest.
  if (myProfile?.role !== "owner") {
    redirect("/dashboard");
  }

  const { data: team } = await supabase
    .from("profiles")
    .select("id, full_name, role, created_at, SALES_PEOPLE(full_name, phone, commission_rate, status)")
    .order("created_at");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-maroon">Team</h1>
        <p className="text-ink-soft text-sm">
          Create accounts and assign who&apos;s an Owner vs a Sales Rep — there&apos;s no public signup, this
          is the only way accounts get created
        </p>
      </div>

      <CreateUserForm />
      <TeamList team={team ?? []} />
    </div>
  );
}
