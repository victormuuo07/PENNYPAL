import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// SERVER-ONLY. This uses SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS
// entirely — the same power the old Streamlit app's service key had.
// Only import this file from API routes (app/api/**/route.ts), never from
// a "use client" component or anything that ships to the browser.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Passing undefined here doesn't fail immediately — the client gets
  // created "successfully" and then hangs/times out on the first real
  // request, which is exactly the confusing "took forever then failed
  // with nothing created" behavior this is meant to prevent. Better to
  // fail in milliseconds with a message that says exactly what's missing.
  if (!url || !serviceKey) {
    throw new Error(
      "Missing Supabase admin credentials — NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set in this environment's env vars."
    );
  }

  return createSupabaseClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}
