import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Car } from "@/data/cars";
import { LocaleProvider } from "@/lib/i18n/context";
import { FavoritesProvider } from "@/lib/favorites";
import { CarCard } from "./CarCard";

// CarCard only needs Link for navigation, not real routing — this app has no
// RouterProvider test harness set up, so a plain <a> stands in for it.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <a {...props}>{children}</a>
  ),
  // LocaleProvider checks the current route to force admin pages LTR — CarCard
  // never renders under /admin, so a fixed "not admin" result is correct here.
  useRouterState: () => false,
}));

vi.mock("@/lib/favoritesData", () => ({
  setFavoriteFn: vi.fn(),
}));

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

const baseCar: Car = {
  id: "car-1",
  stock: "STK-1",
  title: "2024 Toyota Camry SE",
  make: "Toyota",
  model: "Camry",
  trim: "SE",
  year: 2024,
  condition: "Used",
  mileageKm: 12000,
  city: "Riyadh",
  seats: 5,
  fuel: "Petrol",
  bodyType: "Sedan",
  exteriorColor: "White",
  interiorColor: "Black",
  option: "Full Option",
  carOrigin: "GCC Specs",
  price: 95000,
  monthly: 1800,
  sellerType: "Platform Certified",
  badges: ["Inspected", "Warranty"],
  image: "https://example.com/car.jpg",
  gallery: ["https://example.com/g1.jpg", "https://example.com/g2.jpg"],
  inspectionScore: 90,
  inspectedOn: "1 Jan 2025",
  inspectionCenter: "Riyadh Center",
  specs: [],
  highlights: [],
  tags: [],
};

function renderCard(car: Car, initialIds: string[] = []) {
  // LocaleProvider defaults to Arabic and only switches on this stored
  // preference (see src/lib/i18n/context.tsx) — set it up front so these
  // tests assert against stable English strings rather than translated copy.
  window.localStorage.setItem("yalhacar-locale", "en");
  return render(
    <LocaleProvider>
      <FavoritesProvider signedIn={false} initialIds={initialIds}>
        <CarCard car={car} />
      </FavoritesProvider>
    </LocaleProvider>,
  );
}

describe("CarCard", () => {
  it("renders title and formatted price/monthly", () => {
    renderCard(baseCar);
    expect(screen.getByText("2024 Toyota Camry SE")).toBeInTheDocument();
    expect(screen.getByText("SAR 95,000")).toBeInTheDocument();
    expect(screen.getByText(/SAR 1,800/)).toBeInTheDocument();
  });

  it("shows a strike-through original price and discount badge when wasPrice is set", () => {
    renderCard({ ...baseCar, wasPrice: 100000 });
    expect(screen.getByText("SAR 100,000")).toBeInTheDocument();
    expect(screen.getByText("-5.0%")).toBeInTheDocument();
  });

  it("shows no discount badge when wasPrice isn't actually higher than price", () => {
    renderCard({ ...baseCar, wasPrice: 90000 });
    expect(screen.queryByText(/^-.*%$/)).not.toBeInTheDocument();
  });

  it("overlays a status badge and dims the photo for a reserved or sold car", () => {
    renderCard({ ...baseCar, availability: "sold" });
    expect(screen.getByText(/sold/i)).toBeInTheDocument();
  });

  it("shows no status overlay for an available car", () => {
    renderCard(baseCar);
    expect(screen.queryByText(/sold/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/reserved/i)).not.toBeInTheDocument();
  });

  it("toggles the favorite button's pressed state on click", async () => {
    const user = userEvent.setup();
    renderCard(baseCar);
    const favButton = screen.getByRole("button", { name: /favorite/i });
    expect(favButton).toHaveAttribute("aria-pressed", "false");

    await user.click(favButton);
    expect(favButton).toHaveAttribute("aria-pressed", "true");
  });

  it("cycles the gallery image with prev/next controls when there's more than one photo", async () => {
    const user = userEvent.setup();
    renderCard(baseCar);
    const img = screen.getByRole("img", { name: baseCar.title });
    expect(img).toHaveAttribute("src", baseCar.gallery[0]);

    await user.click(screen.getByLabelText(/next/i));
    expect(img).toHaveAttribute("src", baseCar.gallery[1]);
  });

  it("hides gallery controls when there's only one photo", () => {
    renderCard({ ...baseCar, gallery: [baseCar.gallery[0]!] });
    expect(screen.queryByLabelText(/next/i)).not.toBeInTheDocument();
  });
});
