import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * The signed-in visitor's own `dealer_stores` row — a separate table from
 * `profiles` (see supabase/add_dealer_store.sql-era profiles.store_name for
 * the OLD design this replaces). One row per user, own storefront branding
 * (name + logo) with its own pending/approved/rejected lifecycle, gated by
 * the live `protect_dealer_store_status_trigger` (public.dealer_stores):
 * a non-service-role write can never change `status` in either direction —
 * only src/lib/admin/customers.ts's setDealerStoreStatusFn (service role)
 * can. So this file never attempts to set `status` at all; the column
 * default ('pending') covers the first insert, and edits after that leave
 * status exactly as the trigger already enforces.
 *
 * Plain authenticated client throughout — RLS already grants a user full
 * access to their own row ("Users manage their own store", auth.uid() =
 * user_id) and public read of approved ones, same reasoning as profile.ts.
 */

export type DealerStoreStatus = "pending" | "approved" | "rejected";

export type MyDealerStore = {
  user_id: string;
  store_name: string;
  logo_path: string | null;
  logoUrl: string | null;
  status: DealerStoreStatus;
  created_at: string;
  updated_at: string;
};

const BUCKET = "dealer-store-logos";

function toLogoUrl(path: string | null) {
  if (!path) return null;
  const supabase = getSupabaseServerClient();
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export const getMyDealerStoreFn = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase
    .from("dealer_stores")
    .select("*")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return { ...data, logoUrl: toLogoUrl(data.logo_path) } as MyDealerStore;
});

/** Creates or edits the caller's store — never touches `status` (see module
 * doc). `logo_path` stays whatever it was if the caller doesn't pass one, so
 * saving a name change alone doesn't require re-uploading the logo. */
export const saveMyDealerStoreFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      store_name: z.string().min(1),
      logo_path: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Not signed in");

    const payload: Record<string, unknown> = {
      user_id: auth.user.id,
      store_name: data.store_name,
      updated_at: new Date().toISOString(),
    };
    if (data.logo_path !== undefined) payload["logo_path"] = data.logo_path;

    const { error } = await supabase
      .from("dealer_stores")
      .upsert(payload, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
  });

const MAX_BYTES = 8 * 1024 * 1024;

/** Uploads to the caller's own folder in the public `dealer-store-logos`
 * bucket (shared with the old profiles.store_logo_url flow) and returns
 * both the raw path (what `dealer_stores.logo_path` stores) and the public
 * URL (for immediate preview without a second round trip). */
export const uploadDealerStoreLogoFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      fileName: z.string().min(1),
      contentType: z.string().refine((t) => t.startsWith("image/"), "Must be an image"),
      base64: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Not signed in");

    const bytes = Buffer.from(data.base64, "base64");
    if (bytes.byteLength > MAX_BYTES) throw new Error("Image is larger than 8 MB");

    const ext = data.fileName.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${auth.user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: data.contentType, upsert: true });
    if (error) throw new Error(error.message);

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { path, url: pub.publicUrl };
  });
