import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { setFavoriteFn } from "@/lib/favoritesData";

/**
 * Favorites — Supabase-backed (shared with the app, same account) for a
 * signed-in visitor, falling back to localStorage for a signed-out one so
 * favoriting still works without an account. Which path is active is fixed
 * for the lifetime of this provider instance: sign-in/out already force a
 * full page reload elsewhere in this app (see src/routes/auth.callback.tsx,
 * Header's sign-out), so a fresh `signedIn`/`initialIds` always arrives via
 * a new SSR render rather than needing to be reconciled client-side.
 */

const STORAGE_KEY = "yalhacar-favorites";
const CHANGE_EVENT = "yalhacar-favorites-change";

function readLocalFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeLocalFavorites(ids: string[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

type FavoritesContextValue = {
  ids: string[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({
  signedIn,
  initialIds,
  children,
}: {
  signedIn: boolean;
  initialIds: string[];
  children: ReactNode;
}) {
  const [ids, setIds] = useState<string[]>(signedIn ? initialIds : []);

  useEffect(() => {
    if (signedIn) return;
    setIds(readLocalFavorites());
    const onChange = () => setIds(readLocalFavorites());
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [signedIn]);

  const toggleFavorite = useCallback(
    (id: string) => {
      const wasFavorite = ids.includes(id);
      const next = wasFavorite ? ids.filter((x) => x !== id) : [...ids, id];
      setIds(next);

      if (!signedIn) {
        writeLocalFavorites(next);
        return;
      }
      setFavoriteFn({ data: { car_id: id, favorited: !wasFavorite } }).catch(() => {
        setIds(ids); // Roll back the optimistic update on failure.
      });
    },
    [ids, signedIn],
  );

  const isFavorite = useCallback((id: string) => ids.includes(id), [ids]);

  return (
    <FavoritesContext.Provider value={{ ids, isFavorite, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within a FavoritesProvider");
  return ctx;
}
