import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Images,
  ListChecks,
  Loader2,
  SlidersHorizontal,
  Upload,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { SignInPrompt } from "@/components/site/AuthControls";
import { DealerStoreForm } from "@/components/site/DealerStoreForm";
import { isProfileComplete, ProfileForm } from "@/components/site/ProfileForm";
import { CITIES } from "@/data/cars";
import {
  getBodyTypes,
  getCarMakes,
  getCarModels,
  getVehicleOptions,
  getVehicleYearRange,
} from "@/data/siteContent";
import { getCurrentUserFn } from "@/lib/auth";
import { getMyDealerStoreFn } from "@/lib/dealerStore";
import { useLocale, useT } from "@/lib/i18n/context";
import { formatNumber, formatSar, tr } from "@/lib/i18n/dictionary";
import { getMyProfileFn } from "@/lib/profile";
import {
  getMyListingsFn,
  submitCarListingFn,
  uploadListingPhotoFn,
  type ListingInput,
} from "@/lib/sellerListing";

export const Route = createFileRoute("/sell")({
  loader: async () => {
    const [
      user,
      profile,
      dealerStore,
      listings,
      carMakes,
      carModels,
      bodyTypes,
      vehicleOptions,
      yearRange,
    ] = await Promise.all([
      getCurrentUserFn(),
      getMyProfileFn(),
      getMyDealerStoreFn(),
      getMyListingsFn(),
      getCarMakes(),
      getCarModels(),
      getBodyTypes(),
      getVehicleOptions(),
      getVehicleYearRange(),
    ]);
    return {
      user,
      profile,
      dealerStore,
      listings,
      carMakes,
      carModels,
      bodyTypes,
      vehicleOptions,
      yearRange,
    };
  },
  head: () => ({
    meta: [
      { title: "Sell Your Car in Saudi Arabia — Instant Valuation | Yalhacar" },
      {
        name: "description",
        content:
          "Get an instant AI valuation for your car, book a free 200-point inspection, and get paid within 48 hours. Trade-in or sell outright across Saudi Arabia.",
      },
    ],
  }),
  component: SellPage,
});

const estimatorMakes = [
  "Toyota",
  "BMW",
  "Mercedes-Benz",
  "Nissan",
  "Hyundai",
  "Lexus",
  "Ford",
  "Other",
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

function SellPage() {
  const t = useT();
  const { locale } = useLocale();
  const [make, setMake] = useState<string>(estimatorMakes[0] ?? "Toyota");
  const [year, setYear] = useState(2021);
  const [mileage, setMileage] = useState(60000);
  const [city, setCity] = useState<string>(CITIES[0] ?? "Riyadh");
  const [submitted, setSubmitted] = useState(false);

  const estimate = useMemo(() => {
    const base = 180000;
    const ageFactor = Math.max(0, (new Date().getFullYear() - year) * 9500);
    const mileageFactor = Math.min(mileage, 200000) * 0.65;
    const mid = Math.max(25000, Math.round((base - ageFactor - mileageFactor) / 500) * 500);
    return { low: Math.round(mid * 0.92), high: Math.round(mid * 1.08) };
  }, [year, mileage]);

  return (
    <div className="bg-paper">
      <section className="relative overflow-hidden bg-panel text-panel-fg">
        <div className="diagonal pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-[1360px] px-5 py-10 sm:px-8 sm:py-14">
          <div className="mb-5 inline-flex items-center gap-2 text-[11px] tracking-[0.2em] text-panel-accent uppercase">
            <span className="size-1.5 rounded-full bg-brass" /> {t.sell.eyebrow}
          </div>
          <h1 className="max-w-[36ch] text-balance font-display text-[36px] leading-[1.02] font-semibold tracking-tight sm:text-[48px]">
            {t.sell.title}
            <span className="text-panel-accent">{t.sell.titleHighlight}</span>
            {t.sell.titleEnd}
          </h1>
          <p className="mt-4 max-w-[52ch] text-pretty text-base leading-relaxed text-mist">
            {t.sell.subtitle}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1360px] px-5 py-10 sm:px-8 sm:py-14">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.1fr]">
          <div className="rounded-panel bg-sand p-6 text-sand-fg ring-1 ring-hairline sm:p-8">
            <div className="mb-2 text-[11px] tracking-[0.2em] text-sand-accent uppercase">
              {t.sell.valuationEyebrow}
            </div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              {t.sell.valuationHeading}
            </h2>

            {!submitted ? (
              <form
                className="mt-6 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  setSubmitted(true);
                }}
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] tracking-[0.1em] text-sand-fg/55 uppercase">
                      {t.sell.makeLabel}
                    </span>
                    <select
                      value={make}
                      onChange={(e) => setMake(e.target.value)}
                      className="w-full rounded-control bg-paper px-3 py-2.5 text-sm outline-none ring-1 ring-hairline"
                    >
                      {estimatorMakes.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] tracking-[0.1em] text-sand-fg/55 uppercase">
                      {t.sell.cityLabel}
                    </span>
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full rounded-control bg-paper px-3 py-2.5 text-sm outline-none ring-1 ring-hairline"
                    >
                      {CITIES.map((c) => (
                        <option key={c} value={c}>
                          {tr(c, locale)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block">
                  <span className="mb-1.5 flex justify-between text-[11px] tracking-[0.1em] text-sand-fg/55 uppercase">
                    <span>{t.sell.yearLabel}</span>
                    <span className="num text-sand-fg/75 normal-case">
                      {formatNumber(year, locale)}
                    </span>
                  </span>
                  <input
                    type="range"
                    min={2005}
                    max={2026}
                    step={1}
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full accent-brass"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 flex justify-between text-[11px] tracking-[0.1em] text-sand-fg/55 uppercase">
                    <span>{t.sell.mileageLabel}</span>
                    <span className="num text-sand-fg/75 normal-case">
                      {formatNumber(mileage, locale)} km
                    </span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={300000}
                    step={1000}
                    value={mileage}
                    onChange={(e) => setMileage(Number(e.target.value))}
                    className="w-full accent-brass"
                  />
                </label>

                <button
                  type="submit"
                  className="w-full rounded-control bg-panel px-4 py-3.5 text-center font-display text-sm font-medium text-panel-fg"
                >
                  {t.sell.submitButton}
                </button>
              </form>
            ) : (
              <div className="mt-6">
                <div className="rounded-panel bg-panel p-6 text-panel-fg">
                  <div className="text-[11px] tracking-[0.2em] text-panel-accent uppercase">
                    {t.sell.estimateFor} {formatNumber(year, locale)} {make}
                  </div>
                  <div className="num mt-2 font-display text-3xl font-semibold sm:text-4xl">
                    {formatSar(estimate.low, locale)} – {formatSar(estimate.high, locale)}
                  </div>
                  <p className="mt-3 text-sm text-mist">
                    {t.sell.estimateBody
                      .replace("{mileage}", formatNumber(mileage, locale))
                      .replace("{city}", tr(city, locale))}
                  </p>
                </div>
                <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
                  <a
                    href="#list-your-car"
                    className="flex-1 rounded-control bg-brass px-4 py-3 text-center font-display text-sm font-medium text-white"
                  >
                    {t.sell.bookInspection}
                  </a>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="flex-1 rounded-control bg-paper px-4 py-3 text-center text-sm font-medium text-ink ring-1 ring-hairline-2"
                  >
                    {t.sell.editDetails}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              {t.sell.howItWorksHeading}
            </h2>
            <ol className="mt-6 space-y-5">
              {t.sell.steps.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <div className="grid size-8 shrink-0 place-items-center rounded-full bg-panel font-display text-sm font-semibold text-panel-fg">
                    {i + 1}
                  </div>
                  <div>
                    <div className="font-display text-base font-medium">{step.title}</div>
                    <div className="mt-0.5 text-sm text-ink/55">{step.body}</div>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-8 rounded-panel bg-panel p-5 text-panel-fg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-display text-base font-medium">{t.sell.tradeInTitle}</div>
                  <div className="mt-0.5 text-sm text-mist">{t.sell.tradeInBody}</div>
                </div>
                <Link
                  to="/buy"
                  className="shrink-0 rounded-full bg-brass px-4 py-2 text-xs font-medium text-white"
                >
                  {t.sell.browseCars}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ListYourCarSection />

      <section className="bg-panel text-panel-fg">
        <div className="mx-auto max-w-[1360px] px-5 py-10 sm:px-8">
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {t.sell.stats.map((item) => (
              <div key={item.label}>
                <div className="num font-display text-3xl font-semibold text-panel-accent">
                  {item.value}
                </div>
                <div className="mt-1 text-sm text-mist">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function ListYourCarSection() {
  const {
    user,
    profile,
    dealerStore,
    listings,
    carMakes,
    carModels,
    bodyTypes,
    vehicleOptions,
    yearRange,
  } = Route.useLoaderData();
  const router = useRouter();
  const [justSubmitted, setJustSubmitted] = useState<string | null>(null);
  const [storeStepSkipped, setStoreStepSkipped] = useState(false);
  const refresh = () => router.invalidate();

  // One-time gates before the listing wizard: sign in, then a complete
  // profile, then — for a dealer with no store yet — set one up. Once each
  // is done it's never shown again here (edit anytime from /profile).
  const needsStoreStep =
    !!user &&
    isProfileComplete(profile) &&
    profile?.account_type === "dealer" &&
    !dealerStore &&
    !storeStepSkipped;

  return (
    <section id="list-your-car" className="bg-sand text-sand-fg">
      <div className="mx-auto max-w-[1360px] px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-2 text-[11px] tracking-[0.2em] text-sand-accent uppercase">
          Skip the wait
        </div>
        <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          List your car directly
        </h2>
        <p className="mt-2 max-w-[60ch] text-sm text-sand-fg/60">
          Submit your car for review — our team inspects and publishes it once approved. One
          account, usable from the website or the app.
        </p>

        <div className="mt-6 max-w-2xl">
          {!user ? (
            <SignInPrompt
              next="/sell#list-your-car"
              message="Sign in to submit your car — we'll ask a few details once, then you can list as many cars as you like."
            />
          ) : justSubmitted ? (
            <SubmittedNotice
              reference={justSubmitted}
              onListAnother={() => setJustSubmitted(null)}
            />
          ) : !isProfileComplete(profile) ? (
            <ProfileForm user={user} profile={profile} onSaved={refresh} submitLabel="Continue" />
          ) : needsStoreStep ? (
            <DealerStoreForm
              store={dealerStore}
              onSaved={refresh}
              submitLabel="Continue"
              onSkip={() => setStoreStepSkipped(true)}
            />
          ) : (
            <ListingForm
              carMakes={carMakes}
              carModels={carModels}
              bodyTypes={bodyTypes.map((b) => b.value)}
              vehicleOptions={vehicleOptions}
              yearRange={yearRange}
              onSubmitted={(id) => {
                setJustSubmitted(id);
                refresh();
              }}
            />
          )}
        </div>

        {user && listings.length > 0 ? (
          <Link
            to="/my-cars"
            className="mt-8 flex max-w-2xl items-center justify-between gap-3 rounded-panel bg-panel px-5 py-4 text-panel-fg ring-1 ring-panel-fg/10 transition-colors hover:ring-panel-fg/25"
          >
            <span className="text-sm">
              You have{" "}
              <span className="font-semibold">
                {listings.length} {listings.length === 1 ? "listing" : "listings"}
              </span>{" "}
              on Yalhacar — track their review status.
            </span>
            <span className="shrink-0 text-sm font-medium text-brass">View my cars →</span>
          </Link>
        ) : null}
      </div>
    </section>
  );
}

const OPTION_LEVELS = ["Full Option", "Standard"];
const CAR_ORIGINS = ["GCC Specs", "Saudi Specs", "Imported"];

const WIZARD_STEPS = [
  { label: "Vehicle", icon: SlidersHorizontal },
  { label: "Specs", icon: ListChecks },
  { label: "Photos", icon: Images },
  { label: "Review", icon: CheckCircle2 },
] as const;

function WizardProgress({ step }: { step: number }) {
  return (
    <div className="mb-6 flex items-center gap-1.5 sm:gap-2">
      {WIZARD_STEPS.map((s, i) => {
        const active = i === step;
        const done = i < step;
        return (
          <div key={s.label} className="flex flex-1 items-center gap-1.5 sm:gap-2">
            <div
              className={`flex items-center gap-2 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 ${
                active
                  ? "bg-brass text-white"
                  : done
                    ? "bg-brass/15 text-brass-2"
                    : "bg-panel-2 text-panel-fg/45"
              }`}
            >
              <s.icon className="size-3.5" />
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < WIZARD_STEPS.length - 1 ? (
              <div className={`h-px flex-1 ${done ? "bg-brass/40" : "bg-panel-fg/10"}`} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function Field({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-panel-fg/70">
        {label} {optional ? <span className="text-panel-fg/40">(optional)</span> : null}
      </span>
      {children}
    </label>
  );
}

type UploadedPhoto = { path: string; previewUrl: string };

function ListingForm({
  carMakes,
  carModels,
  bodyTypes,
  vehicleOptions,
  yearRange,
  onSubmitted,
}: {
  carMakes: string[];
  carModels: Record<string, string[]>;
  bodyTypes: string[];
  vehicleOptions: Record<string, string[]>;
  yearRange: { minYear: number; maxYear: number } | null;
  onSubmitted: (id: string) => void;
}) {
  const [step, setStep] = useState(0);
  const [make, setMake] = useState(carMakes[0] ?? "");
  const [model, setModel] = useState(carModels[carMakes[0] ?? ""]?.[0] ?? "");
  const [trim, setTrim] = useState("");
  const [year, setYear] = useState(yearRange?.maxYear ?? new Date().getFullYear());
  const [condition, setCondition] = useState<"New" | "Used" | "Certified">("Used");
  const [mileageKm, setMileageKm] = useState(0);
  const [city, setCity] = useState(CITIES[0] ?? "Riyadh");
  const [bodyType, setBodyType] = useState(bodyTypes[0] ?? "");
  const [seats, setSeats] = useState(5);
  const [fuel, setFuel] = useState(vehicleOptions["fuel_type"]?.[0] ?? "Petrol");
  const [exteriorColor, setExteriorColor] = useState(vehicleOptions["color"]?.[0] ?? "");
  const [interiorColor, setInteriorColor] = useState(vehicleOptions["color"]?.[0] ?? "");
  const [option, setOption] = useState(OPTION_LEVELS[0] ?? "");
  const [carOrigin, setCarOrigin] = useState(CAR_ORIGINS[0] ?? "");
  const [gearType, setGearType] = useState(vehicleOptions["gear_type"]?.[0] ?? "");
  const [roofType, setRoofType] = useState(vehicleOptions["roof_type"]?.[0] ?? "");
  const [interiorType, setInteriorType] = useState(vehicleOptions["interior_type"]?.[0] ?? "");
  const [price, setPrice] = useState<number | "">("");
  const [chassisNo, setChassisNo] = useState("");
  const [engineCc, setEngineCc] = useState<number | "">("");
  const [engineCylinders, setEngineCylinders] = useState<number | "">("");
  const [details, setDetails] = useState("");
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const modelsForMake = carModels[make] ?? [];
  const yearOptions = useMemo(() => {
    if (!yearRange) return [];
    const years: number[] = [];
    for (let y = yearRange.maxYear; y >= yearRange.minYear; y--) years.push(y);
    return years;
  }, [yearRange]);

  const onPhotosChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setError(null);
    setUploadingPhotos(true);
    try {
      for (const file of files) {
        const base64 = await fileToBase64(file);
        const { path } = await uploadListingPhotoFn({
          data: { fileName: file.name, contentType: file.type, base64 },
        });
        setPhotos((prev) => [...prev, { path, previewUrl: URL.createObjectURL(file) }]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Photo upload failed");
    } finally {
      setUploadingPhotos(false);
    }
  };

  const removePhoto = (path: string) => {
    setPhotos((prev) => {
      const found = prev.find((p) => p.path === path);
      if (found) URL.revokeObjectURL(found.previewUrl);
      return prev.filter((p) => p.path !== path);
    });
  };

  const vehicleStepValid = make.trim() && model.trim() && year > 1900 && mileageKm >= 0;
  const specsStepValid = fuel.trim().length > 0;
  const stepValid = step === 0 ? vehicleStepValid : step === 1 ? specsStepValid : true;
  const canSubmit = vehicleStepValid && specsStepValid && !submitting;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const input: ListingInput = {
        make: make.trim(),
        model: model.trim(),
        trim: trim.trim() || undefined,
        year,
        condition,
        mileageKm,
        fuel: fuel.trim(),
        city: city.trim() || undefined,
        seats,
        bodyType: bodyType.trim() || undefined,
        exteriorColor: exteriorColor.trim() || undefined,
        interiorColor: interiorColor.trim() || undefined,
        option: option.trim() || undefined,
        carOrigin: carOrigin.trim() || undefined,
        price: price === "" ? undefined : price,
        chassis_no: chassisNo.trim() || undefined,
        engine_cc: engineCc === "" ? undefined : engineCc,
        engine_cylinders: engineCylinders === "" ? undefined : engineCylinders,
        gear_type: gearType.trim() || undefined,
        roof_type: roofType.trim() || undefined,
        interior_type: interiorType.trim() || undefined,
        details: details.trim() || undefined,
        photo_paths: photos.map((p) => p.path),
      };
      const { id } = await submitCarListingFn({ data: input });
      onSubmitted(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit your listing");
    } finally {
      setSubmitting(false);
    }
  };

  const selectClass =
    "w-full rounded-control bg-panel-2 px-3 py-2 text-sm outline-none ring-1 ring-panel-fg/10 focus:ring-brass";

  const reviewRows: [string, string][] = [
    ["Vehicle", [year, make, model, trim].filter(Boolean).join(" ")],
    ["Condition", condition],
    ["Mileage", `${mileageKm.toLocaleString("en-US")} km`],
    ["City", city || "—"],
    ["Body type", bodyType || "—"],
    ["Seats", String(seats)],
    ["Fuel", fuel || "—"],
    ["Gear type", gearType || "—"],
    ["Exterior / interior", `${exteriorColor || "—"} / ${interiorColor || "—"}`],
    ["Option", option || "—"],
    ["Origin", carOrigin || "—"],
    [
      "Asking price",
      price === "" ? "Let Yalhacar suggest one" : `SAR ${price.toLocaleString("en-US")}`,
    ],
    ["Photos", `${photos.length} added`],
  ];

  return (
    <div className="rounded-panel bg-panel p-6 text-panel-fg ring-1 ring-panel-fg/10">
      <h3 className="font-display text-lg font-semibold">Tell us about your car</h3>
      <p className="mt-1 text-sm text-panel-fg/60">
        Submitted for review — our team fills in anything missing and publishes it once approved.
      </p>

      <WizardProgress step={step} />

      {step === 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Make">
            {carMakes.length > 0 ? (
              <select
                value={make}
                onChange={(e) => {
                  const nextMake = e.target.value;
                  setMake(nextMake);
                  setModel(carModels[nextMake]?.[0] ?? "");
                }}
                className={selectClass}
              >
                {carMakes.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={make}
                onChange={(e) => setMake(e.target.value)}
                className={selectClass}
              />
            )}
          </Field>
          <Field label="Model">
            {modelsForMake.length > 0 ? (
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className={selectClass}
              >
                {modelsForMake.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className={selectClass}
              />
            )}
          </Field>
          <Field label="Trim" optional>
            <input value={trim} onChange={(e) => setTrim(e.target.value)} className={selectClass} />
          </Field>
          <Field label="Year">
            {yearOptions.length > 0 ? (
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className={selectClass}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className={selectClass}
              />
            )}
          </Field>
          <Field label="Condition">
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as typeof condition)}
              className={selectClass}
            >
              <option value="New">New</option>
              <option value="Used">Used</option>
              <option value="Certified">Certified</option>
            </select>
          </Field>
          <Field label="Mileage (km)">
            <input
              type="number"
              value={mileageKm}
              onChange={(e) => setMileageKm(Number(e.target.value))}
              className={selectClass}
            />
          </Field>
          <Field label="City">
            <select value={city} onChange={(e) => setCity(e.target.value)} className={selectClass}>
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Body type">
            {bodyTypes.length > 0 ? (
              <select
                value={bodyType}
                onChange={(e) => setBodyType(e.target.value)}
                className={selectClass}
              >
                {bodyTypes.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={bodyType}
                onChange={(e) => setBodyType(e.target.value)}
                className={selectClass}
              />
            )}
          </Field>
          <Field label="Seats">
            <input
              type="number"
              value={seats}
              onChange={(e) => setSeats(Number(e.target.value))}
              className={selectClass}
            />
          </Field>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Fuel">
            {vehicleOptions["fuel_type"] ? (
              <select
                value={fuel}
                onChange={(e) => setFuel(e.target.value)}
                className={selectClass}
              >
                {vehicleOptions["fuel_type"].map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={fuel}
                onChange={(e) => setFuel(e.target.value)}
                className={selectClass}
              />
            )}
          </Field>
          <Field label="Gear type" optional>
            {vehicleOptions["gear_type"] ? (
              <select
                value={gearType}
                onChange={(e) => setGearType(e.target.value)}
                className={selectClass}
              >
                {vehicleOptions["gear_type"].map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={gearType}
                onChange={(e) => setGearType(e.target.value)}
                className={selectClass}
              />
            )}
          </Field>
          <Field label="Exterior color" optional>
            {vehicleOptions["color"] ? (
              <select
                value={exteriorColor}
                onChange={(e) => setExteriorColor(e.target.value)}
                className={selectClass}
              >
                {vehicleOptions["color"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={exteriorColor}
                onChange={(e) => setExteriorColor(e.target.value)}
                className={selectClass}
              />
            )}
          </Field>
          <Field label="Interior color" optional>
            {vehicleOptions["color"] ? (
              <select
                value={interiorColor}
                onChange={(e) => setInteriorColor(e.target.value)}
                className={selectClass}
              >
                {vehicleOptions["color"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={interiorColor}
                onChange={(e) => setInteriorColor(e.target.value)}
                className={selectClass}
              />
            )}
          </Field>
          <Field label="Option" optional>
            <select
              value={option}
              onChange={(e) => setOption(e.target.value)}
              className={selectClass}
            >
              {OPTION_LEVELS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Origin" optional>
            <select
              value={carOrigin}
              onChange={(e) => setCarOrigin(e.target.value)}
              className={selectClass}
            >
              {CAR_ORIGINS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Roof type" optional>
            {vehicleOptions["roof_type"] ? (
              <select
                value={roofType}
                onChange={(e) => setRoofType(e.target.value)}
                className={selectClass}
              >
                {vehicleOptions["roof_type"].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={roofType}
                onChange={(e) => setRoofType(e.target.value)}
                className={selectClass}
              />
            )}
          </Field>
          <Field label="Interior type" optional>
            {vehicleOptions["interior_type"] ? (
              <select
                value={interiorType}
                onChange={(e) => setInteriorType(e.target.value)}
                className={selectClass}
              >
                {vehicleOptions["interior_type"].map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={interiorType}
                onChange={(e) => setInteriorType(e.target.value)}
                className={selectClass}
              />
            )}
          </Field>
          <Field label="Asking price, SAR" optional>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
              className={selectClass}
            />
          </Field>
          <Field label="Chassis number" optional>
            <input
              dir="ltr"
              value={chassisNo}
              onChange={(e) => setChassisNo(e.target.value)}
              className={selectClass}
            />
          </Field>
          <Field label="Engine size, cc" optional>
            <input
              type="number"
              value={engineCc}
              onChange={(e) => setEngineCc(e.target.value === "" ? "" : Number(e.target.value))}
              className={selectClass}
            />
          </Field>
          <Field label="Engine cylinders" optional>
            <input
              type="number"
              value={engineCylinders}
              onChange={(e) =>
                setEngineCylinders(e.target.value === "" ? "" : Number(e.target.value))
              }
              className={selectClass}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description" optional>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                className={selectClass}
              />
            </Field>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onPhotosChange}
          />
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            disabled={uploadingPhotos}
            className="flex w-full flex-col items-center gap-2 rounded-control border-2 border-dashed border-panel-fg/15 bg-panel-2/50 px-4 py-8 text-sm font-medium text-panel-fg/70 transition-colors hover:border-brass/40 hover:text-panel-fg disabled:opacity-60"
          >
            {uploadingPhotos ? (
              <Loader2 className="size-6 animate-spin text-brass" />
            ) : (
              <Upload className="size-6 text-brass" />
            )}
            {uploadingPhotos ? "Uploading…" : "Click to add photos"}
            <span className="text-xs font-normal text-panel-fg/45">
              Exterior, interior, dashboard — as many as you like
            </span>
          </button>

          {photos.length > 0 ? (
            <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
              {photos.map((p) => (
                <div key={p.path} className="group relative aspect-square">
                  <img
                    src={p.previewUrl}
                    alt=""
                    className="size-full rounded-control object-cover ring-1 ring-panel-fg/10"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(p.path)}
                    aria-label="Remove photo"
                    className="absolute -top-1.5 -end-1.5 grid size-5 place-items-center rounded-full bg-destructive text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-panel-fg/45">
              Photos are optional but listings with them get reviewed faster.
            </p>
          )}
        </div>
      ) : null}

      {step === 3 ? (
        <div>
          <div className="overflow-hidden rounded-control ring-1 ring-panel-fg/10">
            {reviewRows.map(([label, value], i) => (
              <div
                key={label}
                className={`flex items-center justify-between gap-4 px-4 py-2.5 text-sm ${
                  i % 2 === 0 ? "bg-panel-2/50" : ""
                }`}
              >
                <span className="text-panel-fg/55">{label}</span>
                <span className="text-right font-medium">{value}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-panel-fg/45">
            Anything you left blank, our team fills in during review — you can always update it once
            your listing is live.
          </p>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

      <div className="mt-5 flex gap-2.5">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="inline-flex items-center gap-1 rounded-control bg-panel-2 px-4 py-2.5 text-sm font-medium text-panel-fg/70 ring-1 ring-panel-fg/10 hover:text-panel-fg"
          >
            <ChevronLeft className="size-4" /> Back
          </button>
        ) : null}
        {step < WIZARD_STEPS.length - 1 ? (
          <button
            type="button"
            disabled={!stepValid}
            onClick={() => setStep((s) => s + 1)}
            className="ml-auto inline-flex items-center gap-1 rounded-control bg-brass px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Next <ChevronRight className="size-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled={!canSubmit}
            onClick={submit}
            className="ml-auto rounded-control bg-brass px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit for review"}
          </button>
        )}
      </div>
    </div>
  );
}

function SubmittedNotice({
  reference,
  onListAnother,
}: {
  reference: string;
  onListAnother: () => void;
}) {
  return (
    <div className="rounded-panel bg-panel p-6 text-panel-fg ring-1 ring-panel-fg/10">
      <div className="flex items-center gap-2 text-brass-2">
        <CheckCircle2 className="size-5" />
        <span className="font-display text-lg font-semibold">Submitted for review</span>
      </div>
      <p className="mt-2 text-sm text-panel-fg/60">
        Reference <span className="num font-medium text-panel-fg">{reference}</span>. Our team will
        review your listing and publish it once approved.
      </p>
      <button
        type="button"
        onClick={onListAnother}
        className="mt-4 rounded-control bg-panel-2 px-4 py-2 text-sm font-medium text-panel-fg/80 ring-1 ring-panel-fg/10 hover:text-panel-fg"
      >
        List another car
      </button>
    </div>
  );
}
