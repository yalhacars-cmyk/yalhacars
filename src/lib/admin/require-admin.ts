import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * True only for users whose `app_metadata.role` is "admin". app_metadata can
 * only be written with the service role / from the Supabase dashboard, never
 * by the user, so a customer who signs up (website or mobile app) is not an
 * admin. Must match `public.is_admin()` in supabase/security_hardening.sql.
 */
export function isAdminUser(user: { app_metadata?: Record<string, unknown> | null } | null | undefined) {
  return user?.app_metadata?.["role"] === "admin";
}

/** Shared by every admin server function. The database enforces the same rule (RLS) as defense in depth. */
export async function requireAdmin() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Not authenticated");
  if (!isAdminUser(data.user)) throw new Error("Not authorized");
  return supabase;
}
