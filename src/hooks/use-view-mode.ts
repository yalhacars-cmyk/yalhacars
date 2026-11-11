import { useState } from "react";

/**
 * Remembers a per-page grid/list preference in localStorage (per admin
 * table — Inventory, Customers, Leads, …), keyed so each page has its own
 * independent choice. Falls back to `defaultMode` on the server (no
 * localStorage during SSR) and silently no-ops if storage is unavailable
 * (private browsing, etc).
 */
export type ViewMode = "list" | "grid";

const STORAGE_PREFIX = "admin-view-mode:";

export function useViewMode(key: string, defaultMode: ViewMode = "list") {
  const [mode, setModeState] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return defaultMode;
    try {
      const stored = window.localStorage.getItem(STORAGE_PREFIX + key);
      return stored === "grid" || stored === "list" ? stored : defaultMode;
    } catch {
      return defaultMode;
    }
  });

  const setMode = (next: ViewMode) => {
    setModeState(next);
    try {
      window.localStorage.setItem(STORAGE_PREFIX + key, next);
    } catch {
      // ignore — private browsing or storage disabled
    }
  };

  return [mode, setMode] as const;
}
