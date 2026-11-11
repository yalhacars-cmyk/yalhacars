import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const BUCKET = "car-images";
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * Uploads one car photo to the `car-images` storage bucket. The file travels
 * as a base64 string in the server function payload — simplest way to move
 * bytes through createServerFn's JSON RPC without a separate upload endpoint.
 */
export const uploadCarImageFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      fileName: z.string().min(1),
      contentType: z.string().refine((t) => t.startsWith("image/"), "Must be an image"),
      base64: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = await requireAdmin();

    const bytes = Buffer.from(data.base64, "base64");
    if (bytes.byteLength > MAX_BYTES) {
      throw new Error("Image is larger than 8 MB");
    }

    const ext = data.fileName.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: data.contentType, upsert: false });
    if (error) throw new Error(error.message);

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { url: pub.publicUrl };
  });

const ADMIN_UPLOAD_BUCKETS = ["app-content", "finance-logos"] as const;

/**
 * Uploads to buckets that (unlike `car-images`) have no RLS grant for the
 * `authenticated` role — `app-content` (onboarding slides, splash
 * wallpapers, finance flyers) and `finance-logos`. Goes through the
 * service-role client for the same reason every other admin write in this
 * shared project does: there's no RLS path for it otherwise.
 */
export const uploadAdminImageFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      bucket: z.enum(ADMIN_UPLOAD_BUCKETS),
      fileName: z.string().min(1),
      contentType: z.string().refine((t) => t.startsWith("image/"), "Must be an image"),
      base64: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const supabase = getSupabaseAdminClient();

    const bytes = Buffer.from(data.base64, "base64");
    if (bytes.byteLength > MAX_BYTES) {
      throw new Error("Image is larger than 8 MB");
    }

    const ext = data.fileName.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from(data.bucket)
      .upload(path, bytes, { contentType: data.contentType, upsert: false });
    if (error) throw new Error(error.message);

    const { data: pub } = supabase.storage.from(data.bucket).getPublicUrl(path);
    return { url: pub.publicUrl };
  });

const LISTING_PHOTOS_BUCKET = "car-listing-photos";

/**
 * Copies one seller-submitted photo from the private `car-listing-photos`
 * bucket into the public `car-images` bucket, and returns the new permanent
 * public URL. Needed because `photo_paths` (see Car.photo_paths) can only be
 * displayed via a time-limited signed URL — fine for previewing in the admin
 * panel, but saving that URL into `image`/`gallery` would silently break
 * once it expired. "Use this photo" in CarForm calls this first.
 */
export const promoteListingPhotoFn = createServerFn({ method: "POST" })
  .validator(z.object({ path: z.string().min(1) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const supabase = getSupabaseAdminClient();

    const { data: file, error: downloadError } = await supabase.storage
      .from(LISTING_PHOTOS_BUCKET)
      .download(data.path);
    if (downloadError) throw new Error(downloadError.message);

    const ext = data.path.split(".").pop()?.toLowerCase() || "jpg";
    const newPath = `${crypto.randomUUID()}.${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(newPath, bytes, { contentType: file.type || "image/jpeg", upsert: false });
    if (uploadError) throw new Error(uploadError.message);

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(newPath);
    return { url: pub.publicUrl };
  });
