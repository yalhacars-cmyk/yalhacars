import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/require-admin";

/**
 * Admin-only reads/writes for the `leads` inbox. RLS only grants SELECT/
 * UPDATE to the `authenticated` role, so these must go through the server
 * client (cookie session), not the plain anon browser client — mirrors
 * src/lib/admin/cars.ts.
 */

export const listLeadsFn = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const updateLeadStatusFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid(), status: z.enum(["new", "contacted", "closed"]) }))
  .handler(async ({ data }) => {
    const supabase = await requireAdmin();
    const { error } = await supabase
      .from("leads")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { id: data.id };
  });
