import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { CarCard } from "@/components/CarCard";
import { CITIES, listCars } from "@/data/cars";
import { useLocale, useT } from "@/lib/i18n/context";
import { formatNumber, formatSar, tr } from "@/lib/i18n/dictionary";

const buySearchSchema = z.object({
  make: z.string().optional(),
  condition: z.enum(["All", "New", "Used", "Certified"]).optional(),
  city: z.string().optional(),
  color: z.string().optional(),
  bodyType: z.string().optional(),
  maxPrice: z.number().optional(),
});

export const Route = createFileRoute("/buy")({
  validateSearch: buySearchSchema,
  loader: () => listCars(),
  head: () => ({
    meta: [
      { title: "Buy Cars in Saudi Arabia — New, Used & Certified | Yalhacar" },
      {
        name: "description",
        content:
          "Search inspected new, used and certified cars across Riyadh, Jeddah and Dammam. Filter by make, price, monthly payment, body type and fuel.",
      },
      { property: "og:title", content: "Buy Cars in Saudi Arabia — Yalhacar" },
      {
        property: "og:description",
        content:
          "Inspected inventory with transparent SAR pricing, monthly payment filters and finance-ready listings.",
      },
    ],
  }),
  component: BuyPage,
});

const conditions = ["All", "New", "Used", "Certified"] as const;
const bodyTypes = [
  "All",
  "SUV",
  "Sedan",
  "Coupe",
  "Pick Up",
  "Hatchback",
  "Van",
  "MPV",
  "Crossover",
] as const;
const fuels = ["All", "Petrol", "Diesel", "Hybrid", "Electric"] as const;
const colors = ["All", "Red", "Black", "White", "Grey", "Blue"] as const;
const sortKeys = [
  "Recommended",
  "Price: Low to high",
  "Price: High to low",
  "Year: Newest first",
  "Mileage: Lowest first",
] as const;

function BuyPage() {
  const cars = Route.useLoaderData();
  const makes = useMemo(
    () => ["All", ...Array.from(new Set(cars.map((c) => c.make))).sort()],
    [cars],
  );
  const t = useT();
  const { locale } = useLocale();
  const search = Route.useSearch();
  const [make, setMake] = useState<string[]>(search.make ? search.make.split(",") : []);
  const [condition, setCondition] = useState<(typeof conditions)[number]>(
    search.condition ?? "All",
  );
  const [city, setCity] = useState(search.city ?? "All");
  const [bodyType, setBodyType] = useState<string>(search.bodyType ?? "All");
  const [fuel, setFuel] = useState<(typeof fuels)[number]>("All");
  const [color, setColor] = useState<string>(search.color ?? "All");
  const [maxPrice, setMaxPrice] = useState(search.maxPrice ?? 450000);
  const [maxMonthly, setMaxMonthly] = useState(8000);
  const [sort, setSort] = useState<(typeof sortKeys)[number]>("Recommended");

  useEffect(() => {
    if (search.make) setMake(search.make.split(","));
  }, [search.make]);

  useEffect(() => {
    if (search.condition) setCondition(search.condition);
  }, [search.condition]);

  useEffect(() => {
    if (search.city) setCity(search.city);
  }, [search.city]);

  useEffect(() => {
    if (search.bodyType) setBodyType(search.bodyType);
  }, [search.bodyType]);

  useEffect(() => {
    if (search.maxPrice) setMaxPrice(search.maxPrice);
  }, [search.maxPrice]);

  useEffect(() => {
    if (search.color) setColor(search.color);
  }, [search.color]);

  const results = useMemo(() => {
    const filtered = cars.filter(
      (car) =>
        (make.length === 0 || make.includes(car.make)) &&
        (condition === "All" || car.condition === condition) &&
        (city === "All" || car.city === city) &&
        (bodyType === "All" || car.bodyType === bodyType) &&
        (fuel === "All" || car.fuel === fuel) &&
        (color === "All" || car.exteriorColor.toLowerCase().includes(color.toLowerCase())) &&
        car.price <= maxPrice &&
        car.monthly <= maxMonthly,
    );

    const sorted = [...filtered];
    switch (sort) {
      case "Price: Low to high":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "Price: High to low":
        sorted.sort((a, b) => b.price - a.price);
        break;
      case "Year: Newest first":
        sorted.sort((a, b) => b.year - a.year);
        break;
      case "Mileage: Lowest first":
        sorted.sort((a, b) => a.mileageKm - b.mileageKm);
        break;
    }
    return sorted;
  }, [cars, make, condition, city, bodyType, fuel, color, maxPrice, maxMonthly, sort]);

  const conditionOptions = conditions.map((c) => ({
    value: c,
    label: c === "All" ? t.buy.all : tr(c, locale),
  }));
  const bodyTypeOptions = bodyTypes.map((b) => ({
    value: b,
    label: b === "All" ? t.buy.all : tr(b, locale),
  }));
  const fuelOptions = fuels.map((f) => ({
    value: f,
    label: f === "All" ? t.buy.all : tr(f, locale),
  }));
  const colorOptions = colors.map((c) => ({
    value: c,
    label: c === "All" ? t.buy.all : tr(c, locale),
  }));

  const makeCounts = makes
    .filter((m) => m !== "All")
    .map((m) => ({ make: m, count: cars.filter((c) => c.make === m).length }));

  const hasActiveFilters =
    make.length > 0 ||
    condition !== "All" ||
    city !== "All" ||
    bodyType !== "All" ||
    fuel !== "All" ||
    color !== "All" ||
    maxPrice !== 450000 ||
    maxMonthly !== 8000;

  const clearAll = () => {
    setMake([]);
    setCondition("All");
    setCity("All");
    setBodyType("All");
    setFuel("All");
    setColor("All");
    setMaxPrice(450000);
    setMaxMonthly(8000);
  };

  return (
    <div className="bg-paper">
      <div className="mx-auto max-w-[1360px] px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-6">
          <div className="mb-2 text-[11px] tracking-[0.2em] text-brass uppercase">
            {t.buy.eyebrow}
          </div>
          <h1 className="text-balance font-display text-3xl font-semibold tracking-tight">
            {t.buy.heading}
          </h1>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="h-fit rounded-panel bg-sand p-5 text-sand-fg ring-1 ring-hairline">
            <div className="mb-4 flex items-center justify-between border-b border-hairline pb-4">
              <div className="font-display text-base font-semibold">{t.buy.filtersHeading}</div>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs font-medium text-sand-accent hover:underline"
                >
                  {t.buy.clearAll}
                </button>
              ) : (
                <span className="text-xs text-sand-fg/55">{t.buy.noFilterApplied}</span>
              )}
            </div>

            <FilterGroup label={t.buy.makeLabel}>
              <div className="space-y-2">
                {makeCounts.map(({ make: m, count }) => (
                  <label
                    key={m}
                    className="flex cursor-pointer items-center justify-between gap-2 text-sm"
                  >
                    <span className="flex items-center gap-2 text-sand-fg/90">
                      <input
                        type="checkbox"
                        checked={make.includes(m)}
                        onChange={() =>
                          setMake((prev) =>
                            prev.includes(m) ? prev.filter((v) => v !== m) : [...prev, m],
                          )
                        }
                        className="accent-brass"
                      />
                      {m}
                    </span>
                    <span className="text-xs text-sand-fg/55">({formatNumber(count, locale)})</span>
                  </label>
                ))}
              </div>
            </FilterGroup>

            <FilterGroup label={t.buy.conditionLabel}>
              <ChipRow
                options={conditionOptions}
                value={condition}
                onChange={(v) => setCondition(v as (typeof conditions)[number])}
              />
            </FilterGroup>

            <FilterGroup label={t.buy.cityLabel}>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-control bg-paper px-3 py-2.5 text-sm outline-none ring-1 ring-hairline"
              >
                <option value="All">{t.buy.allCities}</option>
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {tr(c, locale)}
                  </option>
                ))}
              </select>
            </FilterGroup>

            <FilterGroup label={t.buy.bodyTypeLabel}>
              <ChipRow
                options={bodyTypeOptions}
                value={bodyType}
                onChange={(v) => setBodyType(v)}
              />
            </FilterGroup>

            <FilterGroup label={t.buy.fuelLabel}>
              <ChipRow
                options={fuelOptions}
                value={fuel}
                onChange={(v) => setFuel(v as (typeof fuels)[number])}
              />
            </FilterGroup>

            <FilterGroup label={t.buy.colorLabel}>
              <ChipRow
                options={colorOptions}
                value={color}
                onChange={(v) => setColor(v as (typeof colors)[number])}
              />
            </FilterGroup>

            <FilterGroup label={`${t.buy.maxPriceLabel} · ${formatSar(maxPrice, locale)}`}>
              <input
                type="range"
                min={50000}
                max={450000}
                step={5000}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-brass"
              />
            </FilterGroup>

            <FilterGroup label={`${t.buy.maxMonthlyLabel} · ${formatSar(maxMonthly, locale)}`}>
              <input
                type="range"
                min={1000}
                max={8000}
                step={100}
                value={maxMonthly}
                onChange={(e) => setMaxMonthly(Number(e.target.value))}
                className="w-full accent-brass"
              />
            </FilterGroup>
          </aside>

          <div>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-ink/50">
                {formatNumber(results.length, locale)} {t.buy.resultsSuffix(results.length)}
              </p>
              <label className="flex items-center gap-2 text-sm">
                <span className="text-ink/40">{t.buy.sortLabel}</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as (typeof sortKeys)[number])}
                  className="rounded-control bg-sand px-3 py-2 text-sm text-sand-fg outline-none ring-1 ring-hairline"
                >
                  {sortKeys.map((s, i) => (
                    <option key={s} value={s}>
                      {t.buy.sortOptions[i]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {results.length ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {results.map((car) => (
                  <CarCard key={car.id} car={car} />
                ))}
              </div>
            ) : (
              <div className="rounded-panel bg-sand p-10 text-center text-sm text-sand-fg/70 ring-1 ring-hairline">
                {t.buy.emptyState}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 last:mb-0">
      <div className="mb-2 text-[11px] tracking-[0.14em] text-sand-fg/55 uppercase">{label}</div>
      {children}
    </div>
  );
}

function ChipRow({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={
            option.value === value
              ? "rounded-full bg-brass px-2.5 py-1 text-xs font-medium text-white"
              : "rounded-full bg-paper px-2.5 py-1 text-xs text-ink/60 ring-1 ring-hairline"
          }
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
