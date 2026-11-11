import { createClient } from "@supabase/supabase-js";

/**
 * SERVICE-ROLE Supabase client — bypasses Row Level Security entirely.
 *
 * One business, one Supabase project, one account system — but this repo is
 * only one of the clients writing to it (profiles/orders/favorites/etc. are
 * defined by a separate companion codebase, not this one). Its live RLS on
 * `public.cars` only lets a row's own submitter (or the public, for
 * approved rows) read it — there is no "admin" carve-out — so the admin
 * inventory panel can't see pending seller listings through the normal
 * authenticated client. This client is the standard fix: it has NO
 * authorization of its own, so every call site MUST gate access with
 * `requireAdmin()` first. Server-only — never import this from a route
 * component or anything else reachable from the browser.
 */
export function getSupabaseAdminClient() {
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(import.meta.env["VITE_SUPABASE_URL"], key, {
    auth: { persistSession: false },
  });
}
