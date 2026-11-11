import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { toast } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Toaster } from "@/components/ui/sonner";
import { ANTI_FLASH_SCRIPT, LocaleProvider, useT } from "@/lib/i18n/context";
import { THEME_ANTI_FLASH_SCRIPT, ThemeProvider, useTheme } from "@/lib/theme/context";
import { getSiteSettings } from "@/data/settings";
import { getFinancePartnerLogos } from "@/data/siteContent";
import { getCurrentUserFn } from "@/lib/auth";
import { FavoritesProvider } from "@/lib/favorites";
import { getMyFavoriteIdsFn } from "@/lib/favoritesData";
import { HEX_COLOR } from "@/lib/hexColor";

function NotFoundComponent() {
  const t = useT();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t.notFound.heading}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t.notFound.body}</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t.notFound.goHome}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const t = useT();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t.errorPage.heading}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t.errorPage.body}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t.errorPage.tryAgain}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t.errorPage.goHome}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: async () => {
    const [settings, user, financePartnerLogos, favoriteIds] = await Promise.all([
      getSiteSettings(),
      getCurrentUserFn(),
      getFinancePartnerLogos(),
      getMyFavoriteIdsFn(),
    ]);
    return { ...settings, user, financePartnerLogos, favoriteIds };
  },
  head: ({ loaderData }) => ({
    styles:
      loaderData && HEX_COLOR.test(loaderData.brandColor) && HEX_COLOR.test(loaderData.brandColor2)
        ? [
            {
              // Overrides the light-mode default `@theme` values in styles.css.
              // `--color-brass`/`--color-brass-2` aren't redefined under
              // `[data-theme="dark"]`, so this single override applies in
              // both themes — no separate dark-mode admin value needed.
              children: `:root{--color-brass:${loaderData.brandColor};--color-brass-2:${loaderData.brandColor2};}`,
            },
          ]
        : [],
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Yalhacar — Buy, Sell & Finance Cars in Saudi Arabia" },
      {
        name: "description",
        content:
          "Certified, 200-point inspected cars with transparent SAR pricing and finance from multiple partners across Saudi Arabia.",
      },
      { name: "author", content: "Yalhacar" },
      { property: "og:title", content: "Yalhacar — Cars built on proof, not promises" },
      {
        property: "og:description",
        content:
          "Certified, 200-point inspected cars with transparent SAR pricing and finance from multiple partners across Saudi Arabia.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: ANTI_FLASH_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: THEME_ANTI_FLASH_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>
          <LocaleProvider>{children}</LocaleProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { theme } = useTheme();
  const { phone, emailInfo, user, financePartnerLogos, favoriteIds } = Route.useLoaderData();
  // Admin has its own chrome (AdminShell: sidebar nav, sign-out, dark-only
  // look regardless of site theme) — the public marketing Header/Footer
  // don't belong floating over it.
  const isAdmin = useRouterState({
    select: (s) => s.location.pathname.startsWith("/admin"),
  });

  // The OAuth callback route redirects here with ?authError=... on failure
  // (see src/routes/auth.callback.tsx) rather than a typed search param,
  // since the error can land on any page the user started sign-in from.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("authError");
    if (!authError) return;
    toast.error(authError);
    params.delete("authError");
    const rest = params.toString();
    window.history.replaceState({}, "", window.location.pathname + (rest ? `?${rest}` : ""));
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <FavoritesProvider signedIn={!!user} initialIds={favoriteIds}>
        <div className="flex min-h-screen flex-col">
          {isAdmin ? null : <Header phone={phone} user={user} />}
          <main className={isAdmin ? "flex-1" : "flex-1 pt-16"}>
            {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
            <Outlet />
          </main>
          {isAdmin ? null : (
            <Footer phone={phone} email={emailInfo} financePartnerLogos={financePartnerLogos} />
          )}
          <Toaster theme={theme} position="top-center" richColors />
        </div>
      </FavoritesProvider>
    </QueryClientProvider>
  );
}
