import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { getSiteSettings } from "@/data/settings";
import { getAdminUser } from "@/lib/admin/auth";
import { updateSiteSettingsFn } from "@/lib/admin/settings";
import { HEX_COLOR } from "@/lib/hexColor";

export const Route = createFileRoute("/admin/settings")({
  beforeLoad: async () => {
    const user = await getAdminUser();
    if (!user) throw redirect({ to: "/admin/login" });
    return { user };
  },
  loader: () => getSiteSettings(),
  head: () => ({ meta: [{ title: "Settings — Yalhacar Admin" }] }),
  component: AdminSettings,
});

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function EmailField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-panel-fg/70">{label}</span>
      <input
        dir="ltr"
        type="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-control bg-panel px-3 py-2 text-sm outline-none ring-1 ring-panel-fg/10 focus:ring-brass"
      />
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-panel-fg/70">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={HEX_COLOR.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="size-9 shrink-0 cursor-pointer rounded-control bg-panel ring-1 ring-panel-fg/10"
        />
        <input
          dir="ltr"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#f4511d"
          className="w-full rounded-control bg-panel px-3 py-2 text-sm outline-none ring-1 ring-panel-fg/10 focus:ring-brass"
        />
      </div>
    </label>
  );
}

function AdminSettings() {
  const settings = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const [phone, setPhone] = useState(settings.phone);
  const [brandColor, setBrandColor] = useState(settings.brandColor);
  const [brandColor2, setBrandColor2] = useState(settings.brandColor2);
  const [emailCorporate, setEmailCorporate] = useState(settings.emailCorporate);
  const [emailInfo, setEmailInfo] = useState(settings.emailInfo);
  const [emailSales, setEmailSales] = useState(settings.emailSales);
  const [emailSupport, setEmailSupport] = useState(settings.emailSupport);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    phone.trim() !== settings.phone ||
    brandColor !== settings.brandColor ||
    brandColor2 !== settings.brandColor2 ||
    emailCorporate !== settings.emailCorporate ||
    emailInfo !== settings.emailInfo ||
    emailSales !== settings.emailSales ||
    emailSupport !== settings.emailSupport;
  const valid =
    phone.trim().length > 0 &&
    HEX_COLOR.test(brandColor) &&
    HEX_COLOR.test(brandColor2) &&
    [emailCorporate, emailInfo, emailSales, emailSupport].every((e) => EMAIL.test(e));

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateSiteSettingsFn({
        data: {
          phone: phone.trim(),
          brandColor,
          brandColor2,
          emailCorporate: emailCorporate.trim(),
          emailInfo: emailInfo.trim(),
          emailSales: emailSales.trim(),
          emailSupport: emailSupport.trim(),
        },
      });
      setSaved(true);
      await router.invalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell title="Settings" email={user.email}>
      <div className="max-w-md space-y-4">
        <div className="rounded-panel bg-panel-2 p-5 ring-1 ring-panel-fg/10">
          <h2 className="font-display text-base font-semibold">Contact phone</h2>
          <p className="mt-1 text-sm text-panel-fg/60">
            Shown in the site header and footer, across the whole public site.
          </p>

          <label className="mt-4 block text-sm">
            <span className="mb-1.5 block text-panel-fg/70">Phone number</span>
            <input
              dir="ltr"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setSaved(false);
              }}
              placeholder="+966 577068091"
              className="w-full rounded-control bg-panel px-3 py-2 text-sm outline-none ring-1 ring-panel-fg/10 focus:ring-brass"
            />
          </label>
        </div>

        <div className="rounded-panel bg-panel-2 p-5 ring-1 ring-panel-fg/10">
          <h2 className="font-display text-base font-semibold">Brand colors</h2>
          <p className="mt-1 text-sm text-panel-fg/60">
            Drive every button, link and highlight across the site, in both light and dark mode.
          </p>

          <div className="mt-4 space-y-3">
            <ColorField
              label="Brand color"
              value={brandColor}
              onChange={(v) => {
                setBrandColor(v);
                setSaved(false);
              }}
            />
            <ColorField
              label="Highlight color"
              value={brandColor2}
              onChange={(v) => {
                setBrandColor2(v);
                setSaved(false);
              }}
            />
          </div>
        </div>

        <div className="rounded-panel bg-panel-2 p-5 ring-1 ring-panel-fg/10">
          <h2 className="font-display text-base font-semibold">Contact emails</h2>
          <p className="mt-1 text-sm text-panel-fg/60">
            Shown on the Contact page and in the footer.
          </p>

          <div className="mt-4 space-y-3">
            <EmailField
              label="Corporate"
              value={emailCorporate}
              onChange={(v) => {
                setEmailCorporate(v);
                setSaved(false);
              }}
            />
            <EmailField
              label="Info (general)"
              value={emailInfo}
              onChange={(v) => {
                setEmailInfo(v);
                setSaved(false);
              }}
            />
            <EmailField
              label="Sales"
              value={emailSales}
              onChange={(v) => {
                setEmailSales(v);
                setSaved(false);
              }}
            />
            <EmailField
              label="Support"
              value={emailSupport}
              onChange={(v) => {
                setEmailSupport(v);
                setSaved(false);
              }}
            />
          </div>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {saved ? <p className="text-sm text-brass-2">Saved.</p> : null}

        <button
          type="button"
          disabled={saving || !dirty || !valid}
          onClick={save}
          className="rounded-control bg-brass px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </AdminShell>
  );
}
