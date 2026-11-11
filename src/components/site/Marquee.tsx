import type { ReactNode } from "react";

/**
 * Generic auto-sliding, seamless-loop, pause-on-hover strip. Renders `items`
 * twice back to back and slides the track exactly -50% (see the `marquee`
 * keyframes in styles.css) — that's what makes the loop seamless regardless
 * of how many items there are.
 */
export function Marquee<T>({
  items,
  keyFn,
  renderItem,
}: {
  items: T[];
  keyFn: (item: T, index: number) => string;
  renderItem: (item: T) => ReactNode;
}) {
  if (items.length === 0) return null;
  const track = [...items, ...items];

  return (
    <div
      dir="ltr"
      className="group relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
    >
      <div className="flex w-max animate-[marquee_140s_linear_infinite] items-center gap-3 group-hover:[animation-play-state:paused]">
        {track.map((item, i) => (
          <div key={keyFn(item, i)} className="shrink-0">
            {renderItem(item)}
          </div>
        ))}
      </div>
    </div>
  );
}
