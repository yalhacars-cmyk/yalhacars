import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * The signed-in visitor's own `profiles` row — full name, phone, city,
 * national ID (+ document), and (see supabase/add_dealer_account_type.sql)
 * account type / business fields for dealers. Unlike everything in
 * src/lib/admin/, this goes through the plain authenticated client, not the
 * service-role one: RLS already grants a user full access to their own row
 * ("Users manage their own profile", auth.uid() = user_id), so there's
 * nothing to bypass here. `dealer_verified` is never accepted from the
 * client — only src/lib/admin/customers.ts's setDealerVerifiedFn writes it.
 */

export type MyProfile = {
  user_id: string;
  full_name: string;
  phone: string;
  city: string;
  national_id: string;
  national_id_document_path: string | null;
  account_type: "individual" | "dealer";
  business_name: string | null;
  cr_number: string | null;
  cr_document_path: string | null;
  dealer_verified: boolean;
  store_name: string | null;
  store_logo_url: string | null;
};

export const getMyProfileFn = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as MyProfile) ?? null;
});

const profileInput = z.object({
  full_name: z.string().min(1),
  phone: z.string().min(1),
  city: z.string().min(1),
  national_id: z.string().min(1),
  national_id_document_path: z.string().nullable().optional(),
  account_type: z.enum(["individual", "dealer"]),
  business_name: z.string().nullable().optional(),
  cr_number: z.string().nullable().optional(),
  cr_document_path: z.string().nullable().optional(),
  store_name: z.string().nullable().optional(),
  store_logo_url: z.string().nullable().optional(),
});

/** Upserts the caller's own profile row — `user_id` always comes from the
 * server-verified session, never from client input. */
export const saveMyProfileFn = createServerFn({ method: "POST" })
  .validator(profileInput)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Not signed in");
    const { error } = await supabase
      .from("profiles")
      .upsert(
        { user_id: auth.user.id, ...data, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);
  });

const DOC_BUCKETS = ["national-id-documents", "dealer-documents"] as const;
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Uploads a KYC document to the caller's own folder in a private bucket
 * (`<user_id>/<uuid>.<ext>`) — required by that bucket's per-user-folder RLS
 * policy. Returns the storage path (not a public URL — these buckets are
 * private; admin views them via a signed URL, see listCustomersFn).
 */
export const uploadMyDocumentFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      bucket: z.enum(DOC_BUCKETS),
      fileName: z.string().min(1),
      contentType: z.string(),
      base64: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Not signed in");

    const bytes = Buffer.from(data.base64, "base64");
    if (bytes.byteLength > MAX_BYTES) throw new Error("File is larger than 8 MB");

    const ext = data.fileName.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${auth.user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from(data.bucket)
      .upload(path, bytes, { contentType: data.contentType || "application/octet-stream" });
    if (error) throw new Error(error.message);
    return { path };
  });

/**
 * Uploads a dealer's store logo to their own folder in the public
 * `dealer-store-logos` bucket — unlike the KYC documents above, this one is
 * meant to be shown to every site visitor ("Sold by [logo] [Store Name]" on
 * the car detail page), so it returns a public URL rather than a path.
 */
export const uploadStoreLogoFn = createServerFn({ method: "POST" })
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
      .from("dealer-store-logos")
      .upload(path, bytes, { contentType: data.contentType, upsert: true });
    if (error) throw new Error(error.message);

    const { data: pub } = supabase.storage.from("dealer-store-logos").getPublicUrl(path);
    return { url: pub.publicUrl };
  });
