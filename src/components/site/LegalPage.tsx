type LegalSection = { title: string; body: string };

export function LegalPage({
  eyebrow,
  heading,
  updated,
  intro,
  sections,
}: {
  eyebrow: string;
  heading: string;
  updated: string;
  intro: string;
  sections: readonly LegalSection[];
}) {
  return (
    <div className="bg-paper">
      <div className="mx-auto max-w-[860px] px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-2 text-[11px] tracking-[0.2em] text-brass uppercase">{eyebrow}</div>
        <h1 className="text-balance font-display text-3xl font-semibold tracking-tight">
          {heading}
        </h1>
        <div className="mt-2 text-xs text-ink/40">{updated}</div>
        <p className="mt-5 text-sm leading-relaxed text-ink/60">{intro}</p>

        <div className="mt-8 space-y-6">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="font-display text-lg font-semibold tracking-tight">{section.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink/60">{section.body}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
