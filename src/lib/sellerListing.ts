import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * The website's own car-submission pipeline — the real equivalent of the
 * mobile app's `CarService.submitListing()`. Writes straight into
 * `public.cars` as a `status: 'pending'` row through the plain authenticated
 * client: RLS already grants exactly this ("Users submit their own pending
 * listing", auth.uid() = user_id AND status = 'pending'), so — same
 * reasoning as src/lib/profile.ts — there's nothing here that needs the
 * service-role client.
 *
 * Photos go into the private `car-listing-photos` bucket as `photo_paths`,
 * not the public `car-images` bucket `image`/`gallery` use — matching
 * exactly how the mobile app's submissions already look on this shared
 * table. The admin Inventory page's "Set main" / "+ Gallery" buttons
 * (src/lib/admin/storage.ts's promoteListingPhotoFn) already know how to
 * turn a `photo_paths` entry into a permanent public one; nothing new is
 * needed there for web-submitted listings to go through the same review
 * flow as app-submitted ones.
 *
 * An approved dealer's store name/logo (see src/lib/dealerStore.ts) get
 * snapshotted onto `dealer_store_name`/`dealer_store_logo_url` at submission
 * time — not a live join, so a later store edit doesn't retroactively
 * change already-submitted listings.
 */

const listingInput = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  trim: z.string().optional(),
  year: z
    .number()
    .int()
    .min(1980)
    .max(new Date().getFullYear() + 1),
  condition: z.enum(["New", "Used", "Certified"]).optional(),
  mileageKm: z.number().int().nonnegative(),
  fuel: z.string().min(1),
  city: z.string().optional(),
  seats: z.number().int().positive().optional(),
  bodyType: z.string().optional(),
  exteriorColor: z.string().optional(),
  interiorColor: z.string().optional(),
  option: z.string().optional(),
  carOrigin: z.string().optional(),
  price: z.number().int().positive().optional(),
  chassis_no: z.string().optional(),
  engine_cc: z.number().int().positive().optional(),
  engine_cylinders: z.number().int().positive().optional(),
  gear_type: z.string().optional(),
  roof_type: z.string().optional(),
  interior_type: z.string().optional(),
  details: z.string().optional(),
  photo_paths: z.array(z.string()).default([]),
});

export type ListingInput = z.infer<typeof listingInput>;

export const submitCarListingFn = createServerFn({ method: "POST" })
  .validator(listingInput)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Not signed in");

    const { data: profile } = await supabase
      .from("profiles")
      .select("account_type")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    const { data: store } = await supabase
      .from("dealer_stores")
      .select("store_name, logo_path, status")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    // A store only stamps onto listings once both the seller chose "dealer"
    // and their storefront branding has been reviewed — see dealerStore.ts's
    // module doc for why `status` can only ever be admin-set.
    const isApprovedDealer = profile?.account_type === "dealer" && store?.status === "approved";
    const sellerType = isApprovedDealer ? "Independent Dealer" : "Private Seller";
    // Snapshotted, not a live join — see the doc comment on Car.dealer_store_name.
    const dealerStoreName = isApprovedDealer ? (store?.store_name ?? null) : null;
    const dealerStoreLogoUrl =
      isApprovedDealer && store?.logo_path
        ? supabase.storage.from("dealer-store-logos").getPublicUrl(store.logo_path).data.publicUrl
        : null;

    const now = Date.now();
    const id = `listing-${now}${Math.floor(Math.random() * 1000)}`;
    const stock = `PND-${now}`;

    const { error } = await supabase.from("cars").insert({
      id,
      stock,
      title: [data.year, data.make, data.model].filter(Boolean).join(" "),
      make: data.make,
      model: data.model,
      trim: data.trim ?? null,
      year: data.year,
      condition: data.condition ?? null,
      mileageKm: data.mileageKm,
      city: data.city ?? null,
      seats: data.seats ?? null,
      fuel: data.fuel,
      bodyType: data.bodyType ?? null,
      exteriorColor: data.exteriorColor ?? null,
      interiorColor: data.interiorColor ?? null,
      option: data.option ?? null,
      carOrigin: data.carOrigin ?? null,
      price: data.price ?? null,
      sellerType,
      badges: [],
      gallery: [],
      highlights: [],
      tags: [],
      specs: [],
      chassis_no: data.chassis_no ?? null,
      engine_cc: data.engine_cc ?? null,
      engine_cylinders: data.engine_cylinders ?? null,
      gear_type: data.gear_type ?? null,
      roof_type: data.roof_type ?? null,
      interior_type: data.interior_type ?? null,
      details: data.details ?? null,
      photo_paths: data.photo_paths,
      status: "pending",
      availability: "available",
      user_id: auth.user.id,
      dealer_store_name: dealerStoreName,
      dealer_store_logo_url: dealerStoreLogoUrl,
    });
    if (error) throw new Error(error.message);
    return { id };
  });

export type MyListing = {
  id: string;
  title: string;
  status: string;
  availability: string;
  createdAt: string;
  make: string;
  model: string;
  year: number;
  price: number | null;
  city: string | null;
  /** Signed preview URL — the car's public `image` once approved, otherwise
   * the first submitted `photo_paths` entry signed on the fly (that bucket
   * is private). Null if the listing has no photo at all yet. */
  photoUrl: string | null;
};

/** The signed-in visitor's own submissions — every status, not just
 * approved, so a "My cars" page can show pending/rejected ones too. Powers
 * the /my-cars page; the /sell page itself only needs the slim summary. */
export const getMyListingsFn = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase
    .from("cars")
    .select(
      "id, title, status, availability, createdAt, make, model, year, price, city, image, photo_paths",
    )
    .eq("user_id", auth.user.id)
    .order("createdAt", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = data ?? [];

  const pathsNeedingSign = rows
    .filter((r) => !r.image && r.photo_paths?.[0])
    .map((r) => r.photo_paths[0] as string);
  const urlByPath = new Map<string, string>();
  if (pathsNeedingSign.length > 0) {
    const { data: signed } = await supabase.storage
      .from("car-listing-photos")
      .createSignedUrls(pathsNeedingSign, 60 * 60);
    for (const s of signed ?? []) {
      if (s.signedUrl) urlByPath.set(s.path ?? "", s.signedUrl);
    }
  }

  return rows.map((r): MyListing => ({
    id: r.id,
    title: r.title,
    status: r.status,
    availability: r.availability,
    createdAt: r.createdAt,
    make: r.make,
    model: r.model,
    year: r.year,
    price: r.price,
    city: r.city,
    photoUrl: r.image || urlByPath.get(r.photo_paths?.[0] ?? "") || null,
  }));
});

const MAX_BYTES = 8 * 1024 * 1024;

/** Uploads one listing photo to the caller's own folder in the private
 * `car-listing-photos` bucket — required by that bucket's per-user-folder
 * RLS policy. Returns the storage path, not a public URL (see module doc). */
export const uploadListingPhotoFn = createServerFn({ method: "POST" })
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
      .from("car-listing-photos")
      .upload(path, bytes, { contentType: data.contentType });
    if (error) throw new Error(error.message);
    return { path };
  });
