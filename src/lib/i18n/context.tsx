import { useRouterState } from "@tanstack/react-router";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { translations, type Locale } from "./dictionary";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dir: "ltr" | "rtl";
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

const STORAGE_KEY = "yalhacar-locale";
const DEFAULT_LOCALE: Locale = "ar";

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  // The admin panel has no Arabic translations — its layout must always stay
  // LTR regardless of the visitor's site-wide language preference, otherwise
  // it renders English text inside an RTL-mirrored (visually broken) layout.
  const isAdminRoute = useRouterState({
    select: (s) => s.location.pathname.startsWith("/admin"),
  });

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "ar" || stored === "en") {
      setLocaleState(stored);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = isAdminRoute ? "en" : locale;
    document.documentElement.dir = isAdminRoute ? "ltr" : locale === "ar" ? "rtl" : "ltr";
  }, [locale, isAdminRoute]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, dir: locale === "ar" ? "rtl" : "ltr" }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within a LocaleProvider");
  return ctx;
}

type Dict = (typeof translations)["en"];

export function useT(): Dict {
  const { locale } = useLocale();
  return translations[locale];
}

// Default is Arabic/RTL (matches the static <html lang="ar" dir="rtl"> in
// __root.tsx), so this only needs to *opt out* to English for a returning
// visitor who chose it — no flash either way. The admin panel is always
// forced to English/LTR (see LocaleProvider above), checked first so a hard
// refresh on /admin never flashes RTL before React hydrates.
export const ANTI_FLASH_SCRIPT = `
(function () {
  try {
    if (window.location.pathname.indexOf("/admin") === 0) {
      document.documentElement.lang = "en";
      document.documentElement.dir = "ltr";
      return;
    }
    var l = window.localStorage.getItem("${STORAGE_KEY}");
    if (l === "en") {
      document.documentElement.lang = "en";
      document.documentElement.dir = "ltr";
    }
  } catch (e) {}
})();
`;
