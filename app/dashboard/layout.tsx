import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? "rep";

  return (
    <div className="flex min-h-screen">
      <Sidebar role={role} name={profile?.full_name ?? user.email ?? ""} />
      <main className="flex-1 p-4 pt-20 md:p-8 md:pt-8 min-w-0">{children}</main>
    </div>
  );
}
