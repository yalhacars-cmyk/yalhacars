import { Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { CITIES } from "@/data/cars";
import type { PublicUser } from "@/lib/auth";
import { saveMyProfileFn, uploadMyDocumentFn, type MyProfile } from "@/lib/profile";

/**
 * The account-wide profile — full name, phone, city, national ID (+
 * document), and, for dealers, business name/CR number/CR document. Shared
 * between /sell (a one-time gate before listing a car) and /profile (view
 * and edit anytime, same as the mobile app's profile screen).
 *
 * Store branding (name/logo) lives separately in `dealer_stores` — see
 * DealerStoreForm — not here, since it has its own review lifecycle
 * independent of these KYC fields.
 */

export function isProfileComplete(p: MyProfile | null): boolean {
  if (!p) return false;
  const baseOk = !!(
    p.full_name &&
    p.phone &&
    p.city &&
    p.national_id &&
    p.national_id_document_path
  );
  if (p.account_type === "dealer") {
    return baseOk && !!(p.business_name && p.cr_number && p.cr_document_path);
  }
  return baseOk;
}

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

function DocUploadField({
  label,
  path,
  bucket,
  onUploaded,
}: {
  label: string;
  path: string | null;
  bucket: "national-id-documents" | "dealer-documents";
  onUploaded: (path: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const { path: newPath } = await uploadMyDocumentFn({
        data: { bucket, fileName: file.name, contentType: file.type, base64 },
      });
      onUploaded(newPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={onChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-1.5 rounded-control bg-paper px-3 py-2 text-xs font-medium text-ink/80 ring-1 ring-hairline hover:text-ink disabled:opacity-60"
      >
        {uploading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Upload className="size-3.5" />
        )}
        {uploading ? "Uploading…" : path ? `${label} uploaded ✓` : `Upload ${label}`}
      </button>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function ProfileForm({
  user,
  profile,
  onSaved,
  submitLabel = "Save changes",
}: {
  user: PublicUser;
  profile: MyProfile | null;
  onSaved: () => void;
  submitLabel?: string;
}) {
  const [accountType, setAccountType] = useState<"individual" | "dealer">(
    profile?.account_type ?? "individual",
  );
  const [fullName, setFullName] = useState(profile?.full_name ?? user.name);
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [city, setCity] = useState(profile?.city ?? CITIES[0] ?? "Riyadh");
  const [nationalId, setNationalId] = useState(profile?.national_id ?? "");
  const [nationalIdDoc, setNationalIdDoc] = useState(profile?.national_id_document_path ?? null);
  const [businessName, setBusinessName] = useState(profile?.business_name ?? "");
  const [crNumber, setCrNumber] = useState(profile?.cr_number ?? "");
  const [crDoc, setCrDoc] = useState(profile?.cr_document_path ?? null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave =
    fullName.trim() &&
    phone.trim() &&
    city.trim() &&
    nationalId.trim() &&
    nationalIdDoc &&
    (accountType === "individual" || (businessName.trim() && crNumber.trim() && crDoc));

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await saveMyProfileFn({
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          city: city.trim(),
          national_id: nationalId.trim(),
          national_id_document_path: nationalIdDoc,
          account_type: accountType,
          business_name: accountType === "dealer" ? businessName.trim() : null,
          cr_number: accountType === "dealer" ? crNumber.trim() : null,
          cr_document_path: accountType === "dealer" ? crDoc : null,
        },
      });
      setSaved(true);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save your details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-panel bg-panel p-6 text-panel-fg ring-1 ring-panel-fg/10">
      <h3 className="font-display text-lg font-semibold">
        {profile ? "Your details" : "Complete your details"}
      </h3>
      <p className="mt-1 text-sm text-panel-fg/60">
        {profile ? "Used for every car you list." : "One-time — used for every car you list."}
      </p>

      <div className="mt-4 flex gap-1.5">
        {(["individual", "dealer"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setAccountType(type)}
            className={`flex-1 rounded-control px-4 py-2.5 text-sm font-medium capitalize ring-1 transition-colors ${
              accountType === type
                ? "bg-brass text-white ring-brass"
                : "bg-panel-2 text-panel-fg/60 ring-panel-fg/10 hover:text-panel-fg"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        <label className="block text-sm">
          <span className="mb-1.5 block text-panel-fg/70">Full name</span>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-control bg-panel-2 px-3 py-2 text-sm outline-none ring-1 ring-panel-fg/10 focus:ring-brass"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-panel-fg/70">Phone</span>
          <input
            dir="ltr"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+966 5xxxxxxxx"
            className="w-full rounded-control bg-panel-2 px-3 py-2 text-sm outline-none ring-1 ring-panel-fg/10 focus:ring-brass"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-panel-fg/70">City</span>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-control bg-panel-2 px-3 py-2 text-sm outline-none ring-1 ring-panel-fg/10 focus:ring-brass"
          >
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-panel-fg/70">National ID</span>
          <input
            dir="ltr"
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value)}
            className="w-full rounded-control bg-panel-2 px-3 py-2 text-sm outline-none ring-1 ring-panel-fg/10 focus:ring-brass"
          />
        </label>
        <DocUploadField
          label="National ID document"
          path={nationalIdDoc}
          bucket="national-id-documents"
          onUploaded={setNationalIdDoc}
        />

        {accountType === "dealer" ? (
          <div className="space-y-3 border-t border-panel-fg/10 pt-3">
            <label className="block text-sm">
              <span className="mb-1.5 block text-panel-fg/70">Business name</span>
              <input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full rounded-control bg-panel-2 px-3 py-2 text-sm outline-none ring-1 ring-panel-fg/10 focus:ring-brass"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-panel-fg/70">CR number</span>
              <input
                dir="ltr"
                value={crNumber}
                onChange={(e) => setCrNumber(e.target.value)}
                className="w-full rounded-control bg-panel-2 px-3 py-2 text-sm outline-none ring-1 ring-panel-fg/10 focus:ring-brass"
              />
            </label>
            <DocUploadField
              label="CR document"
              path={crDoc}
              bucket="dealer-documents"
              onUploaded={setCrDoc}
            />
            <p className="text-xs text-panel-fg/50">
              Once you set up a dealer store (next step) and our team approves it, your listings
              show as "Independent Dealer" with your store name and logo. Until then they list as a
              private seller.
            </p>
          </div>
        ) : null}
      </div>

      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      {saved ? <p className="mt-3 text-sm text-brass-2">Saved.</p> : null}

      <button
        type="button"
        disabled={saving || !canSave}
        onClick={save}
        className="mt-4 w-full rounded-control bg-brass px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? "Saving…" : submitLabel}
      </button>
    </div>
  );
}
