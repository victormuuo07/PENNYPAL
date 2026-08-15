import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// SERVER-ONLY. This uses SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS
// entirely — the same power the old Streamlit app's service key had.
// Only import this file from API routes (app/api/**/route.ts), never from
// a "use client" component or anything that ships to the browser.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
