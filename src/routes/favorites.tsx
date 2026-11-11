import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { CarCard } from "@/components/CarCard";
import { listCars } from "@/data/cars";
import { useFavorites } from "@/lib/favorites";
import { useT } from "@/lib/i18n/context";

export const Route = createFileRoute("/favorites")({
  loader: () => listCars(),
  head: () => ({
    meta: [
      { title: "Your Favorites — Yalhacar" },
      {
        name: "description",
        content: "Cars you've saved on Yalhacar — pick up where you left off.",
      },
    ],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const cars = Route.useLoaderData();
  const t = useT();
  const { ids } = useFavorites();
  const favoriteCars = cars.filter((car) => ids.includes(car.id));

  return (
    <div className="bg-paper">
      <div className="mx-auto max-w-[1360px] px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-6">
          <div className="mb-2 text-[11px] tracking-[0.2em] text-brass uppercase">
            {t.favorites.eyebrow}
          </div>
          <h1 className="text-balance font-display text-3xl font-semibold tracking-tight">
            {t.favorites.heading}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">{t.favorites.subtitle}</p>
        </div>

        {favoriteCars.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {favoriteCars.map((car) => (
              <CarCard key={car.id} car={car} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-panel bg-sand p-14 text-center ring-1 ring-hairline">
            <span className="grid size-12 place-items-center rounded-full bg-panel-2 text-brass">
              <Heart className="size-5" />
            </span>
            <div className="font-display text-lg font-semibold text-sand-fg">
              {t.favorites.emptyTitle}
            </div>
            <p className="max-w-sm text-sm text-sand-fg/60">{t.favorites.emptyBody}</p>
            <Link
              to="/buy"
              className="mt-2 rounded-control bg-brass px-5 py-2.5 text-sm font-medium text-white"
            >
              {t.favorites.browseCars}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
