import { CarPhoto } from "@/components/CarPhoto";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

export type HeroSlide =
  | {
      kind: "intro";
      image: string;
      alt: string;
      eyebrow: string;
      title: string;
      subtitle: string;
    }
  | {
      kind: "car";
      carId: string;
      image: string;
      alt: string;
      eyebrow: string;
      title: string;
      subtitle: string;
    };

const AUTOPLAY_MS = 5500;

export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [active, setActive] = useState(0);
  const slide = slides[active] ?? slides[0];
  const t = useT();

  useEffect(() => {
    if (slides.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = setInterval(() => {
      setActive((i) => (i + 1) % slides.length);
    }, AUTOPLAY_MS);

    return () => clearInterval(id);
  }, [active, slides.length]);

  const goPrev = () => setActive((i) => (i - 1 + slides.length) % slides.length);
  const goNext = () => setActive((i) => (i + 1) % slides.length);

  if (!slide) return null;

  return (
    <section className="relative -mt-16 min-h-[100dvh] overflow-hidden bg-black text-white">
      {slides.map((s, i) => (
        <CarPhoto
          key={i}
          src={s.image}
          alt={s.alt}
          aria-hidden={i !== active}
          loading={i === 0 ? "eager" : "lazy"}
          className={cn(
            "absolute inset-0 h-full w-full transition-opacity duration-1000 ease-in-out",
            i === active ? "opacity-100" : "opacity-0",
          )}
        />
      ))}

      {/* Subtle overall depth, not a heavy wash — the photo stays the focal point.
          This whole hero is composited on a photo, so it deliberately stays
          dark regardless of site theme (bg-black/text-white, not the
          panel tokens which now flip with light/dark). */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-black/10" />

      <div className="absolute inset-0 z-[5] flex items-center px-5 py-10 sm:px-8">
        <div className="mx-auto w-full max-w-[1360px]">
          <div
            key={active}
            className="rise max-w-[34ch] rounded-panel bg-black/45 p-6 shadow-2xl ring-1 ring-white/10 backdrop-blur-sm sm:p-8"
          >
            <div className="mb-4 inline-flex items-center gap-2 text-[11px] tracking-[0.2em] text-brass-2 uppercase">
              <span className="size-1.5 rounded-full bg-brass" /> {slide.eyebrow}
            </div>
            <h1 className="text-balance font-display text-[28px] leading-[1.08] font-semibold tracking-tight text-white sm:text-[42px]">
              {slide.title}
            </h1>
            <p className="mt-4 text-pretty text-base leading-relaxed text-white/70">
              {slide.subtitle}
            </p>
            <div className="mt-6">
              {slide.kind === "car" ? (
                <Link
                  to="/cars/$carId"
                  params={{ carId: slide.carId }}
                  className="inline-flex items-center gap-2 rounded-control bg-brass px-5 py-3 font-display text-sm font-medium text-white transition-colors hover:bg-brass-2"
                >
                  {t.hero.viewCar}
                </Link>
              ) : (
                <Link
                  to="/buy"
                  className="inline-flex items-center gap-2 rounded-control bg-brass px-5 py-3 font-display text-sm font-medium text-white transition-colors hover:bg-brass-2"
                >
                  {t.hero.browseInventory}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {slides.length > 1 ? (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label={t.hero.prevSlide}
            className="absolute top-1/2 start-3 z-10 hidden size-9 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white ring-1 ring-white/20 backdrop-blur transition-colors hover:bg-black/70 sm:grid"
          >
            <ChevronLeft className="size-4 rtl:rotate-180" />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label={t.hero.nextSlide}
            className="absolute top-1/2 end-3 z-10 hidden size-9 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white ring-1 ring-white/20 backdrop-blur transition-colors hover:bg-black/70 sm:grid"
          >
            <ChevronRight className="size-4 rtl:rotate-180" />
          </button>

          <div className="absolute inset-x-0 bottom-5 z-10 flex justify-center">
            <div className="flex items-center gap-2 rounded-full bg-black/50 px-3 py-2 backdrop-blur">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`${t.hero.showSlide} ${i + 1}`}
                  aria-current={i === active}
                  onClick={() => setActive(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === active ? "w-6 bg-brass" : "w-1.5 bg-white/50 hover:bg-white/70",
                  )}
                />
              ))}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
