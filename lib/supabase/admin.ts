import { createClient } from "@supabase/supabase-js";

// SERVER-ONLY. Uses the service-role key, which bypasses RLS.
if (typeof window !== "undefined") {
  throw new Error("lib/supabase/admin must never be imported client-side.");
}

export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
