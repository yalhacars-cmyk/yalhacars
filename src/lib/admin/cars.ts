import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { carAvailability, CITIES, type Car } from "@/data/cars";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Admin car CRUD. Every call is gated by `requireAdmin()` (a real Supabase
 * session must exist), then reads/writes `public.cars` through the
 * service-role client — this project's Supabase database is shared with
 * another app whose live RLS on `cars` only covers public reads of approved
 * listings and a seller inserting their own pending one (see
 * `getSupabaseAdminClient`'s doc comment). There is no RLS path at all for
 * this admin panel to list pending listings or to update/delete any car, so
 * bypassing RLS here — behind our own admin gate — is required, not optional.
 */

const specSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

/** Mirrors the `Car` type in @/data/cars (and therefore the `public.cars` columns). */
export const carInputSchema = z.object({
  id: z.string().min(1),
  stock: z.string().min(1),
  title: z.string().min(1),
  make: z.string().min(1),
  model: z.string().min(1),
  trim: z.string(),
  year: z.number().int(),
  condition: z.enum(["New", "Used", "Certified"]),
  mileageKm: z.number().int().nonnegative(),
  city: z.string().min(1),
  seats: z.number().int().positive(),
  fuel: z.string().min(1),
  bodyType: z.string().min(1),
  exteriorColor: z.string(),
  interiorColor: z.string(),
  option: z.string(),
  carOrigin: z.string(),
  price: z.number().int().nonnegative(),
  wasPrice: z.number().int().nonnegative().nullable(),
  monthly: z.number().int().nonnegative(),
  sellerType: z.enum([
    "Platform Certified",
    "Authorized Dealer",
    "Independent Dealer",
    "Private Seller",
  ]),
  badges: z.array(z.string()),
  image: z.string().min(1),
  gallery: z.array(z.string()),
  inspectionScore: z.number().int().min(0).max(100),
  inspectedOn: z.string(),
  inspectionCenter: z.string(),
  specs: z.array(specSchema),
  highlights: z.array(z.string()),
  tags: z.array(z.string()),
  availability: z.enum(["available", "reserved", "sold"]).default("available"),
  // Set only by the separate seller-submission app's flow — this app's own
  // CarForm exposes them as editable, but a car created here simply won't
  // have them (all optional/nullable).
  chassis_no: z.string().nullable().optional(),
  engine_cc: z.number().int().nullable().optional(),
  engine_cylinders: z.number().int().nullable().optional(),
  gear_type: z.string().nullable().optional(),
  roof_type: z.string().nullable().optional(),
  interior_type: z.string().nullable().optional(),
  details: z.string().nullable().optional(),
});

export type CarInput = z.infer<typeof carInputSchema>;

/**
 * Maps a `Car` row onto a valid `CarInput` for editing — every field
 * CarInput requires non-null gets a sensible default here, because a car
 * submitted through the seller-submission app's flow can have most of them
 * null (its form doesn't collect everything ours does). Without this,
 * feeding `initial` straight into CarForm's state, or into updateCarFn via
 * the inventory table's quick availability toggle, would either hand React
 * `null` for a controlled input or fail the zod validation outright.
 */
export function carToInput(car: Car): CarInput {
  return {
    id: car.id,
    stock: car.stock,
    title: car.title,
    make: car.make,
    model: car.model,
    trim: car.trim ?? "",
    year: car.year,
    condition: car.condition ?? "Used",
    mileageKm: car.mileageKm,
    city: car.city ?? CITIES[0] ?? "Riyadh",
    seats: car.seats ?? 5,
    fuel: car.fuel,
    bodyType: car.bodyType ?? "",
    exteriorColor: car.exteriorColor ?? "",
    interiorColor: car.interiorColor ?? "",
    option: car.option ?? "",
    carOrigin: car.carOrigin ?? "",
    price: car.price ?? 0,
    wasPrice: car.wasPrice ?? null,
    monthly: car.monthly ?? 0,
    sellerType: car.sellerType ?? "Platform Certified",
    badges: car.badges,
    image: car.image ?? "",
    gallery: car.gallery,
    inspectionScore: car.inspectionScore ?? 0,
    inspectedOn: car.inspectedOn ?? "",
    inspectionCenter: car.inspectionCenter ?? "",
    specs: car.specs,
    highlights: car.highlights,
    tags: car.tags,
    availability: carAvailability(car),
    chassis_no: car.chassis_no ?? null,
    engine_cc: car.engine_cc ?? null,
    engine_cylinders: car.engine_cylinders ?? null,
    gear_type: car.gear_type ?? null,
    roof_type: car.roof_type ?? null,
    interior_type: car.interior_type ?? null,
    details: car.details ?? null,
  };
}

/** Unfiltered by moderation status — the only way to actually see pending listings. */
/** Bucket the seller-submission app uploads to — private, so a raw `photo_paths`
 * entry can't be rendered as an `<img src>` without signing it first. */
const LISTING_PHOTOS_BUCKET = "car-listing-photos";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export const listAllCarsFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("cars")
    .select("*")
    .order("createdAt", { ascending: false });
  if (error) throw new Error(error.message);
  const cars = (data ?? []) as Car[];

  const allPaths = cars.flatMap((c) => c.photo_paths ?? []);
  if (allPaths.length === 0) return cars;

  const { data: signed } = await supabase.storage
    .from(LISTING_PHOTOS_BUCKET)
    .createSignedUrls(allPaths, SIGNED_URL_TTL_SECONDS);
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  // Index-aligned with `photo_paths` (a "" entry means that one path failed
  // to sign) — CarForm pairs them up by index to know which storage path to
  // promote, so this must never silently drop or reorder an entry.
  return cars.map((car) =>
    car.photo_paths && car.photo_paths.length > 0
      ? { ...car, photo_urls: car.photo_paths.map((p) => urlByPath.get(p) ?? "") }
      : car,
  );
});

export const createCarFn = createServerFn({ method: "POST" })
  .validator(carInputSchema)
  .handler(async ({ data }) => {
    await requireAdmin();
    const supabase = getSupabaseAdminClient();
    // `status` (separate from `availability`) is the seller-listing
    // moderation flag — a car an admin adds directly is already vetted, so
    // it's approved (publicly visible) immediately rather than defaulting
    // to the DB's own 'pending'.
    const { error } = await supabase.from("cars").insert({ ...data, status: "approved" });
    if (error) throw new Error(error.message);
    return { id: data.id };
  });

export const updateCarFn = createServerFn({ method: "POST" })
  .validator(carInputSchema.extend({ originalId: z.string().min(1) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const supabase = getSupabaseAdminClient();
    const { originalId, ...car } = data;
    const { error } = await supabase.from("cars").update(car).eq("id", originalId);
    if (error) throw new Error(error.message);
    return { id: car.id };
  });

export const deleteCarFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from("cars").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { id: data.id };
  });

/** Admin approves a pending seller-submitted listing — makes it publicly visible. */
export const approveCarFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from("cars").update({ status: "approved" }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { id: data.id };
  });
