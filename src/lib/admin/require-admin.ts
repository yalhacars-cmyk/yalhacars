import { getSupabaseServerClient } from "@/lib/supabase/server";

/** Shared by every admin server function — RLS is the real gate, this is defense in depth. */
export async function requireAdmin() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Not authenticated");
  return supabase;
}
