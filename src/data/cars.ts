import { supabase } from "@/lib/supabase/browser";

export type SellerType =
  "Platform Certified" | "Authorized Dealer" | "Independent Dealer" | "Private Seller";

export type CarAvailability = "available" | "reserved" | "sold";
/** Seller-listing moderation state — separate from `CarAvailability`. Only
 * "approved" cars are shown publicly; "pending" ones await admin review. */
export type CarModerationStatus = "pending" | "approved";

export type Car = {
  id: string;
  stock: string;
  title: string;
  make: string;
  model: string;
  trim: string;
  year: number;
  condition: "New" | "Used" | "Certified";
  mileageKm: number;
  city: string;
  seats: number;
  fuel: string;
  bodyType: string;
  exteriorColor: string;
  interiorColor: string;
  option: string;
  carOrigin: string;
  price: number;
  wasPrice?: number;
  monthly: number;
  sellerType: SellerType;
  badges: string[];
  image: string;
  gallery: string[];
  inspectionScore: number;
  inspectedOn: string;
  inspectionCenter: string;
  specs: { label: string; value: string }[];
  highlights: string[];
  tags: string[];
  /** Defaults to "available" for rows written before the availability column existed. */
  availability?: CarAvailability;
  /** Defaults to "approved" for rows written before the moderation column existed. */
  status?: CarModerationStatus;

  /**
   * Columns the separate seller-submission app writes when a seller submits
   * a car there — never set by this app's own CarForm, so undefined/null on
   * every car this admin panel itself created. All nullable at the DB level.
   */
  chassis_no?: string | null;
  engine_cc?: number | null;
  engine_cylinders?: number | null;
  gear_type?: string | null;
  /** Imported-listing fields (see supabase/add_listing_source_fields.sql). */
  neighborhood?: string | null;
  posted_at?: string | null;
  source_url?: string | null;
  roof_type?: string | null;
  interior_type?: string | null;
  /** Free-text seller description, from the submission form. */
  details?: string | null;
  /** Supabase Storage paths for the submitted photos — distinct from `gallery`. */
  photo_paths?: string[];
  /**
   * Signed, time-limited URLs for `photo_paths` — not a DB column. Added by
   * `listAllCarsFn` because `photo_paths` lives in the private
   * `car-listing-photos` bucket, so the raw path alone can't be rendered as
   * an `<img src>`; nothing else populates this field.
   */
  photo_urls?: string[];
  /** Category → checklist item → rating ("Good"/"Fair"/"Poor"), from the submission's inspection step. */
  inspection?: Record<string, Record<string, string>>;
  /** The account that submitted this listing (auth.users id). Null for cars this admin panel created. */
  user_id?: string | null;
  /**
   * Snapshotted from the submitting dealer's profile at submission time (not
   * a live join) — only ever set for a verified dealer's listing. Shown as
   * "Sold by [logo] [Store Name]" on the car detail page.
   */
  dealer_store_name?: string | null;
  dealer_store_logo_url?: string | null;
};

export function carAvailability(car: Pick<Car, "availability">): CarAvailability {
  return car.availability ?? "available";
}

export function isAvailable(car: Pick<Car, "availability">): boolean {
  return carAvailability(car) === "available";
}

export const CITIES = [
  "Riyadh",
  "Jeddah",
  "Dammam",
  "Khobar",
  "Makkah",
  "Madinah",
  "Tabuk",
  "Abha",
];

/**
 * Live inventory comes from the `public.cars` Supabase table — see
 * `supabase/schema.sql` for the DDL and `supabase/seed.sql` for the demo rows.
 * Columns are camelCase so rows map 1:1 onto the `Car` type with no
 * translation layer. Writes go through the admin server functions in
 * `src/lib/admin/cars.ts`.
 */
/**
 * Only approved listings — `status` here is the seller-listing moderation
 * flag (pending/approved), unrelated to `availability` (available/reserved/
 * sold). Used for the public /buy grid.
 */
export async function listCars(): Promise<Car[]> {
  const { data, error } = await supabase
    .from("cars")
    .select("*")
    .eq("status", "approved")
    .order("createdAt", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Car[];
}

export async function getCar(id: string): Promise<Car | undefined> {
  const { data, error } = await supabase.from("cars").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? undefined) as Car | undefined;
}
