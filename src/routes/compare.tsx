import { createFileRoute, Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { listCars, type Car } from "@/data/cars";
import { useLocale, useT } from "@/lib/i18n/context";
import { formatNumber, formatSar, tr } from "@/lib/i18n/dictionary";

const compareSearchSchema = z.object({
  car: z.string().optional(),
});

export const Route = createFileRoute("/compare")({
  validateSearch: compareSearchSchema,
  loader: () => listCars(),
  head: () => ({
    meta: [
      { title: "Compare Cars — Yalhacar" },
      {
        name: "description",
        content: "Compare cars side by side — price, monthly payment, specs and warranty.",
      },
    ],
  }),
  component: ComparePage,
});

function ComparePage() {
  const cars = Route.useLoaderData();
  const t = useT();
  const { locale } = useLocale();
  const search = Route.useSearch();
  const [ids, setIds] = useState<string[]>(["", "", ""]);

  useEffect(() => {
    if (search.car && cars.some((c) => c.id === search.car)) {
      setIds((prev) => (prev[0] ? prev : [search.car!, prev[1] ?? "", prev[2] ?? ""]));
    }
  }, [search.car, cars]);

  const selected = useMemo(
    () => ids.map((id) => cars.find((c) => c.id === id)).filter((c): c is Car => Boolean(c)),
    [ids, cars],
  );

  const specLabels = useMemo(() => {
    const seen = new Set<string>();
    const order: string[] = [];
    for (const car of selected) {
      for (const spec of car.specs) {
        if (!seen.has(spec.label)) {
          seen.add(spec.label);
          order.push(spec.label);
        }
      }
    }
    return order;
  }, [selected]);

  return (
    <div className="bg-paper">
      <div className="mx-auto max-w-[1360px] px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-8">
          <div className="mb-2 text-[11px] tracking-[0.2em] text-brass uppercase">
            {t.compare.eyebrow}
          </div>
          <h1 className="text-balance font-display text-3xl font-semibold tracking-tight">
            {t.compare.heading}
          </h1>
          <p className="mt-2 max-w-[60ch] text-sm text-ink/55">{t.compare.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {ids.map((id, i) => (
            <label key={i} className="block">
              <span className="mb-1.5 block text-[11px] tracking-[0.1em] text-sand-fg/55 uppercase">
                {t.compare.selectLabel} {i + 1}
              </span>
              <CarPicker
                cars={cars}
                value={id}
                onChange={(carId) => {
                  const next = [...ids];
                  next[i] = carId;
                  setIds(next);
                }}
              />
            </label>
          ))}
        </div>

        {selected.length === 0 ? (
          <div className="mt-8 rounded-panel bg-sand p-10 text-center text-sm text-sand-fg/70 ring-1 ring-hairline">
            {t.compare.addPrompt}
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto rounded-panel bg-sand text-sand-fg ring-1 ring-hairline">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="w-40 border-b border-hairline p-4 text-left text-[11px] tracking-[0.1em] text-sand-fg/55 uppercase">
                    {t.compare.specifications}
                  </th>
                  {selected.map((car) => (
                    <th key={car.id} className="border-b border-hairline p-4 text-left">
                      <Link
                        to="/cars/$carId"
                        params={{ carId: car.id }}
                        className="block overflow-hidden rounded-control ring-1 ring-hairline"
                      >
                        <img
                          src={car.image}
                          alt={car.title}
                          className="aspect-[4/3] w-full object-cover"
                        />
                      </Link>
                      <Link
                        to="/cars/$carId"
                        params={{ carId: car.id }}
                        className="mt-2 block font-display text-sm font-medium hover:underline"
                      >
                        {car.title}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <CompareRow label={t.compare.priceLabel}>
                  {selected.map((car) => (
                    <td key={car.id} className="num border-b border-hairline p-4 font-semibold">
                      {formatSar(car.price, locale)}
                    </td>
                  ))}
                </CompareRow>
                <CompareRow label={t.compare.monthlyLabel}>
                  {selected.map((car) => (
                    <td key={car.id} className="num border-b border-hairline p-4 text-sand-accent">
                      {formatSar(car.monthly, locale)}
                    </td>
                  ))}
                </CompareRow>
                <CompareRow label={t.buy.conditionLabel}>
                  {selected.map((car) => (
                    <td key={car.id} className="border-b border-hairline p-4">
                      {tr(car.condition, locale)}
                    </td>
                  ))}
                </CompareRow>
                <CompareRow label={t.compare.mileageLabel}>
                  {selected.map((car) => (
                    <td key={car.id} className="num border-b border-hairline p-4">
                      {formatNumber(car.mileageKm, locale)} KM
                    </td>
                  ))}
                </CompareRow>
                <CompareRow label={t.buy.cityLabel}>
                  {selected.map((car) => (
                    <td key={car.id} className="border-b border-hairline p-4">
                      {tr(car.city, locale)}
                    </td>
                  ))}
                </CompareRow>
                <CompareRow label={t.buy.fuelLabel}>
                  {selected.map((car) => (
                    <td key={car.id} className="border-b border-hairline p-4">
                      {tr(car.fuel, locale)}
                    </td>
                  ))}
                </CompareRow>
                <CompareRow label={t.buy.bodyTypeLabel}>
                  {selected.map((car) => (
                    <td key={car.id} className="border-b border-hairline p-4">
                      {tr(car.bodyType, locale)}
                    </td>
                  ))}
                </CompareRow>
                {specLabels.map((label) => (
                  <CompareRow key={label} label={tr(label, locale)}>
                    {selected.map((car) => {
                      const spec = car.specs.find((s) => s.label === label);
                      return (
                        <td key={car.id} className="border-b border-hairline p-4 text-sand-fg/85">
                          {spec ? spec.value : "—"}
                        </td>
                      );
                    })}
                  </CompareRow>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const MAX_RESULTS = 30;

function CarPicker({
  cars,
  value,
  onChange,
}: {
  cars: Car[];
  value: string;
  onChange: (carId: string) => void;
}) {
  const t = useT();
  const selectedCar = cars.find((c) => c.id === value) ?? null;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? cars.filter((c) =>
          [c.title, c.make, c.model].some((field) => field.toLowerCase().includes(q)),
        )
      : cars;
    return filtered.slice(0, MAX_RESULTS);
  }, [cars, query]);

  const select = (carId: string) => {
    onChange(carId);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <input
        value={open ? query : (selectedCar?.title ?? "")}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        placeholder={t.compare.searchPlaceholder}
        className="w-full rounded-control bg-sand px-3 py-2.5 pr-8 text-sm text-sand-fg outline-none ring-1 ring-hairline placeholder:text-sand-fg/40"
      />
      {selectedCar && !open ? (
        <button
          type="button"
          onClick={() => select("")}
          aria-label={t.compare.clearSelection}
          className="absolute inset-y-0 right-2 my-auto text-sand-fg/40 hover:text-sand-fg"
        >
          <X className="size-4" />
        </button>
      ) : null}

      {open ? (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-control bg-paper p-1 shadow-lg ring-1 ring-hairline">
          <button
            type="button"
            onClick={() => select("")}
            className="block w-full rounded-control px-2 py-2 text-left text-sm text-ink/50 hover:bg-sand/60"
          >
            {t.compare.none}
          </button>
          {results.length ? (
            results.map((car) => (
              <button
                key={car.id}
                type="button"
                onClick={() => select(car.id)}
                className="flex w-full items-center gap-2 rounded-control px-2 py-2 text-left text-sm hover:bg-sand/60"
              >
                <img
                  src={car.image}
                  alt=""
                  loading="lazy"
                  className="size-10 shrink-0 rounded-[6px] object-cover ring-1 ring-hairline"
                />
                <span className="min-w-0 flex-1 truncate">{car.title}</span>
              </button>
            ))
          ) : (
            <div className="px-2 py-3 text-center text-sm text-ink/40">{t.compare.noMatches}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function CompareRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr>
      <td className="border-b border-hairline p-4 text-[11px] tracking-[0.1em] text-sand-fg/55 uppercase">
        {label}
      </td>
      {children}
    </tr>
  );
}
