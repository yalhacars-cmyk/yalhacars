import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Car } from "@/data/cars";
import { CarForm, fromCsv, MISSING_FIELD_CHECKS, toCsv } from "./CarForm";

afterEach(() => cleanup());

describe("toCsv / fromCsv", () => {
  it("round-trips a list of values", () => {
    expect(toCsv(["Inspected", "Warranty"])).toBe("Inspected, Warranty");
    expect(fromCsv("Inspected, Warranty")).toEqual(["Inspected", "Warranty"]);
  });

  it("trims whitespace and drops empty entries on parse", () => {
    expect(fromCsv(" Inspected ,  , Warranty,")).toEqual(["Inspected", "Warranty"]);
  });

  it("round-trips an empty list", () => {
    expect(toCsv([])).toBe("");
    expect(fromCsv("")).toEqual([]);
  });
});

/** A car with every field CarForm surfaces already filled — what an admin
 * created directly, or a fully-reviewed listing looks like. */
const completeCar: Car = {
  id: "complete-car",
  stock: "STK-1",
  title: "2024 Complete Car",
  make: "Toyota",
  model: "Camry",
  trim: "SE",
  year: 2024,
  condition: "Used",
  mileageKm: 5000,
  city: "Riyadh",
  seats: 5,
  fuel: "Petrol",
  bodyType: "Sedan",
  exteriorColor: "White",
  interiorColor: "Black",
  option: "Full Option",
  carOrigin: "GCC Specs",
  price: 90000,
  monthly: 1500,
  sellerType: "Platform Certified",
  badges: ["Inspected"],
  image: "https://example.com/car.jpg",
  gallery: ["https://example.com/g1.jpg"],
  inspectionScore: 95,
  inspectedOn: "1 Jan 2025",
  inspectionCenter: "Riyadh Center",
  specs: [],
  highlights: [],
  tags: [],
  chassis_no: "ABC123",
  engine_cc: 2000,
  engine_cylinders: 4,
  gear_type: "Automatic",
  roof_type: "Sunroof",
  interior_type: "Leather",
  details: "Great condition",
  photo_paths: ["submissions/car.jpg"],
};

/** A car exactly as the separate seller-submission app leaves it — most of
 * what this admin panel's own form collects is null. This is the shape the
 * "Not provided at submission" banner exists for. */
const sparseCar: Car = {
  ...completeCar,
  id: "sparse-car",
  trim: "",
  condition: undefined as unknown as Car["condition"],
  city: undefined as unknown as string,
  chassis_no: null,
  engine_cc: null,
  details: null,
  gallery: [],
};

describe("MISSING_FIELD_CHECKS", () => {
  it("flags nothing on a fully-detailed car", () => {
    const missing = MISSING_FIELD_CHECKS.filter((f) => f.missing(completeCar));
    expect(missing).toEqual([]);
  });

  it("flags the fields a mobile-app submission leaves empty", () => {
    const missing = MISSING_FIELD_CHECKS.filter((f) => f.missing(sparseCar)).map((f) => f.label);
    expect(missing).toEqual(
      expect.arrayContaining(["Condition", "City", "Chassis number", "Description"]),
    );
    expect(missing).not.toContain("Main photo");
  });
});

describe("CarForm", () => {
  it("shows the missing-fields banner for a sparse submitted car, not for a complete one", () => {
    render(
      <CarForm initial={sparseCar} onCancel={vi.fn()} onSubmit={vi.fn()} submitting={false} />,
    );
    expect(screen.getByText(/Not provided at submission/)).toBeInTheDocument();
    cleanup();

    render(
      <CarForm initial={completeCar} onCancel={vi.fn()} onSubmit={vi.fn()} submitting={false} />,
    );
    expect(screen.queryByText(/Not provided at submission/)).not.toBeInTheDocument();
  });

  it("pre-fills fields from the car being edited", () => {
    render(
      <CarForm initial={completeCar} onCancel={vi.fn()} onSubmit={vi.fn()} submitting={false} />,
    );
    expect(screen.getByDisplayValue("2024 Complete Car")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Toyota")).toBeInTheDocument();
    expect(screen.getByDisplayValue("90000")).toBeInTheDocument();
  });

  it("calls onCancel when Cancel is clicked, without submitting", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onSubmit = vi.fn();
    render(
      <CarForm initial={completeCar} onCancel={onCancel} onSubmit={onSubmit} submitting={false} />,
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("disables the submit button and shows saving state while submitting", () => {
    render(
      <CarForm initial={completeCar} onCancel={vi.fn()} onSubmit={vi.fn()} submitting={true} />,
    );
    const button = screen.getByRole("button", { name: "Saving…" });
    expect(button).toBeDisabled();
  });

  it("submits the full edited shape on save", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <CarForm initial={completeCar} onCancel={vi.fn()} onSubmit={onSubmit} submitting={false} />,
    );

    const priceInput = screen.getByDisplayValue("90000");
    await user.clear(priceInput);
    await user.type(priceInput, "95000");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onSubmit).toHaveBeenCalledOnce();
    const submitted = onSubmit.mock.calls[0]?.[0];
    expect(submitted.id).toBe("complete-car");
    expect(submitted.price).toBe(95000);
    expect(submitted.title).toBe("2024 Complete Car");
  });
});
