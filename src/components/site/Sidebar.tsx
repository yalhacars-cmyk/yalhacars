import { Link } from "@tanstack/react-router";
import {
  BadgePercent,
  Bot,
  Building2,
  Calculator,
  Car,
  Globe,
  HandCoins,
  Handshake,
  Heart,
  Landmark,
  LogIn,
  LogOut,
  Menu,
  Moon,
  PackageSearch,
  Phone,
  Scale,
  Sparkles,
  Sun,
  Tag,
} from "lucide-react";
import { useState, type ComponentType } from "react";
import { signOutAndReload, useGoogleSignIn } from "@/components/site/AuthControls";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { PublicUser } from "@/lib/auth";
import { useLocale, useT } from "@/lib/i18n/context";
import { useTheme } from "@/lib/theme/context";

const itemClass =
  "group flex items-center gap-3 rounded-control px-3 py-2.5 text-sm text-ink/80 transition-colors hover:bg-sand hover:text-sand-fg";

function Row({
  icon: Icon,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <>
      <Icon className="size-4 shrink-0 text-brass group-hover:text-sand-accent" />
      <span>{children}</span>
    </>
  );
}

export function Sidebar({ user }: { user: PublicUser | null }) {
  const t = useT();
  const { locale, setLocale } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const { signIn, loading: signingIn } = useGoogleSignIn();
  const otherLanguageLabel = locale === "en" ? "عربي" : "English";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={t.sidebar.menuLabel}
          className="grid size-9 place-items-center rounded-full ring-1 ring-panel-fg/20 transition-colors hover:ring-panel-fg/50"
        >
          <Menu className="size-4" />
        </button>
      </SheetTrigger>
      <SheetContent
        side={locale === "ar" ? "right" : "left"}
        className="flex w-[85vw] max-w-sm flex-col gap-0 overflow-y-auto bg-paper p-0"
      >
        <SheetHeader className="border-b border-line p-5 text-left">
          <SheetTitle className="flex items-center font-display">
            <img
              src={locale === "ar" ? "/brand/logo-ar.webp" : "/brand/logo-en.webp"}
              alt={t.brand.name}
              className="h-10 w-auto rounded-[8px]"
            />
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-1 border-b border-line p-3">
          {user ? (
            <>
              <div className="flex items-center gap-3 rounded-control px-3 py-2.5 text-sm text-ink/60">
                <span className="truncate">{user.name}</span>
              </div>
              <button type="button" onClick={signOutAndReload} className={itemClass}>
                <Row icon={LogOut}>Sign out</Row>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => signIn()}
              disabled={signingIn}
              className={itemClass}
            >
              <Row icon={LogIn}>{signingIn ? "Redirecting…" : t.sidebar.loginSignup}</Row>
            </button>
          )}
          <button
            type="button"
            onClick={() => setLocale(locale === "en" ? "ar" : "en")}
            className={itemClass}
          >
            <Row icon={Globe}>{otherLanguageLabel}</Row>
          </button>
          <button type="button" onClick={toggleTheme} className={itemClass}>
            <Row icon={theme === "dark" ? Sun : Moon}>
              {theme === "dark" ? t.header.lightTheme : t.header.darkTheme}
            </Row>
          </button>
        </div>

        <nav className="flex flex-col gap-1 p-3">
          <div className="px-3 pt-2 pb-1 text-[11px] tracking-[0.14em] text-ink/40 uppercase">
            {t.sidebar.servicesHeading}
          </div>

          <SheetClose asChild>
            <Link to="/buy" className={itemClass}>
              <Row icon={Car}>{t.sidebar.cars}</Row>
            </Link>
          </SheetClose>

          <SheetClose asChild>
            <Link to="/sell" className={itemClass}>
              <Row icon={HandCoins}>{t.header.sell}</Row>
            </Link>
          </SheetClose>

          <SheetClose asChild>
            <Link to="/dealers" className={itemClass}>
              <Row icon={Handshake}>{t.header.dealers}</Row>
            </Link>
          </SheetClose>

          <SheetClose asChild>
            <Link to="/buy" className={itemClass}>
              <Row icon={Tag}>{t.sidebar.carsOffers}</Row>
            </Link>
          </SheetClose>

          <SheetClose asChild>
            <Link to="/buy" search={{ condition: "Used" }} className={itemClass}>
              <Row icon={BadgePercent}>{t.sidebar.usedCarsOffers}</Row>
            </Link>
          </SheetClose>

          <SheetClose asChild>
            <Link to="/buy" search={{ condition: "New" }} className={itemClass}>
              <Row icon={Sparkles}>{t.sidebar.newCarsOffers}</Row>
            </Link>
          </SheetClose>

          <SheetClose asChild>
            <Link to="/track-order" className={itemClass}>
              <Row icon={PackageSearch}>{t.sidebar.trackOrder}</Row>
            </Link>
          </SheetClose>

          <SheetClose asChild>
            <Link to="/finance" className={itemClass}>
              <Row icon={Landmark}>{t.sidebar.carsFinance}</Row>
            </Link>
          </SheetClose>

          <SheetClose asChild>
            <Link to="/finance" hash="calculator" className={itemClass}>
              <Row icon={Calculator}>{t.sidebar.financingCalculator}</Row>
            </Link>
          </SheetClose>

          <SheetClose asChild>
            <Link to="/compare" className={itemClass}>
              <Row icon={Scale}>{t.sidebar.compareCars}</Row>
            </Link>
          </SheetClose>

          <SheetClose asChild>
            <Link to="/favorites" className={itemClass}>
              <Row icon={Heart}>{t.sidebar.favorites}</Row>
            </Link>
          </SheetClose>

          <SheetClose asChild>
            <Link to="/assistant" className={itemClass}>
              <Row icon={Bot}>{t.sidebar.assistant}</Row>
            </Link>
          </SheetClose>

          <SheetClose asChild>
            <Link to="/b2b" className={itemClass}>
              <Row icon={Building2}>{t.sidebar.b2bSales}</Row>
            </Link>
          </SheetClose>

          <SheetClose asChild>
            <Link to="/contact" className={itemClass}>
              <Row icon={Phone}>{t.sidebar.contactUs}</Row>
            </Link>
          </SheetClose>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
