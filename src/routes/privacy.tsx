import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";
import { useT } from "@/lib/i18n/context";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Yalhacar" },
      {
        name: "description",
        content: "How Yalhacar collects, uses, and protects your information.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const t = useT();
  return (
    <LegalPage
      eyebrow={t.privacy.eyebrow}
      heading={t.privacy.heading}
      updated={t.privacy.updated}
      intro={t.privacy.intro}
      sections={t.privacy.sections}
    />
  );
}
