import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = createClient();

  // Verify the requester is an owner using their own session (anon key,
  // respects RLS) BEFORE touching the admin client. The admin client itself
  // has no concept of "who's asking" — it bypasses RLS entirely, so this
  // check is the only thing standing between "any logged-in user" and
  // "can create arbitrary accounts".
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "owner") {
    return NextResponse.json({ error: "Only owners can create accounts" }, { status: 403 });
  }

  const { email, password, full_name, role, phone, commission_rate } = await request.json();

  if (!email || !password || !full_name || !role) {
    return NextResponse.json({ error: "email, password, full_name, and role are required" }, { status: 400 });
  }
  if (!["owner", "rep"].includes(role)) {
    return NextResponse.json({ error: "role must be 'owner' or 'rep'" }, { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server misconfiguration" },
      { status: 500 }
    );
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // skip email verification — this is an internal tool, not public signup
  });

  if (createError || !created.user) {
    return NextResponse.json({ error: createError?.message ?? "Failed to create account" }, { status: 400 });
  }

  let salesPersonId: string | null = null;

  if (role === "rep") {
    // Every rep needs a SALES_PEOPLE row for RLS scoping (DISTRIBUTION,
    // SALES_COMMISSIONS, SALES.sales_person_id all key off this).
    const { data: salesPerson, error: spError } = await admin
      .from("SALES_PEOPLE")
      .insert({ full_name, phone: phone ?? "", role: "Sales Rep", commission_rate: commission_rate ?? 0, status: "Active" })
      .select()
      .single();

    if (spError) {
      // Roll back the auth user rather than leaving an orphaned login with
      // no profile — better to fail cleanly than half-create an account.
      await admin.auth.admin.deleteUser(created.user.id);
      return NextResponse.json({ error: `Failed to create sales person record: ${spError.message}` }, { status: 400 });
    }
    salesPersonId = salesPerson.id;
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    full_name,
    role,
    sales_person_id: salesPersonId,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: `Failed to create profile: ${profileError.message}` }, { status: 400 });
  }

  return NextResponse.json({ success: true, user_id: created.user.id });
}
