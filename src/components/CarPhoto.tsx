import { cn } from "@/lib/utils";

type CarPhotoProps = {
  src: string;
  alt: string;
  /** Sizing/shape of the frame (aspect ratio, width, rounding, opacity...). */
  className?: string;
  loading?: "eager" | "lazy";
  "aria-hidden"?: boolean;
};

/**
 * Shows the whole car in its frame whatever the photo's shape. Listing photos
 * come in every ratio (many are portrait phone shots), so a plain
 * `object-cover` crops cars badly. The photo is drawn with `object-contain`
 * on top of a blurred, enlarged copy of itself, so portrait and wide photos
 * both look intentional instead of cropped or letterboxed with empty bars.
 */
export function CarPhoto({ src, alt, className, loading, ...rest }: CarPhotoProps) {
  return (
    <span className={cn("relative block overflow-hidden bg-panel-2", className)} {...rest}>
      <img
        src={src}
        alt=""
        aria-hidden
        loading={loading}
        className="absolute inset-0 size-full scale-125 object-cover opacity-70 blur-2xl"
      />
      <img src={src} alt={alt} loading={loading} className="relative size-full object-contain" />
    </span>
  );
}
