import { Loader2, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { uploadAdminImageFn, uploadCarImageFn } from "@/lib/admin/storage";

export type PhotoEditorBucket = "car-images" | "app-content" | "finance-logos";

// Transparent-background watermark, keyed and color-decontaminated from
// logo_english.png at its full source resolution (see the brand-asset prep
// notes below) — logo_english.png itself is fully opaque, so drawing it
// straight onto a photo pastes a solid orange box instead of a clean mark.
const LOGO_URL = "/brand/logo-watermark.png";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

type LogoRect = { x: number; y: number; width: number; height: number };

/**
 * Manual logo-placement editor for one photo — admin drags/resizes the
 * watermark into position (typically over a car's plate, but works on any
 * image: hero slides, onboarding, brand logos, …) and saves a composited
 * copy back to whichever bucket the source image belongs to (`bucket` picks
 * uploadCarImageFn vs uploadAdminImageFn — same distinction ImagePicker's
 * own upload already makes). No AI plate detection yet (phase 2, not built
 * here); background removal is deliberately not in this tool either — the
 * obvious free client-side library is AGPLv3, a real risk to bundle into a
 * closed commercial product, so it's on hold for a properly-licensed
 * alternative.
 */
export function PhotoEditor({
  imageUrl,
  bucket,
  onSaved,
  onClose,
}: {
  imageUrl: string;
  bucket: PhotoEditorBucket;
  onSaved: (url: string) => void;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseImgRef = useRef<HTMLImageElement | null>(null);
  const logoImgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; rectX: number; rectY: number } | null>(
    null,
  );

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLogo, setShowLogo] = useState(true);
  const [logoRect, setLogoRect] = useState<LogoRect | null>(null);
  const [scalePct, setScalePct] = useState(20);
  const [saving, setSaving] = useState(false);

  // Load the photo + logo once, size the canvas to the photo's native
  // resolution (so the exported file isn't downgraded), and seed a
  // reasonable starting position for the logo — bottom-center, where a
  // plate usually sits — for the admin to drag from.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [base, logo] = await Promise.all([loadImage(imageUrl), loadImage(LOGO_URL)]);
        if (cancelled) return;
        baseImgRef.current = base;
        logoImgRef.current = logo;
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = base.naturalWidth;
          canvas.height = base.naturalHeight;
        }
        const width = base.naturalWidth * 0.2;
        const height = width * (logo.naturalHeight / logo.naturalWidth);
        setLogoRect({
          x: (base.naturalWidth - width) / 2,
          y: base.naturalHeight - height * 1.4,
          width,
          height,
        });
        setReady(true);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load image");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  // Redraw whenever the logo moves, resizes, or is toggled off.
  useEffect(() => {
    const canvas = canvasRef.current;
    const base = baseImgRef.current;
    const logo = logoImgRef.current;
    if (!canvas || !base || !ready) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(base, 0, 0);
    if (showLogo && logo && logoRect) {
      ctx.drawImage(logo, logoRect.x, logoRect.y, logoRect.width, logoRect.height);
    }
  }, [ready, showLogo, logoRect]);

  // Update logo size from the scale slider (percent of photo width), keeping its center fixed.
  useEffect(() => {
    const base = baseImgRef.current;
    const logo = logoImgRef.current;
    if (!base || !logo) return;
    setLogoRect((prev) => {
      if (!prev) return prev;
      const width = base.naturalWidth * (scalePct / 100);
      const height = width * (logo.naturalHeight / logo.naturalWidth);
      const cx = prev.x + prev.width / 2;
      const cy = prev.y + prev.height / 2;
      return { x: cx - width / 2, y: cy - height / 2, width, height };
    });
  }, [scalePct]);

  const canvasPointFromEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!showLogo || !logoRect) return;
    const { x, y } = canvasPointFromEvent(e);
    if (x < logoRect.x || x > logoRect.x + logoRect.width) return;
    if (y < logoRect.y || y > logoRect.y + logoRect.height) return;
    dragRef.current = { startX: x, startY: y, rectX: logoRect.x, rectY: logoRect.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current || !logoRect) return;
    const { x, y } = canvasPointFromEvent(e);
    const dx = x - dragRef.current.startX;
    const dy = y - dragRef.current.startY;
    setLogoRect({ ...logoRect, x: dragRef.current.rectX + dx, y: dragRef.current.rectY + dy });
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const resetPosition = () => {
    const base = baseImgRef.current;
    const logo = logoImgRef.current;
    if (!base || !logo) return;
    const width = base.naturalWidth * (scalePct / 100);
    const height = width * (logo.naturalHeight / logo.naturalWidth);
    setLogoRect({
      x: (base.naturalWidth - width) / 2,
      y: base.naturalHeight - height * 1.4,
      width,
      height,
    });
  };

  const save = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    setError(null);
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png"),
      );
      if (!blob) throw new Error("Could not export the edited photo");
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.slice(result.indexOf(",") + 1));
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
      const { url } =
        bucket === "car-images"
          ? await uploadCarImageFn({
              data: { fileName: "edited.png", contentType: "image/png", base64 },
            })
          : await uploadAdminImageFn({
              data: { bucket, fileName: "edited.png", contentType: "image/png", base64 },
            });
      onSaved(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-3xl rounded-panel bg-panel p-5 text-panel-fg ring-1 ring-panel-fg/10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold">Edit photo</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 place-items-center rounded-control text-panel-fg/60 hover:text-panel-fg"
          >
            <X className="size-4" />
          </button>
        </div>

        {error ? (
          <p className="mb-3 rounded-control bg-destructive/15 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="overflow-hidden rounded-control bg-black/20">
          {!ready ? (
            <div className="grid aspect-video place-items-center text-panel-fg/50">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : null}
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className={`w-full ${ready ? "" : "hidden"} ${showLogo ? "cursor-move" : ""}`}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showLogo}
              onChange={(e) => setShowLogo(e.target.checked)}
              className="size-4"
            />
            Add logo watermark
          </label>

          {showLogo ? (
            <>
              <label className="flex flex-1 items-center gap-2 text-sm">
                <span className="shrink-0 text-panel-fg/60">Size</span>
                <input
                  type="range"
                  min={5}
                  max={60}
                  value={scalePct}
                  onChange={(e) => setScalePct(Number(e.target.value))}
                  className="w-full"
                />
              </label>
              <button
                type="button"
                onClick={resetPosition}
                className="inline-flex items-center gap-1.5 rounded-control bg-panel-2 px-3 py-1.5 text-xs font-medium text-panel-fg/70 ring-1 ring-panel-fg/10 hover:text-panel-fg"
              >
                <RotateCcw className="size-3.5" /> Reset position
              </button>
            </>
          ) : null}
        </div>
        <p className="mt-1.5 text-xs text-panel-fg/50">
          Drag the logo onto the plate, then Save. Background removal isn't available yet.
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-control px-3.5 py-2 text-sm font-medium text-panel-fg/70 ring-1 ring-panel-fg/10 hover:text-panel-fg"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!ready || saving}
            onClick={save}
            className="rounded-control bg-brass px-3.5 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
