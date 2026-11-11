import type { PaymentMethod } from "@/data/reservations";
import type { translations } from "@/lib/i18n/dictionary";

type Dict = (typeof translations)["en"];

export function paymentMethodLabel(method: PaymentMethod, t: Dict): string {
  switch (method) {
    case "cash_on_delivery":
      return t.checkout.cashOnDelivery;
    case "bank_transfer":
      return t.checkout.bankTransfer;
    case "card_demo":
      return t.checkout.cardDemo;
    case "tabby":
      return "Tabby";
    case "tamara":
      return "Tamara";
    case "moyasar":
      return t.checkout.moyasar;
    case "amwal":
      return t.checkout.amwal;
  }
}
