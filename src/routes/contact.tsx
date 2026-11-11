import { createFileRoute } from "@tanstack/react-router";
import { Building2, Clock, Headset, Mail, Phone, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { createLead } from "@/data/leads";
import { getSiteSettings } from "@/data/settings";
import { useT } from "@/lib/i18n/context";

export const Route = createFileRoute("/contact")({
  loader: () => getSiteSettings(),
  head: () => ({
    meta: [
      { title: "Contact Us — Yalhacar" },
      {
        name: "description",
        content: "Reach Yalhacar's support team by phone, email, or the contact form.",
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const settings = Route.useLoaderData();
  const t = useT();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(false);
    try {
      await createLead({
        type: "general_contact",
        name: name.trim(),
        phone: phone.trim(),
        ...(email.trim() ? { email: email.trim() } : {}),
        payload: { message: message.trim() },
      });
      setSubmitted(true);
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-paper">
      <div className="mx-auto max-w-[1360px] px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-8">
          <div className="mb-2 text-[11px] tracking-[0.2em] text-brass uppercase">
            {t.contact.eyebrow}
          </div>
          <h1 className="text-balance font-display text-3xl font-semibold tracking-tight">
            {t.contact.heading}
          </h1>
          <p className="mt-2 max-w-[60ch] text-sm text-ink/55">{t.contact.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-3">
            <a
              href={`tel:${settings.phone}`}
              className="flex items-start gap-3 rounded-panel bg-sand p-4 text-sand-fg ring-1 ring-hairline transition-colors hover:bg-sand/80"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brass text-white">
                <Phone className="size-4" />
              </span>
              <div>
                <div className="text-[11px] tracking-[0.1em] text-sand-fg/55 uppercase">
                  {t.contact.phoneLabel}
                </div>
                <div dir="ltr" className="num mt-0.5 font-display text-sm font-medium">
                  {settings.phone}
                </div>
              </div>
            </a>

            <div className="rounded-panel bg-sand p-4 text-sand-fg ring-1 ring-hairline">
              <div className="mb-3 flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brass text-white">
                  <Mail className="size-4" />
                </span>
                <div className="text-[11px] tracking-[0.1em] text-sand-fg/55 uppercase">
                  {t.contact.emailLabel}
                </div>
              </div>
              <div className="space-y-2.5 ps-[52px]">
                {(
                  [
                    { icon: Building2, label: "Corporate", value: settings.emailCorporate },
                    { icon: Mail, label: "General", value: settings.emailInfo },
                    { icon: ShoppingBag, label: "Sales", value: settings.emailSales },
                    { icon: Headset, label: "Support", value: settings.emailSupport },
                  ] as const
                ).map(({ icon: Icon, label, value }) => (
                  <a
                    key={label}
                    href={`mailto:${value}`}
                    className="flex items-center gap-2 text-sm text-sand-fg/85 transition-colors hover:text-brass"
                  >
                    <Icon className="size-3.5 shrink-0 text-sand-fg/40" />
                    <span className="text-sand-fg/50">{label}:</span>
                    <span dir="ltr" className="font-medium">
                      {value}
                    </span>
                  </a>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-panel bg-sand p-4 text-sand-fg ring-1 ring-hairline">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brass text-white">
                <Clock className="size-4" />
              </span>
              <div>
                <div className="text-[11px] tracking-[0.1em] text-sand-fg/55 uppercase">
                  {t.contact.hoursLabel}
                </div>
                <div className="mt-0.5 text-sm text-sand-fg/85">Sat – Thu · 9am – 11pm</div>
                <div className="text-sm text-sand-fg/85">Fri · 1pm – 11pm</div>
              </div>
            </div>
          </div>

          <div className="rounded-panel bg-sand p-6 text-sand-fg ring-1 ring-hairline sm:p-8">
            <h2 className="font-display text-xl font-semibold tracking-tight">
              {t.contact.formHeading}
            </h2>

            {submitted ? (
              <div className="mt-6 rounded-panel bg-panel p-5 text-sm text-panel-fg">
                {t.contact.successMessage}
              </div>
            ) : (
              <form className="mt-6 space-y-4" onSubmit={onSubmit}>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] tracking-[0.1em] text-sand-fg/55 uppercase">
                    {t.contact.nameLabel}
                  </span>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-control bg-paper px-3 py-2.5 text-sm outline-none ring-1 ring-hairline"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] tracking-[0.1em] text-sand-fg/55 uppercase">
                    {t.contact.emailFieldLabel}
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-control bg-paper px-3 py-2.5 text-sm outline-none ring-1 ring-hairline"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] tracking-[0.1em] text-sand-fg/55 uppercase">
                    {t.contact.phoneFieldLabel}
                  </span>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-control bg-paper px-3 py-2.5 text-sm outline-none ring-1 ring-hairline"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] tracking-[0.1em] text-sand-fg/55 uppercase">
                    {t.contact.messageLabel}
                  </span>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full resize-none rounded-control bg-paper px-3 py-2.5 text-sm outline-none ring-1 ring-hairline"
                  />
                </label>
                {error ? (
                  <p className="text-sm text-destructive">{t.contact.errorMessage}</p>
                ) : null}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-control bg-panel px-4 py-3.5 text-center font-display text-sm font-medium text-panel-fg disabled:opacity-60"
                >
                  {submitting ? t.contact.submitting : t.contact.submitButton}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
