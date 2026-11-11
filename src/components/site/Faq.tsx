import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useT } from "@/lib/i18n/context";

export function Faq() {
  const t = useT();

  return (
    <section className="bg-paper">
      <div className="mx-auto max-w-[1360px] px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-6">
          <div className="mb-2 text-[11px] tracking-[0.2em] text-brass uppercase">
            {t.faq.eyebrow}
          </div>
          <h2 className="text-balance font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {t.faq.heading}
          </h2>
        </div>

        <div className="mx-auto max-w-[760px] rounded-panel bg-sand px-5 text-sand-fg ring-1 ring-hairline sm:px-6">
          <Accordion type="single" collapsible>
            {t.faq.items.map((faq, i) => (
              <AccordionItem key={faq.q} value={`item-${i}`} className="border-hairline">
                <AccordionTrigger className="font-display text-sm font-medium text-sand-fg hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-sand-fg/75">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
