import { describe, expect, it } from "vitest";
import type { PaymentMethod } from "@/data/reservations";
import { translations } from "@/lib/i18n/dictionary";
import { paymentMethodLabel } from "./paymentMethod";

// Typed as a full Record so adding a PaymentMethod without a row here is a compile error.
const EXPECTED: Record<PaymentMethod, (t: typeof translations.en) => string> = {
  cash_on_delivery: (t) => t.checkout.cashOnDelivery,
  bank_transfer: (t) => t.checkout.bankTransfer,
  card_demo: (t) => t.checkout.cardDemo,
  tabby: () => "Tabby",
  tamara: () => "Tamara",
  moyasar: (t) => t.checkout.moyasar,
  amwal: (t) => t.checkout.amwal,
};

describe("paymentMethodLabel", () => {
  it.each(Object.keys(EXPECTED) as PaymentMethod[])("labels %s in English", (method) => {
    const label = paymentMethodLabel(method, translations.en);
    expect(label).toBe(EXPECTED[method](translations.en));
    expect(label.length).toBeGreaterThan(0);
  });

  it("uses the Arabic dictionary when given one", () => {
    expect(paymentMethodLabel("cash_on_delivery", translations.ar)).toBe(
      translations.ar.checkout.cashOnDelivery,
    );
    expect(paymentMethodLabel("cash_on_delivery", translations.ar)).not.toBe(
      paymentMethodLabel("cash_on_delivery", translations.en),
    );
  });

  it("keeps the BNPL brand names untranslated", () => {
    expect(paymentMethodLabel("tabby", translations.ar)).toBe("Tabby");
    expect(paymentMethodLabel("tamara", translations.ar)).toBe("Tamara");
  });
});
