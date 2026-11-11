import { CarPhoto } from "@/components/CarPhoto";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Car, ImageOff, Plus } from "lucide-react";
import { SignInPrompt } from "@/components/site/AuthControls";
import { getCurrentUserFn } from "@/lib/auth";
import { getMyListingsFn, type MyListing } from "@/lib/sellerListing";

export const Route = createFileRoute("/my-cars")({
  loader: async () => {
    const [user, listings] = await Promise.all([getCurrentUserFn(), getMyListingsFn()]);
    return { user, listings };
  },
  head: () => ({
    meta: [
      { title: "My Cars — Yalhacar" },
      { name: "description", content: "Every car you've submitted on Yalhacar, and its status." },
    ],
  }),
  component: MyCarsPage,
});

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  pending: { label: "Pending review", tone: "bg-amber-500/15 text-amber-600" },
  approved: { label: "Live", tone: "bg-brass/20 text-brass-2" },
};

const AVAILABILITY_LABEL: Record<string, string> = {
  reserved: "Reserved",
  sold: "Sold",
};

function MyCarsPage() {
  const { user, listings } = Route.useLoaderData();

  return (
    <div className="bg-paper">
      <div className="mx-auto max-w-[1360px] px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 text-[11px] tracking-[0.2em] text-brass uppercase">
              Your account
            </div>
            <h1 className="text-balance font-display text-3xl font-semibold tracking-tight">
              My cars
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Every car you've submitted, whether it's still under review or already live.
            </p>
          </div>
          {user ? (
            <Link
              to="/sell"
              hash="list-your-car"
              className="inline-flex items-center gap-1.5 rounded-control bg-brass px-4 py-2.5 text-sm font-medium text-white"
            >
              <Plus className="size-4" /> List another car
            </Link>
          ) : null}
        </div>

        {!user ? (
          <SignInPrompt
            next="/my-cars"
            message="Sign in to see the cars you've submitted and their review status."
          />
        ) : listings.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-panel bg-sand p-14 text-center ring-1 ring-hairline">
      <span className="grid size-12 place-items-center rounded-full bg-panel-2 text-brass">
        <Car className="size-5" />
      </span>
      <div className="font-display text-lg font-semibold text-sand-fg">No cars yet</div>
      <p className="max-w-sm text-sm text-sand-fg/60">
        Submit your first car and track its review status right here.
      </p>
      <Link
        to="/sell"
        hash="list-your-car"
        className="mt-2 rounded-control bg-brass px-5 py-2.5 text-sm font-medium text-white"
      >
        List your car
      </Link>
    </div>
  );
}

function ListingCard({ listing }: { listing: MyListing }) {
  const status = STATUS_LABEL[listing.status] ?? { label: listing.status, tone: "bg-hairline" };
  const availabilityLabel =
    listing.status === "approved" ? AVAILABILITY_LABEL[listing.availability] : null;
  const canView = listing.status === "approved";
  const submittedOn = new Date(listing.createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const className =
    "group block overflow-hidden rounded-card bg-sand text-sand-fg ring-1 ring-hairline transition-transform hover:-translate-y-1";

  const body = (
    <>
      <div className="relative aspect-[4/3] bg-panel-2">
        {listing.photoUrl ? (
          <CarPhoto
            src={listing.photoUrl}
            alt={listing.title}
            className="size-full"
            loading="lazy"
          />
        ) : (
          <div className="grid size-full place-items-center text-sand-fg/30">
            <ImageOff className="size-8" />
          </div>
        )}
        <span
          className={`absolute top-3 start-3 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${status.tone}`}
        >
          {status.label}
        </span>
        {availabilityLabel ? (
          <span className="absolute top-3 end-3 rounded-full bg-black/80 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur">
            {availabilityLabel}
          </span>
        ) : null}
      </div>

      <div className="p-4">
        <div className="line-clamp-1 font-display text-[15px] font-medium leading-tight">
          {listing.title}
        </div>
        <div className="mt-1.5 flex items-center justify-between text-xs text-sand-fg/60">
          <span>{listing.city ?? "—"}</span>
          <span>Submitted {submittedOn}</span>
        </div>
        <div className="num mt-2 font-display text-lg font-semibold">
          {listing.price ? `SAR ${listing.price.toLocaleString("en-US")}` : "Price pending"}
        </div>
        {listing.status === "pending" ? (
          <p className="mt-2 text-xs text-sand-fg/50">
            Our team reviews new listings and publishes them once approved.
          </p>
        ) : null}
      </div>
    </>
  );

  if (canView) {
    return (
      <Link to="/cars/$carId" params={{ carId: listing.id }} className={className}>
        {body}
      </Link>
    );
  }
  return <div className={className}>{body}</div>;
}
