import { describe, expect, it } from "vitest";
import type { Car } from "@/data/cars";
import { carInputSchema, carToInput } from "./cars";

/** A car exactly as the separate seller-submission app writes it: only the
 * fields its own form collects are set, everything this admin panel's
 * CarForm additionally needs is null/missing. This is the real shape that
 * broke the "pending car" admin screen earlier in this project. */
const submittedCar: Car = {
  id: "test-car-1",
  stock: "STK-1",
  title: "2024 Test Car",
  make: "Test",
  model: "Car",
  trim: "",
  year: 2024,
  condition: undefined as unknown as Car["condition"],
  mileageKm: 1000,
  city: undefined as unknown as string,
  seats: undefined as unknown as number,
  fuel: "Petrol",
  bodyType: undefined as unknown as string,
  exteriorColor: undefined as unknown as string,
  interiorColor: undefined as unknown as string,
  option: undefined as unknown as string,
  carOrigin: undefined as unknown as string,
  price: undefined as unknown as number,
  monthly: undefined as unknown as number,
  sellerType: undefined as unknown as Car["sellerType"],
  badges: [],
  image: undefined as unknown as string,
  gallery: [],
  inspectionScore: undefined as unknown as number,
  inspectedOn: undefined as unknown as string,
  inspectionCenter: undefined as unknown as string,
  specs: [],
  highlights: [],
  tags: [],
};

describe("carToInput", () => {
  it("fills every field CarInput requires non-null with a safe default", () => {
    const input = carToInput(submittedCar);
    expect(input.condition).toBe("Used");
    expect(input.city).toBe("Riyadh");
    expect(input.seats).toBe(5);
    expect(input.bodyType).toBe("");
    expect(input.price).toBe(0);
    expect(input.monthly).toBe(0);
    expect(input.sellerType).toBe("Platform Certified");
    expect(input.image).toBe("");
    expect(input.inspectionScore).toBe(0);
  });

  it("leaves bodyType/image as empty strings rather than a fake default — carInputSchema requires the admin actually fill these in, matching the 'required' inputs in CarForm", () => {
    const input = carToInput(submittedCar);
    const result = carInputSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toEqual(expect.arrayContaining(["bodyType", "image"]));
    }
  });

  it("defaults availability to 'available' when unset", () => {
    expect(carToInput(submittedCar).availability).toBe("available");
  });

  it("preserves an explicit value instead of overriding it", () => {
    const input = carToInput({ ...submittedCar, availability: "sold", price: 99000 });
    expect(input.availability).toBe("sold");
    expect(input.price).toBe(99000);
  });

  it("passes through the seller-submission-only fields unchanged", () => {
    const input = carToInput({
      ...submittedCar,
      chassis_no: "ABC123",
      engine_cc: 2000,
      details: "Nice car",
    });
    expect(input.chassis_no).toBe("ABC123");
    expect(input.engine_cc).toBe(2000);
    expect(input.details).toBe("Nice car");
    expect(input.gear_type).toBeNull();
  });
});

describe("carInputSchema", () => {
  const valid = carToInput({
    ...submittedCar,
    price: 10,
    monthly: 1,
    image: "x.jpg",
    bodyType: "SUV",
  });

  it("accepts a fully-defaulted input", () => {
    expect(carInputSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a missing required field", () => {
    const { id: _id, ...rest } = valid;
    expect(carInputSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects a negative price", () => {
    expect(carInputSchema.safeParse({ ...valid, price: -1 }).success).toBe(false);
  });

  it("rejects an unknown seller type", () => {
    expect(carInputSchema.safeParse({ ...valid, sellerType: "Not A Real Type" }).success).toBe(
      false,
    );
  });

  it("defaults availability to 'available' when omitted", () => {
    const { availability: _availability, ...rest } = valid;
    const result = carInputSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.availability).toBe("available");
  });
});
