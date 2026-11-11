import { createFileRoute } from "@tanstack/react-router";
import { Check, Paperclip } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { createLead } from "@/data/leads";
import { useLocale, useT } from "@/lib/i18n/context";
import { formatNumber, formatSar } from "@/lib/i18n/dictionary";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/finance/apply")({
  validateSearch: z.object({
    price: z.number().optional(),
    downPayment: z.number().optional(),
    months: z.number().optional(),
  }),
  head: () => ({ meta: [{ title: "Apply for Financing — Yalhacar" }] }),
  component: FinanceApplyPage,
});

function FinanceApplyPage() {
  const t = useT();
  const { locale } = useLocale();
  const search = Route.useSearch();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");

  const [employmentStatus, setEmploymentStatus] = useState(
    t.financeApply.employmentStatuses[0] ?? "",
  );
  const [employer, setEmployer] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [obligations, setObligations] = useState("");

  const [price, setPrice] = useState(String(search.price ?? 150000));
  const [downPayment, setDownPayment] = useState(String(search.downPayment ?? 30000));
  const [months, setMonths] = useState(String(search.months ?? 60));

  const [idFile, setIdFile] = useState<File | null>(null);
  const [incomeFile, setIncomeFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);

  const steps = t.financeApply.steps;

  const step1Valid = fullName.trim() && phone.trim();
  const step2Valid = employer.trim() && monthlyIncome.trim();

  const submit = async () => {
    setSubmitting(true);
    try {
      await createLead({
        type: "finance_application",
        name: fullName.trim(),
        phone: phone.trim(),
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(city.trim() ? { city: city.trim() } : {}),
        payload: {
          employmentStatus,
          employer: employer.trim(),
          monthlyIncome: Number(monthlyIncome) || 0,
          obligations: Number(obligations) || 0,
          price: Number(price) || 0,
          downPayment: Number(downPayment) || 0,
          months: Number(months) || 0,
          documentsAttached: { id: Boolean(idFile), income: Boolean(incomeFile) },
        },
      });
      setReference(`FA-${Date.now().toString(36).toUpperCase()}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (reference) {
    return (
      <div className="bg-paper">
        <div className="mx-auto max-w-[520px] px-5 py-20 text-center sm:px-8">
          <span className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-brass text-white">
            <Check className="size-6" />
          </span>
          <h1 className="font-display text-2xl font-semibold">{t.financeApply.successTitle}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t.financeApply.successBody}</p>
          <div className="mt-6 rounded-panel bg-sand p-5 text-sand-fg ring-1 ring-hairline">
            <div className="text-[11px] tracking-[0.14em] text-sand-fg/55 uppercase">
              {t.financeApply.referenceLabel}
            </div>
            <div className="num mt-1 font-display text-xl font-semibold">{reference}</div>
            <span className="mt-3 inline-block rounded-full bg-panel-2 px-3 py-1 text-xs font-medium">
              {t.financeApply.statusSubmitted}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-paper">
      <div className="mx-auto max-w-[760px] px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-6">
          <div className="mb-2 text-[11px] tracking-[0.2em] text-brass uppercase">
            {t.financeApply.eyebrow}
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {t.financeApply.heading}
          </h1>
        </div>

        <div className="mb-8 flex items-center gap-1.5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full",
                i + 1 <= step ? "bg-brass" : "bg-sand ring-1 ring-hairline",
              )}
            />
          ))}
        </div>

        <div className="rounded-panel bg-sand p-6 text-sand-fg ring-1 ring-hairline sm:p-8">
          <h2 className="font-display text-lg font-semibold">{steps[step - 1]}</h2>

          {step === 1 ? (
            <div className="mt-4 grid grid-cols-1 gap-3">
              <Field
                value={fullName}
                onChange={setFullName}
                placeholder={t.financeApply.fullNameLabel}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field value={phone} onChange={setPhone} placeholder={t.financeApply.phoneLabel} />
                <Field
                  value={email}
                  onChange={setEmail}
                  placeholder={t.financeApply.emailLabel}
                  type="email"
                />
              </div>
              <Field value={city} onChange={setCity} placeholder={t.financeApply.cityLabel} />
            </div>
          ) : null}

          {step === 2 ? (
            <div className="mt-4 grid grid-cols-1 gap-3">
              <select
                value={employmentStatus}
                onChange={(e) => setEmploymentStatus(e.target.value)}
                className="w-full rounded-control bg-paper px-3 py-2.5 text-sm text-ink outline-none ring-1 ring-hairline"
              >
                {t.financeApply.employmentStatuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <Field
                value={employer}
                onChange={setEmployer}
                placeholder={t.financeApply.employerLabel}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field
                  value={monthlyIncome}
                  onChange={setMonthlyIncome}
                  placeholder={t.financeApply.monthlyIncomeLabel}
                  type="number"
                />
                <Field
                  value={obligations}
                  onChange={setObligations}
                  placeholder={t.financeApply.obligationsLabel}
                  type="number"
                />
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field
                value={price}
                onChange={setPrice}
                placeholder={t.financeApply.priceLabel}
                type="number"
              />
              <Field
                value={downPayment}
                onChange={setDownPayment}
                placeholder={t.financeApply.downPaymentLabel}
                type="number"
              />
              <Field
                value={months}
                onChange={setMonths}
                placeholder={t.financeApply.tenureLabel}
                type="number"
              />
            </div>
          ) : null}

          {step === 4 ? (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FileField
                label={t.financeApply.idDocumentLabel}
                hint={t.financeApply.uploadHint}
                attachedLabel={t.financeApply.fileAttached}
                file={idFile}
                onChange={setIdFile}
              />
              <FileField
                label={t.financeApply.incomeDocumentLabel}
                hint={t.financeApply.uploadHint}
                attachedLabel={t.financeApply.fileAttached}
                file={incomeFile}
                onChange={setIncomeFile}
              />
            </div>
          ) : null}

          {step === 5 ? (
            <div className="mt-4 space-y-2 text-sm">
              <ReviewRow label={t.financeApply.fullNameLabel} value={fullName} />
              <ReviewRow label={t.financeApply.phoneLabel} value={phone} />
              <ReviewRow label={t.financeApply.employmentStatusLabel} value={employmentStatus} />
              <ReviewRow
                label={t.financeApply.priceLabel}
                value={formatSar(Number(price) || 0, locale)}
              />
              <ReviewRow
                label={t.financeApply.downPaymentLabel}
                value={formatSar(Number(downPayment) || 0, locale)}
              />
              <ReviewRow
                label={t.financeApply.tenureLabel}
                value={formatNumber(Number(months) || 0, locale)}
              />
              <label className="mt-4 flex items-start gap-2 text-xs text-sand-fg/70">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 accent-brass"
                />
                {t.financeApply.consentLabel}
              </label>
            </div>
          ) : null}

          <div className="mt-8 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="rounded-control bg-paper px-4 py-2.5 text-sm font-medium text-ink ring-1 ring-hairline"
              >
                {t.financeApply.back}
              </button>
            ) : (
              <span />
            )}
            {step < 5 ? (
              <button
                type="button"
                disabled={(step === 1 && !step1Valid) || (step === 2 && !step2Valid)}
                onClick={() => setStep((s) => s + 1)}
                className="rounded-control bg-brass px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {t.financeApply.continueButton}
              </button>
            ) : (
              <button
                type="button"
                disabled={!consent || submitting}
                onClick={submit}
                className="rounded-control bg-brass px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {submitting ? t.financeApply.submitting : t.financeApply.submitButton}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
      className="w-full rounded-control bg-paper px-3 py-2.5 text-sm text-ink outline-none ring-1 ring-hairline"
    />
  );
}

function FileField({
  label,
  hint,
  attachedLabel,
  file,
  onChange,
}: {
  label: string;
  hint: string;
  attachedLabel: string;
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  return (
    <label className="flex cursor-pointer flex-col gap-1.5 rounded-control bg-paper p-4 text-xs ring-1 ring-hairline">
      <span className="font-medium text-ink">{label}</span>
      <span className="flex items-center gap-1.5 text-ink/50">
        <Paperclip className="size-3.5" /> {file ? `${attachedLabel}: ${file.name}` : hint}
      </span>
      <input
        type="file"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-hairline py-2">
      <span className="text-sand-fg/55">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
