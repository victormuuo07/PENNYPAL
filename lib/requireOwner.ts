import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Call at the top of any owner-only page. Redirects reps to /dashboard
 * instead of letting them load a page that just renders empty because RLS
 * silently blocked every query — a rep typing the URL directly (nav link
 * being hidden doesn't stop that) gets a clean redirect, not a broken page.
 */
export async function requireOwner() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (profile?.role !== "owner") {
    redirect("/dashboard");
  }
}
