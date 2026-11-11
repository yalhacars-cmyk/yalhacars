import { ImagePlus, Loader2, Pencil, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { PhotoEditor } from "@/components/admin/PhotoEditor";
import { uploadAdminImageFn } from "@/lib/admin/storage";

/**
 * Tracks the next sort_order to hand out across a bulk-upload batch, so N
 * files dropped in one go land as N distinct positions instead of all
 * landing on the same stale `rows.length` (which only advances once
 * `onChange`'s refetch resolves — too late for the next file in the batch).
 *
 * Seeded once from `currentLength` at mount and never resynced after: each
 * `onChange()`/`router.invalidate()` in the upload loop can trigger a
 * re-render before the *next* file's call, and re-reading `currentLength`
 * on every render used to snap the counter back to a stale value whenever
 * that re-render landed before the refetch had actually picked up the
 * previous file's insert — handing two files in the same batch the same
 * sort_order (visible afterward as rows whose relative order isn't stable
 * across re-fetches, since ties don't sort deterministically).
 */
export function useNextSortOrder(currentLength: number) {
  const ref = useRef(currentLength);
  return () => ref.current++;
}

export function fileToBase64(file: File): Promise<string> {
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

/**
 * Shared "pick a file, upload it, hand back the public URL" control for
 * every admin image field. Also offers "Edit" once an image exists — opens
 * the same logo-placement PhotoEditor the Inventory car-photo flow uses, so
 * that tool isn't limited to car photos: hero slides, onboarding, brand
 * logos, finance flyers/partners all get it here for free.
 */
export function ImagePicker({
  bucket,
  imageUrl,
  onUploaded,
}: {
  bucket: "app-content" | "finance-logos";
  imageUrl: string | null;
  onUploaded: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const { url } = await uploadAdminImageFn({
        data: { bucket, fileName: file.name, contentType: file.type, base64 },
      });
      onUploaded(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-control bg-panel ring-1 ring-panel-fg/10">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="size-full object-cover" />
        ) : (
          <ImagePlus className="size-5 text-panel-fg/30" />
        )}
      </div>
      <div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onChange} />
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 rounded-control bg-panel px-3 py-1.5 text-xs font-medium text-panel-fg/80 ring-1 ring-panel-fg/10 hover:text-panel-fg disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <ImagePlus className="size-3.5" />
            )}
            {uploading ? "Uploading…" : imageUrl ? "Replace" : "Upload"}
          </button>
          {imageUrl ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 rounded-control bg-panel px-3 py-1.5 text-xs font-medium text-panel-fg/80 ring-1 ring-panel-fg/10 hover:text-panel-fg"
            >
              <Pencil className="size-3.5" /> Edit
            </button>
          ) : null}
        </div>
        {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
      </div>

      {editing && imageUrl ? (
        <PhotoEditor
          imageUrl={imageUrl}
          bucket={bucket}
          onClose={() => setEditing(false)}
          onSaved={(url) => {
            setEditing(false);
            onUploaded(url);
          }}
        />
      ) : null}
    </div>
  );
}

/**
 * Select many images at once — each one is uploaded and immediately handed
 * back as its own row (via `onUploaded`, called once per file with that
 * file's URL), rather than staging a single draft item. Used everywhere an
 * admin wants to drop in a folder of logos/photos without typing a label
 * for each one first — the text/name field on all of these tables is
 * optional, so a bulk-added row just starts blank and can be labeled later
 * via its own inline edit field.
 */
export function BulkImagePicker({
  bucket,
  onUploaded,
}: {
  bucket: "app-content" | "finance-logos";
  onUploaded: (url: string) => void | Promise<void>;
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setError(null);
    setUploading(true);
    setProgress({ done: 0, total: files.length });
    try {
      for (const file of files) {
        try {
          const base64 = await fileToBase64(file);
          const { url } = await uploadAdminImageFn({
            data: { bucket, fileName: file.name, contentType: file.type, base64 },
          });
          await onUploaded(url);
        } catch (err) {
          setError(
            `${file.name}: ${err instanceof Error ? err.message : "Upload failed"}${
              files.length > 1 ? " — continuing with the rest" : ""
            }`,
          );
        }
        setProgress((p) => (p ? { done: p.done + 1, total: p.total } : p));
      }
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-1.5 rounded-control bg-brass px-3.5 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        {uploading && progress ? `Uploading ${progress.done}/${progress.total}…` : "Add images"}
      </button>
      {error ? <p className="mt-1.5 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
