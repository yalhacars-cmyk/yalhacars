import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Car,
  Globe,
  Images,
  Inbox,
  LayoutDashboard,
  LayoutList,
  LogOut,
  Menu,
  ReceiptText,
  Settings,
  Users,
  X,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { useState } from "react";
import { adminLogout } from "@/lib/admin/auth";
import { useLocale } from "@/lib/i18n/context";

type NavTo =
  | "/admin"
  | "/admin/inventory"
  | "/admin/leads"
  | "/admin/reservations"
  | "/admin/catalog"
  | "/admin/content"
  | "/admin/activity"
  | "/admin/customers"
  | "/admin/settings";

type NavItem = { to: NavTo; label: string; icon: ComponentType<{ className?: string }> };

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  { label: "Overview", items: [{ to: "/admin", label: "Dashboard", icon: LayoutDashboard }] },
  {
    label: "Sales",
    items: [
      { to: "/admin/inventory", label: "Inventory", icon: Car },
      { to: "/admin/leads", label: "Leads", icon: Inbox },
      { to: "/admin/reservations", label: "Reservations", icon: ReceiptText },
    ],
  },
  {
    label: "Content",
    items: [
      { to: "/admin/catalog", label: "Catalog", icon: LayoutList },
      { to: "/admin/content", label: "App Content", icon: Images },
    ],
  },
  {
    label: "Accounts",
    items: [
      { to: "/admin/activity", label: "Activity", icon: Activity },
      { to: "/admin/customers", label: "Customers", icon: Users },
    ],
  },
  { label: "General", items: [{ to: "/admin/settings", label: "Settings", icon: Settings }] },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="space-y-5">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <div className="mb-1.5 px-3 text-[10px] font-medium tracking-[0.14em] text-panel-fg/40 uppercase">
            {group.label}
          </div>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active =
                item.to === "/admin" ? pathname === "/admin" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className={`flex items-center gap-2.5 rounded-control px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-brass text-white"
                      : "text-panel-fg/65 hover:bg-panel-2 hover:text-panel-fg"
                  }`}
                >
                  <item.icon className="size-4 shrink-0" /> {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarBrand() {
  return (
    <div className="flex items-center gap-2 px-3 py-1">
      <div className="grid size-8 shrink-0 place-items-center rounded-control bg-brass font-display text-sm font-bold text-white">
        Y
      </div>
      <div>
        <div className="font-display text-sm font-semibold leading-tight">Yalhacar</div>
        <div className="text-[10px] tracking-[0.14em] text-panel-fg/40 uppercase">Admin</div>
      </div>
    </div>
  );
}

/** Controls the *public site's* language (what a shopper sees) — the admin
 * panel itself has no Arabic translations and always stays English/LTR
 * (see LocaleProvider's isAdminRoute check), so this only affects what
 * language loads next time this browser visits the storefront. */
function LanguageToggle() {
  const { locale, setLocale } = useLocale();
  const otherLanguageLabel = locale === "en" ? "عربي" : "English";
  return (
    <button
      type="button"
      onClick={() => setLocale(locale === "en" ? "ar" : "en")}
      title="Language shown on the public site"
      className="flex w-full items-center gap-2 rounded-control px-3 py-2 text-sm font-medium text-panel-fg/70 ring-1 ring-panel-fg/10 hover:text-panel-fg"
    >
      <Globe className="size-4" /> Site language: {otherLanguageLabel}
    </button>
  );
}

function SignOutButton({ email }: { email: string }) {
  return (
    <div className="space-y-2 border-t border-panel-fg/10 p-3">
      <LanguageToggle />
      <div className="truncate px-1 text-xs text-panel-fg/50">{email}</div>
      <button
        type="button"
        onClick={async () => {
          await adminLogout();
          window.location.href = "/admin/login";
        }}
        className="flex w-full items-center gap-2 rounded-control px-3 py-2 text-sm font-medium text-panel-fg/70 ring-1 ring-panel-fg/10 hover:text-panel-fg"
      >
        <LogOut className="size-4" /> Sign out
      </button>
    </div>
  );
}

export function AdminShell({
  title,
  email,
  children,
}: {
  title: string;
  email: string;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-panel text-panel-fg">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 start-0 hidden w-64 flex-col border-e border-panel-fg/10 bg-panel-2 lg:flex">
        <div className="flex h-16 items-center border-b border-panel-fg/10 px-3">
          <SidebarBrand />
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <NavLinks />
        </div>
        <SignOutButton email={email} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 start-0 flex w-72 flex-col bg-panel-2">
            <div className="flex h-16 items-center justify-between border-b border-panel-fg/10 px-3">
              <SidebarBrand />
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
                className="grid size-8 place-items-center rounded-control text-panel-fg/60 hover:text-panel-fg"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <NavLinks onNavigate={() => setMobileOpen(false)} />
            </div>
            <SignOutButton email={email} />
          </aside>
        </div>
      ) : null}

      {/* Content column */}
      <div className="lg:ps-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-panel-fg/10 bg-panel/95 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            className="grid size-9 place-items-center rounded-control text-panel-fg/70 ring-1 ring-panel-fg/10 hover:text-panel-fg lg:hidden"
          >
            <Menu className="size-5" />
          </button>
          <h1 className="font-display text-lg font-semibold">{title}</h1>
        </header>

        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
