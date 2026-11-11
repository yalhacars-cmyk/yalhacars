import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";
import { useT } from "@/lib/i18n/context";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — Yalhacar" },
      { name: "description", content: "Terms and conditions for using Yalhacar." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  const t = useT();
  return (
    <LegalPage
      eyebrow={t.terms.eyebrow}
      heading={t.terms.heading}
      updated={t.terms.updated}
      intro={t.terms.intro}
      sections={t.terms.sections}
    />
  );
}
