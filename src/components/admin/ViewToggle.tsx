import { LayoutGrid, List } from "lucide-react";
import type { ViewMode } from "@/hooks/use-view-mode";

/** Shared grid/list switcher for admin data tables (Inventory, Customers, Leads). */
export function ViewToggle({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  return (
    <div className="inline-flex shrink-0 items-center gap-0.5 rounded-control bg-panel-2 p-0.5 ring-1 ring-panel-fg/10">
      <button
        type="button"
        onClick={() => onChange("list")}
        aria-label="List view"
        aria-pressed={mode === "list"}
        title="List view"
        className={`grid size-8 place-items-center rounded-[6px] transition-colors ${
          mode === "list"
            ? "bg-panel text-panel-fg shadow-sm"
            : "text-panel-fg/50 hover:text-panel-fg"
        }`}
      >
        <List className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange("grid")}
        aria-label="Grid view"
        aria-pressed={mode === "grid"}
        title="Grid view"
        className={`grid size-8 place-items-center rounded-[6px] transition-colors ${
          mode === "grid"
            ? "bg-panel text-panel-fg shadow-sm"
            : "text-panel-fg/50 hover:text-panel-fg"
        }`}
      >
        <LayoutGrid className="size-4" />
      </button>
    </div>
  );
}
