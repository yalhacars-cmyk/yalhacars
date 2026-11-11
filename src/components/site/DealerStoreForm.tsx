import { CheckCircle2, Clock, Loader2, Upload, XCircle } from "lucide-react";
import { useRef, useState } from "react";
import {
  saveMyDealerStoreFn,
  uploadDealerStoreLogoFn,
  type MyDealerStore,
} from "@/lib/dealerStore";

/**
 * Create/edit a dealer's storefront branding — separate from ProfileForm's
 * KYC fields, matching the dedicated `dealer_stores` table's own
 * pending/approved/rejected lifecycle (see src/lib/dealerStore.ts). Shown
 * whenever the signed-in visitor's profile.account_type is "dealer": once
 * from /sell before their first listing, and any time after from /profile.
 */

const STATUS_META: Record<
  MyDealerStore["status"],
  { label: string; tone: string; icon: typeof Clock }
> = {
  pending: { label: "Awaiting review", tone: "bg-amber-500/15 text-amber-600", icon: Clock },
  approved: {
    label: "Approved — live on your listings",
    tone: "bg-brass/15 text-brass-2",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected — edit and it goes back for review",
    tone: "bg-destructive/15 text-destructive",
    icon: XCircle,
  },
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function DealerStoreForm({
  store,
  onSaved,
  submitLabel = "Save store",
  onSkip,
}: {
  store: MyDealerStore | null;
  onSaved: () => void;
  submitLabel?: string;
  onSkip?: () => void;
}) {
  const [storeName, setStoreName] = useState(store?.store_name ?? "");
  const [logoPath, setLogoPath] = useState(store?.logo_path ?? null);
  const [logoUrl, setLogoUrl] = useState(store?.logoUrl ?? null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setUploadingLogo(true);
    try {
      const base64 = await fileToBase64(file);
      const { path, url } = await uploadDealerStoreLogoFn({
        data: { fileName: file.name, contentType: file.type, base64 },
      });
      setLogoPath(path);
      setLogoUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingLogo(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await saveMyDealerStoreFn({ data: { store_name: storeName.trim(), logo_path: logoPath } });
      setSaved(true);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save your store");
    } finally {
      setSaving(false);
    }
  };

  const status = store ? STATUS_META[store.status] : null;

  return (
    <div className="rounded-panel bg-panel p-6 text-panel-fg ring-1 ring-panel-fg/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">Your dealer store</h3>
          <p className="mt-1 text-sm text-panel-fg/60">
            Shown as "Sold by [logo] [store name]" on every listing once approved.
          </p>
        </div>
        {status ? (
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${status.tone}`}
          >
            <status.icon className="size-3.5" /> {status.label}
          </span>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        <label className="block text-sm">
          <span className="mb-1.5 block text-panel-fg/70">Store name</span>
          <input
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="e.g. Al Faisal Motors"
            className="w-full rounded-control bg-panel-2 px-3 py-2 text-sm outline-none ring-1 ring-panel-fg/10 focus:ring-brass"
          />
        </label>

        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt=""
              className="size-10 shrink-0 rounded-control object-contain ring-1 ring-panel-fg/10"
            />
          ) : null}
          <div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onLogoChange}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploadingLogo}
              className="inline-flex items-center gap-1.5 rounded-control bg-panel-2 px-3 py-2 text-xs font-medium text-panel-fg/80 ring-1 ring-panel-fg/10 hover:text-panel-fg disabled:opacity-60"
            >
              {uploadingLogo ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Upload className="size-3.5" />
              )}
              {uploadingLogo ? "Uploading…" : logoUrl ? "Replace logo" : "Upload logo (optional)"}
            </button>
          </div>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      {saved ? (
        <p className="mt-3 text-sm text-brass-2">Saved — our team will review it shortly.</p>
      ) : null}

      <div className="mt-4 flex gap-2.5">
        <button
          type="button"
          disabled={saving || !storeName.trim()}
          onClick={save}
          className="rounded-control bg-brass px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : submitLabel}
        </button>
        {onSkip ? (
          <button
            type="button"
            onClick={onSkip}
            className="rounded-control px-4 py-2.5 text-sm font-medium text-panel-fg/60 hover:text-panel-fg"
          >
            Skip for now
          </button>
        ) : null}
      </div>
    </div>
  );
}
