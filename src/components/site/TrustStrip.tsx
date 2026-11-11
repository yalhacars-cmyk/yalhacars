import { ClipboardCheck, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { useT } from "@/lib/i18n/context";

export function TrustStrip() {
  const t = useT();

  const items = [
    {
      icon: ClipboardCheck,
      title: t.trust.inspectionTitle,
      label: t.trust.inspectionLabel,
      dark: true,
    },
    { icon: RotateCcw, title: t.trust.returnTitle, label: t.trust.returnLabel, dark: false },
    { icon: Truck, title: t.trust.deliveryTitle, label: t.trust.deliveryLabel, dark: true },
    {
      icon: ShieldCheck,
      title: t.trust.warrantyTitle,
      label: t.trust.warrantyLabel,
      dark: false,
    },
  ];

  return (
    <section className="bg-paper">
      <div className="mx-auto max-w-[1360px] px-5 py-10 sm:px-8 sm:py-14">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.title}
              className={
                "relative overflow-hidden rounded-panel p-6 " +
                (item.dark ? "bg-panel text-panel-fg" : "bg-sand text-sand-fg ring-1 ring-hairline")
              }
            >
              <item.icon
                className={
                  "absolute -end-3 -top-3 size-24 " +
                  (item.dark ? "text-panel-fg/5" : "text-sand-fg/10")
                }
              />
              <div className="relative">
                <span className="grid size-11 place-items-center rounded-full bg-brass text-white">
                  <item.icon className="size-5" />
                </span>
                <div className="mt-4 font-display text-lg leading-tight font-semibold">
                  {item.title}
                </div>
                <div className={"mt-1.5 text-sm " + (item.dark ? "text-mist" : "text-sand-fg/70")}>
                  {item.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
