import { useRef, useState } from "react";
import { AlertTriangle, ImagePlus, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { CITIES, type SellerType, type Car } from "@/data/cars";
import { carToInput, type CarInput } from "@/lib/admin/cars";
import { promoteListingPhotoFn, uploadCarImageFn } from "@/lib/admin/storage";
import { PhotoEditor } from "@/components/admin/PhotoEditor";

const CONDITIONS = ["New", "Used", "Certified"] as const;
const SELLER_TYPES: SellerType[] = [
  "Platform Certified",
  "Authorized Dealer",
  "Independent Dealer",
  "Private Seller",
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function uploadImage(file: File): Promise<string> {
  const base64 = await fileToBase64(file);
  const { url } = await uploadCarImageFn({
    data: { fileName: file.name, contentType: file.type, base64 },
  });
  return url;
}

export function toCsv(values: string[]) {
  return values.join(", ");
}

export function fromCsv(value: string) {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

const emptyCar: CarInput = {
  id: "",
  stock: "",
  title: "",
  make: "",
  model: "",
  trim: "",
  year: new Date().getFullYear(),
  condition: "Used",
  mileageKm: 0,
  city: CITIES[0] ?? "Riyadh",
  seats: 5,
  fuel: "Petrol",
  bodyType: "SUV",
  exteriorColor: "",
  interiorColor: "",
  option: "Full Option",
  carOrigin: "GCC Specs",
  price: 0,
  wasPrice: null,
  monthly: 0,
  sellerType: "Platform Certified",
  badges: [],
  image: "",
  gallery: [],
  inspectionScore: 90,
  inspectedOn: "",
  inspectionCenter: "",
  specs: [],
  highlights: [],
  tags: [],
  availability: "available",
  chassis_no: null,
  engine_cc: null,
  engine_cylinders: null,
  gear_type: null,
  roof_type: null,
  interior_type: null,
  details: null,
};

/**
 * What "not given" means for a pending listing: each of these is null/empty
 * on plenty of real cars submitted through the other app (its form doesn't
 * collect everything ours does) — shown as a checklist so the admin knows
 * what to fill in before approving, rather than discovering it as a save
 * error.
 */
export const MISSING_FIELD_CHECKS: { label: string; missing: (car: Car) => boolean }[] = [
  { label: "Trim", missing: (c) => !c.trim },
  { label: "Condition", missing: (c) => !c.condition },
  { label: "City", missing: (c) => !c.city },
  { label: "Seats", missing: (c) => !c.seats },
  { label: "Body type", missing: (c) => !c.bodyType },
  { label: "Exterior color", missing: (c) => !c.exteriorColor },
  { label: "Interior color", missing: (c) => !c.interiorColor },
  { label: "Option", missing: (c) => !c.option },
  { label: "Origin", missing: (c) => !c.carOrigin },
  { label: "Price", missing: (c) => !c.price },
  { label: "Monthly payment", missing: (c) => !c.monthly },
  { label: "Seller type", missing: (c) => !c.sellerType },
  { label: "Main photo", missing: (c) => !c.image },
  { label: "Gallery photos", missing: (c) => c.gallery.length === 0 },
  { label: "Inspection score", missing: (c) => !c.inspectionScore },
  { label: "Inspection date", missing: (c) => !c.inspectedOn },
  { label: "Inspection center", missing: (c) => !c.inspectionCenter },
  { label: "Chassis number", missing: (c) => !c.chassis_no },
  { label: "Engine size (cc)", missing: (c) => !c.engine_cc },
  { label: "Engine cylinders", missing: (c) => !c.engine_cylinders },
  { label: "Gear type", missing: (c) => !c.gear_type },
  { label: "Roof type", missing: (c) => !c.roof_type },
  { label: "Interior type", missing: (c) => !c.interior_type },
  { label: "Description", missing: (c) => !c.details },
  { label: "Submission photos", missing: (c) => !c.photo_paths || c.photo_paths.length === 0 },
];

const RATING_TONE: Record<string, string> = {
  Good: "bg-brass/20 text-brass-2",
  Fair: "bg-amber-500/20 text-amber-600",
  Poor: "bg-destructive/20 text-destructive",
};

export function CarForm({
  initial,
  onCancel,
  onSubmit,
  submitting,
}: {
  initial?: Car;
  onCancel: () => void;
  onSubmit: (input: CarInput) => void | Promise<void>;
  submitting: boolean;
}) {
  const [form, setForm] = useState<CarInput>(() => (initial ? carToInput(initial) : emptyCar));
  const [missing] = useState(() =>
    initial ? MISSING_FIELD_CHECKS.filter((f) => f.missing(initial)).map((f) => f.label) : [],
  );

  const set = <K extends keyof CarInput>(key: K, value: CarInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setSpec = (i: number, field: "label" | "value", value: string) =>
    setForm((f) => ({
      ...f,
      specs: f.specs.map((s, si) => (si === i ? { ...s, [field]: value } : s)),
    }));

  const addSpec = () => setForm((f) => ({ ...f, specs: [...f.specs, { label: "", value: "" }] }));
  const removeSpec = (i: number) =>
    setForm((f) => ({ ...f, specs: f.specs.filter((_, si) => si !== i) }));

  const [mainUploading, setMainUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const mainInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const onMainFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadError(null);
    setMainUploading(true);
    try {
      const url = await uploadImage(file);
      set("image", url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setMainUploading(false);
    }
  };

  const onGalleryFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setUploadError(null);
    setGalleryUploading(true);
    try {
      const urls = await Promise.all(files.map(uploadImage));
      setForm((f) => ({ ...f, gallery: [...f.gallery, ...urls] }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setGalleryUploading(false);
    }
  };

  const removeGalleryImage = (i: number) =>
    setForm((f) => ({ ...f, gallery: f.gallery.filter((_, gi) => gi !== i) }));

  const [promotingPath, setPromotingPath] = useState<string | null>(null);
  const [promoteError, setPromoteError] = useState<string | null>(null);

  // Which photo slot the logo-placement editor is currently open for, if any.
  const [editingTarget, setEditingTarget] = useState<
    { type: "main"; url: string } | { type: "gallery"; index: number; url: string } | null
  >(null);

  const promotePhoto = async (path: string, target: "main" | "gallery") => {
    setPromoteError(null);
    setPromotingPath(path);
    try {
      const { url } = await promoteListingPhotoFn({ data: { path } });
      if (target === "main") set("image", url);
      else setForm((f) => ({ ...f, gallery: [...f.gallery, url] }));
    } catch (err) {
      setPromoteError(err instanceof Error ? err.message : "Failed to use this photo");
    } finally {
      setPromotingPath(null);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="space-y-6 rounded-panel bg-panel-2 p-5 ring-1 ring-panel-fg/10 sm:p-6"
    >
      {missing.length > 0 ? (
        <div className="rounded-control bg-destructive/10 p-3 text-sm ring-1 ring-destructive/20">
          <div className="mb-1.5 flex items-center gap-1.5 font-medium text-destructive">
            <AlertTriangle className="size-4" /> Not provided at submission ({missing.length})
          </div>
          <p className="text-panel-fg/70">{missing.join(" · ")}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="ID (slug)">
          <input
            required
            disabled={Boolean(initial)}
            value={form.id}
            onChange={(e) => set("id", e.target.value)}
            className={inputClass + " disabled:opacity-50"}
            placeholder="bmw-x5-2024"
          />
        </Field>
        <Field label="Stock #">
          <input
            required
            value={form.stock}
            onChange={(e) => set("stock", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Title">
          <input
            required
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Make">
          <input
            required
            value={form.make}
            onChange={(e) => set("make", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Model">
          <input
            required
            value={form.model}
            onChange={(e) => set("model", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Trim">
          <input
            value={form.trim}
            onChange={(e) => set("trim", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Year">
          <input
            type="number"
            required
            value={form.year}
            onChange={(e) => set("year", Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label="Condition">
          <select
            value={form.condition}
            onChange={(e) => set("condition", e.target.value as CarInput["condition"])}
            className={inputClass}
          >
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Availability">
          <select
            value={form.availability}
            onChange={(e) => set("availability", e.target.value as CarInput["availability"])}
            className={inputClass}
          >
            <option value="available">Available</option>
            <option value="reserved">Reserved</option>
            <option value="sold">Sold</option>
          </select>
        </Field>
        <Field label="Mileage (km)">
          <input
            type="number"
            required
            value={form.mileageKm}
            onChange={(e) => set("mileageKm", Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label="City">
          <select
            value={form.city}
            onChange={(e) => set("city", e.target.value)}
            className={inputClass}
          >
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Seats">
          <input
            type="number"
            required
            value={form.seats}
            onChange={(e) => set("seats", Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label="Fuel">
          <input
            required
            value={form.fuel}
            onChange={(e) => set("fuel", e.target.value)}
            className={inputClass}
            placeholder="Petrol / Electric"
          />
        </Field>
        <Field label="Body type">
          <input
            required
            value={form.bodyType}
            onChange={(e) => set("bodyType", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Exterior color">
          <input
            value={form.exteriorColor}
            onChange={(e) => set("exteriorColor", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Interior color">
          <input
            value={form.interiorColor}
            onChange={(e) => set("interiorColor", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Option">
          <input
            value={form.option}
            onChange={(e) => set("option", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Origin">
          <input
            value={form.carOrigin}
            onChange={(e) => set("carOrigin", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Price (SAR)">
          <input
            type="number"
            required
            value={form.price}
            onChange={(e) => set("price", Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label="Was price (SAR, optional)">
          <input
            type="number"
            value={form.wasPrice ?? ""}
            onChange={(e) => set("wasPrice", e.target.value === "" ? null : Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label="Monthly (SAR)">
          <input
            type="number"
            required
            value={form.monthly}
            onChange={(e) => set("monthly", Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label="Seller type">
          <select
            value={form.sellerType}
            onChange={(e) => set("sellerType", e.target.value as SellerType)}
            className={inputClass}
          >
            {SELLER_TYPES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Inspection score (0-100)">
          <input
            type="number"
            min={0}
            max={100}
            value={form.inspectionScore}
            onChange={(e) => set("inspectionScore", Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label="Inspected on">
          <input
            value={form.inspectedOn}
            onChange={(e) => set("inspectedOn", e.target.value)}
            className={inputClass}
            placeholder="12 Mar 2025"
          />
        </Field>
        <Field label="Inspection center">
          <input
            value={form.inspectionCenter}
            onChange={(e) => set("inspectionCenter", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Chassis number">
          <input
            value={form.chassis_no ?? ""}
            onChange={(e) => set("chassis_no", e.target.value || null)}
            className={inputClass}
          />
        </Field>
        <Field label="Engine size (cc)">
          <input
            type="number"
            value={form.engine_cc ?? ""}
            onChange={(e) =>
              set("engine_cc", e.target.value === "" ? null : Number(e.target.value))
            }
            className={inputClass}
          />
        </Field>
        <Field label="Engine cylinders">
          <input
            type="number"
            value={form.engine_cylinders ?? ""}
            onChange={(e) =>
              set("engine_cylinders", e.target.value === "" ? null : Number(e.target.value))
            }
            className={inputClass}
          />
        </Field>
        <Field label="Gear type">
          <input
            value={form.gear_type ?? ""}
            onChange={(e) => set("gear_type", e.target.value || null)}
            className={inputClass}
            placeholder="Automatic / Manual"
          />
        </Field>
        <Field label="Roof type">
          <input
            value={form.roof_type ?? ""}
            onChange={(e) => set("roof_type", e.target.value || null)}
            className={inputClass}
          />
        </Field>
        <Field label="Interior type">
          <input
            value={form.interior_type ?? ""}
            onChange={(e) => set("interior_type", e.target.value || null)}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Description (from submission)">
        <textarea
          value={form.details ?? ""}
          onChange={(e) => set("details", e.target.value || null)}
          rows={3}
          className={inputClass}
        />
      </Field>

      {initial?.photo_paths && initial.photo_paths.length > 0 ? (
        <div>
          <span className="mb-1.5 block text-[11px] tracking-[0.1em] text-panel-fg/55 uppercase">
            Submission photos ({initial.photo_paths.length})
          </span>
          <p className="mb-2 text-xs text-panel-fg/50">
            From the seller's submission — "Use" copies one into this listing's main photo or
            gallery so it survives independently of the temporary preview link below.
          </p>
          {promoteError ? <p className="mb-2 text-xs text-destructive">{promoteError}</p> : null}
          <div className="flex flex-wrap gap-3">
            {initial.photo_paths.map((path, i) => {
              const url = initial.photo_urls?.[i];
              const busy = promotingPath === path;
              return (
                <div key={path} className="w-28">
                  <div className="grid aspect-square place-items-center overflow-hidden rounded-control bg-panel ring-1 ring-panel-fg/10">
                    {url ? (
                      <img src={url} alt="" className="size-full object-cover" />
                    ) : (
                      <span className="px-1 text-center text-[10px] text-panel-fg/40">
                        Preview unavailable
                      </span>
                    )}
                  </div>
                  {url ? (
                    <div className="mt-1 flex gap-1">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => promotePhoto(path, "main")}
                        className="flex-1 rounded-control bg-panel px-1.5 py-1 text-[10px] font-medium text-panel-fg/70 ring-1 ring-panel-fg/10 hover:text-panel-fg disabled:opacity-50"
                      >
                        {busy ? "…" : "Set main"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => promotePhoto(path, "gallery")}
                        className="flex-1 rounded-control bg-panel px-1.5 py-1 text-[10px] font-medium text-panel-fg/70 ring-1 ring-panel-fg/10 hover:text-panel-fg disabled:opacity-50"
                      >
                        {busy ? "…" : "+ Gallery"}
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {initial?.inspection && Object.keys(initial.inspection).length > 0 ? (
        <div>
          <span className="mb-2 block text-[11px] tracking-[0.1em] text-panel-fg/55 uppercase">
            Inspection checklist (from submission, read-only)
          </span>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Object.entries(initial.inspection).map(([category, items]) => (
              <div key={category} className="rounded-control bg-panel p-3 ring-1 ring-panel-fg/10">
                <div className="mb-1.5 text-xs font-medium capitalize text-panel-fg/70">
                  {category.replace(/([A-Z])/g, " $1").trim()}
                </div>
                <div className="space-y-1">
                  {Object.entries(items).map(([item, rating]) => (
                    <div key={item} className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-panel-fg/60 capitalize">
                        {item.replace(/([A-Z])/g, " $1").trim()}
                      </span>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                          RATING_TONE[rating] ?? "bg-panel-fg/10 text-panel-fg/60"
                        }`}
                      >
                        {rating}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {uploadError ? (
        <div className="rounded-control bg-destructive/15 px-3 py-2 text-sm text-destructive">
          {uploadError}
        </div>
      ) : null}

      <div>
        <span className="mb-1.5 block text-[11px] tracking-[0.1em] text-panel-fg/55 uppercase">
          Main photo
        </span>
        <div className="flex items-center gap-3">
          <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-control bg-panel ring-1 ring-panel-fg/10">
            {form.image ? (
              <img src={form.image} alt="" className="size-full object-cover" />
            ) : (
              <ImagePlus className="size-6 text-panel-fg/30" />
            )}
          </div>
          <div className="flex-1 space-y-2">
            <input
              ref={mainInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onMainFileChange}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => mainInputRef.current?.click()}
                disabled={mainUploading}
                className="inline-flex items-center gap-1.5 rounded-control bg-panel px-3 py-2 text-xs font-medium text-panel-fg/80 ring-1 ring-panel-fg/10 hover:text-panel-fg disabled:opacity-60"
              >
                {mainUploading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ImagePlus className="size-3.5" />
                )}
                {mainUploading ? "Uploading…" : form.image ? "Replace photo" : "Upload photo"}
              </button>
              {form.image ? (
                <button
                  type="button"
                  onClick={() => setEditingTarget({ type: "main", url: form.image })}
                  className="inline-flex items-center gap-1.5 rounded-control bg-panel px-3 py-2 text-xs font-medium text-panel-fg/80 ring-1 ring-panel-fg/10 hover:text-panel-fg"
                >
                  <Pencil className="size-3.5" /> Edit
                </button>
              ) : null}
            </div>
            <input
              required
              value={form.image}
              onChange={(e) => set("image", e.target.value)}
              className={inputClass}
              placeholder="Or paste an image URL"
            />
          </div>
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[11px] tracking-[0.1em] text-panel-fg/55 uppercase">
            Gallery photos
          </span>
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onGalleryFilesChange}
          />
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            disabled={galleryUploading}
            className="inline-flex items-center gap-1 text-xs font-medium text-brass hover:underline disabled:opacity-60"
          >
            {galleryUploading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <ImagePlus className="size-3.5" />
            )}
            {galleryUploading ? "Uploading…" : "Add photos"}
          </button>
        </div>
        {form.gallery.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {form.gallery.map((url, i) => (
              <div key={i} className="group relative size-16 shrink-0">
                <img
                  src={url}
                  alt=""
                  className="size-full rounded-control object-cover ring-1 ring-panel-fg/10"
                />
                <button
                  type="button"
                  onClick={() => setEditingTarget({ type: "gallery", index: i, url })}
                  aria-label="Edit photo"
                  className="absolute -bottom-1.5 -start-1.5 grid size-5 place-items-center rounded-full bg-panel text-panel-fg/70 opacity-0 ring-1 ring-panel-fg/10 transition-opacity group-hover:opacity-100 hover:text-brass"
                >
                  <Pencil className="size-3" />
                </button>
                <button
                  type="button"
                  onClick={() => removeGalleryImage(i)}
                  aria-label="Remove photo"
                  className="absolute -top-1.5 -end-1.5 grid size-5 place-items-center rounded-full bg-destructive text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-panel-fg/40">No gallery photos yet.</p>
        )}
      </div>
      <Field label="Badges (comma-separated)">
        <input
          value={toCsv(form.badges)}
          onChange={(e) => set("badges", fromCsv(e.target.value))}
          className={inputClass}
          placeholder="Inspected, Warranty, Finance"
        />
      </Field>
      <Field label="Highlights (comma-separated)">
        <input
          value={toCsv(form.highlights)}
          onChange={(e) => set("highlights", fromCsv(e.target.value))}
          className={inputClass}
        />
      </Field>
      <Field label="Tags (comma-separated)">
        <input
          value={toCsv(form.tags)}
          onChange={(e) => set("tags", fromCsv(e.target.value))}
          className={inputClass}
        />
      </Field>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] tracking-[0.1em] text-panel-fg/55 uppercase">
            Specifications
          </span>
          <button
            type="button"
            onClick={addSpec}
            className="inline-flex items-center gap-1 text-xs font-medium text-brass hover:underline"
          >
            <Plus className="size-3.5" /> Add spec
          </button>
        </div>
        <div className="space-y-2">
          {form.specs.map((spec, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={spec.label}
                onChange={(e) => setSpec(i, "label", e.target.value)}
                placeholder="Engine"
                className={inputClass}
              />
              <input
                value={spec.value}
                onChange={(e) => setSpec(i, "value", e.target.value)}
                placeholder="3.0L I6 Turbo"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => removeSpec(i)}
                aria-label="Remove spec"
                className="grid shrink-0 place-items-center rounded-control px-3 text-panel-fg/50 ring-1 ring-panel-fg/10 hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          {form.specs.length === 0 ? (
            <p className="text-xs text-panel-fg/40">No specs yet — add one above.</p>
          ) : null}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-control bg-brass px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brass-2 disabled:opacity-60"
        >
          {submitting ? "Saving…" : initial ? "Save changes" : "Create listing"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-control px-5 py-2.5 text-sm font-medium text-panel-fg/70 ring-1 ring-panel-fg/10 hover:text-panel-fg"
        >
          Cancel
        </button>
      </div>

      {editingTarget ? (
        <PhotoEditor
          imageUrl={editingTarget.url}
          bucket="car-images"
          onClose={() => setEditingTarget(null)}
          onSaved={(url) => {
            if (editingTarget.type === "main") {
              set("image", url);
            } else {
              setForm((f) => ({
                ...f,
                gallery: f.gallery.map((g, gi) => (gi === editingTarget.index ? url : g)),
              }));
            }
            setEditingTarget(null);
          }}
        />
      ) : null}
    </form>
  );
}

const inputClass =
  "w-full rounded-control bg-panel px-3 py-2 text-sm outline-none ring-1 ring-panel-fg/10 focus:ring-brass";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] tracking-[0.1em] text-panel-fg/55 uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}
