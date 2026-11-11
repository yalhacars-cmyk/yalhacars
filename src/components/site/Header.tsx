import { Link } from "@tanstack/react-router";
import { Globe, Moon, Phone, Sun } from "lucide-react";
import { AccountMenu, SignInButton } from "@/components/site/AuthControls";
import { Sidebar } from "@/components/site/Sidebar";
import { useLocale, useT } from "@/lib/i18n/context";
import type { PublicUser } from "@/lib/auth";
import { useTheme } from "@/lib/theme/context";

export function Header({ phone, user }: { phone: string; user: PublicUser | null }) {
  const t = useT();
  const { locale, setLocale } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const otherLanguageLabel = locale === "en" ? "عربي" : "English";

  const nav = [
    { to: "/buy" as const, label: t.header.buy },
    { to: "/sell" as const, label: t.header.sell },
    { to: "/finance" as const, label: t.header.finance },
    { to: "/dealers" as const, label: t.header.dealers },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line/60 bg-panel/80 text-panel-fg backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1360px] items-center justify-between gap-4 px-5 sm:px-8">
        <Link to="/" className="flex items-center">
          <img
            src={locale === "ar" ? "/brand/logo-ar.webp" : "/brand/logo-en.webp"}
            alt={t.brand.name}
            className="h-11 w-auto rounded-[8px] sm:h-12"
          />
        </Link>

        <nav className="hidden items-center gap-7 font-body text-sm text-panel-fg/70 lg:flex">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="transition-colors hover:text-panel-fg"
              activeProps={{ className: "text-panel-fg font-medium" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden items-center gap-1.5 text-xs leading-tight sm:flex">
            <Phone className="size-3.5 text-panel-accent" />
            <div>
              <div className="text-panel-fg/50">{t.header.callUs}</div>
              <div dir="ltr" className="num font-medium text-panel-fg">
                {phone}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setLocale(locale === "en" ? "ar" : "en")}
            className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-panel-fg/20 transition-colors hover:ring-panel-fg/50 sm:flex"
          >
            <Globe className="size-3.5" />
            {otherLanguageLabel}
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? t.header.lightTheme : t.header.darkTheme}
            className="grid size-9 place-items-center rounded-full ring-1 ring-panel-fg/20 transition-colors hover:ring-panel-fg/50"
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>

          {user ? <AccountMenu user={user} /> : <SignInButton />}

          <Sidebar user={user} />
        </div>
      </div>
    </header>
  );
}
