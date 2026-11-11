import { Link } from "@tanstack/react-router";
import { Calendar, ChevronLeft, ChevronRight, Gauge, Heart } from "lucide-react";
import { useState } from "react";
import { useFavorites } from "@/lib/favorites";
import { useLocale, useT } from "@/lib/i18n/context";
import { formatNumber, formatSar, tr } from "@/lib/i18n/dictionary";
import { cn } from "@/lib/utils";
import { carAvailability, type Car } from "@/data/cars";

export function CarCard({ car }: { car: Car }) {
  const t = useT();
  const { locale } = useLocale();
  const [active, setActive] = useState(0);
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(car.id);
  const status = carAvailability(car);

  const discount =
    car.wasPrice && car.wasPrice > car.price
      ? `-${(((car.wasPrice - car.price) / car.wasPrice) * 100).toFixed(1)}%`
      : null;

  const goPrev = (e: React.MouseEvent) => {
    e.preventDefault();
    setActive((i) => (i - 1 + car.gallery.length) % car.gallery.length);
  };
  const goNext = (e: React.MouseEvent) => {
    e.preventDefault();
    setActive((i) => (i + 1) % car.gallery.length);
  };

  return (
    <article className="group overflow-hidden rounded-card bg-sand text-sand-fg ring-1 ring-hairline transition-transform hover:-translate-y-1">
      <div className="relative">
        <Link to="/cars/$carId" params={{ carId: car.id }}>
          <img
            src={car.gallery[active]}
            alt={car.title}
            loading="lazy"
            width={1024}
            height={768}
            className={cn(
              "aspect-[4/3] w-full object-cover",
              status !== "available" && "opacity-60",
            )}
          />
        </Link>

        {status !== "available" ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-black/85 px-3 py-1.5 font-display text-xs font-semibold uppercase tracking-[0.14em] text-white backdrop-blur">
              {status === "sold" ? t.carDetail.statusSold : t.carDetail.statusReserved}
            </span>
          </div>
        ) : null}

        <span className="absolute bottom-2 start-2 rounded-[4px] bg-black/80 px-1.5 py-0.5 font-display text-[10px] font-semibold text-brass-2 backdrop-blur">
          Y
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            toggleFavorite(car.id);
          }}
          aria-label={favorite ? t.carCard.removeFavorite : t.carCard.addFavorite}
          aria-pressed={favorite}
          className="absolute top-3 end-3 grid size-8 place-items-center rounded-full bg-black/70 text-white backdrop-blur transition-colors hover:bg-black/90"
        >
          <Heart className={cn("size-4", favorite && "fill-brass text-brass")} />
        </button>

        {car.gallery.length > 1 ? (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label={t.hero.prevSlide}
              className="absolute top-1/2 start-2 grid size-6 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <ChevronLeft className="size-3.5 rtl:rotate-180" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label={t.hero.nextSlide}
              className="absolute top-1/2 end-2 grid size-6 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <ChevronRight className="size-3.5 rtl:rotate-180" />
            </button>
            <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1">
              {car.gallery.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1 rounded-full transition-all",
                    i === active ? "w-4 bg-brass" : "w-1 bg-white/70",
                  )}
                />
              ))}
            </div>
          </>
        ) : null}

        <div className="absolute top-3 start-3 flex flex-col gap-1.5">
          <span className="rounded-full bg-black/80 px-2 py-1 text-[10px] font-medium text-white backdrop-blur">
            {tr(car.sellerType, locale)}
          </span>
        </div>
      </div>

      <div className="p-4">
        <Link
          to="/cars/$carId"
          params={{ carId: car.id }}
          className="line-clamp-1 font-display text-[15px] leading-tight font-medium"
        >
          {car.title}
        </Link>

        <div className="mt-1.5 flex items-center gap-3 text-xs text-sand-fg/65">
          <span className="inline-flex items-center gap-1">
            <Calendar className="size-3.5 text-sand-fg/50" /> {formatNumber(car.year, locale)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Gauge className="size-3.5 text-sand-fg/50" /> {formatNumber(car.mileageKm, locale)} km
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="num font-display text-xl leading-none font-semibold">
            {formatSar(car.price, locale)}
          </div>
          <div className="num font-display text-sm leading-none font-semibold text-sand-accent">
            {formatSar(car.monthly, locale)}/{locale === "ar" ? "شهر" : "mo"}
          </div>
        </div>

        <div className="mt-1.5 flex h-[22px] items-center gap-2">
          {car.wasPrice ? (
            <>
              <span className="num text-xs text-sand-fg/45 line-through">
                {formatSar(car.wasPrice, locale)}
              </span>
              {discount ? (
                <span className="rounded-full bg-sand-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-sand-accent">
                  {discount}
                </span>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="mt-3 flex h-[26px] flex-nowrap items-center gap-1.5 overflow-hidden">
          {car.badges[0] ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium text-sand-accent ring-1 ring-sand-accent/40">
              ✓ {tr(car.badges[0], locale)}
            </span>
          ) : null}
          {car.badges.slice(1).map((badge) => (
            <span
              key={badge}
              className="shrink-0 rounded-full bg-hairline px-2 py-0.5 text-[10px] font-medium text-sand-fg/80"
            >
              {tr(badge, locale)}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}
