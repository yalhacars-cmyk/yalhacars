import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { BulkImagePicker, ImagePicker, useNextSortOrder } from "@/components/admin/ImagePicker";
import { getAdminUser } from "@/lib/admin/auth";
import {
  type Brand,
  createBrandFn,
  createFinanceFlyerFn,
  createFinancePartnerFn,
  createHeroSlideFn,
  createHomeHeroContentFn,
  createHomeTrustItemFn,
  createOnboardingSlideFn,
  createSplashWallpaperFn,
  deleteBrandFn,
  deleteFinanceFlyerFn,
  deleteFinancePartnerFn,
  deleteHeroSlideFn,
  deleteHomeHeroContentFn,
  deleteHomeTrustItemFn,
  deleteOnboardingSlideFn,
  deleteSplashWallpaperFn,
  type FinanceFlyer,
  type FinancePartner,
  type HeroSlide,
  type HomeHeroContent,
  type HomeTrustItem,
  listBrandsFn,
  listFinanceFlyersFn,
  listFinancePartnersFn,
  listHeroSlidesFn,
  listHomeHeroContentFn,
  listHomeTrustItemsFn,
  listOnboardingSlidesFn,
  listSplashWallpapersFn,
  type OnboardingSlide,
  type SplashWallpaper,
  updateBrandFn,
  updateFinanceFlyerFn,
  updateFinancePartnerFn,
  updateHeroSlideFn,
  updateHomeHeroContentFn,
  updateHomeTrustItemFn,
  updateOnboardingSlideFn,
  updateSplashWallpaperFn,
} from "@/lib/admin/appContent";

export const Route = createFileRoute("/admin/content")({
  beforeLoad: async () => {
    const user = await getAdminUser();
    if (!user) throw redirect({ to: "/admin/login" });
    return { user };
  },
  loader: async () => {
    const [hero, appHomeHero, appHomeTrust, onboarding, splash, flyers, financePartners, brands] =
      await Promise.all([
        listHeroSlidesFn(),
        listHomeHeroContentFn(),
        listHomeTrustItemsFn(),
        listOnboardingSlidesFn(),
        listSplashWallpapersFn(),
        listFinanceFlyersFn(),
        listFinancePartnersFn(),
        listBrandsFn(),
      ]);
    return { hero, appHomeHero, appHomeTrust, onboarding, splash, flyers, financePartners, brands };
  },
  head: () => ({ meta: [{ title: "App Content — Yalhacar Admin" }] }),
  component: AdminContent,
});

const TABS = [
  "hero",
  "appHome",
  "onboarding",
  "splash",
  "flyers",
  "financePartners",
  "brands",
] as const;
type Tab = (typeof TABS)[number];

function AdminContent() {
  const { hero, appHomeHero, appHomeTrust, onboarding, splash, flyers, financePartners, brands } =
    Route.useLoaderData();
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("hero");
  const refresh = () => router.invalidate();

  const tabLabel: Record<Tab, string> = {
    hero: `Homepage hero (${hero.length})`,
    appHome: `Mobile app home`,
    onboarding: `Onboarding slides (${onboarding.length})`,
    splash: `Splash wallpapers (${splash.length})`,
    flyers: `Finance flyers (${flyers.length})`,
    financePartners: `Finance partners (${financePartners.length})`,
    brands: `Brands (${brands.length})`,
  };

  return (
    <AdminShell title="App Content" email={user.email}>
      <p className="mb-4 text-sm text-panel-fg/60">
        Images and copy for the homepage hero, onboarding, the splash screen, finance promotions,
        and brand logos.
      </p>
      <div className="mb-5 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-control px-3.5 py-2 text-sm font-medium ring-1 transition-colors ${
              tab === t
                ? "bg-brass text-white ring-brass"
                : "bg-panel-2 text-panel-fg/60 ring-panel-fg/10 hover:text-panel-fg"
            }`}
          >
            {tabLabel[t]}
          </button>
        ))}
      </div>

      {tab === "hero" ? <HeroTab rows={hero} onChange={refresh} /> : null}
      {tab === "appHome" ? (
        <AppHomeTab hero={appHomeHero} trustItems={appHomeTrust} onChange={refresh} />
      ) : null}
      {tab === "onboarding" ? <OnboardingTab rows={onboarding} onChange={refresh} /> : null}
      {tab === "splash" ? <SplashTab rows={splash} onChange={refresh} /> : null}
      {tab === "flyers" ? <FlyersTab rows={flyers} onChange={refresh} /> : null}
      {tab === "financePartners" ? (
        <FinancePartnersTab rows={financePartners} onChange={refresh} />
      ) : null}
      {tab === "brands" ? <BrandsTab rows={brands} onChange={refresh} /> : null}
    </AdminShell>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <p className="rounded-panel bg-panel-2 p-8 text-center text-sm text-panel-fg/50 ring-1 ring-panel-fg/10">
      {label}
    </p>
  );
}

function ActiveToggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-wide ${
        active ? "bg-brass/20 text-brass-2" : "bg-panel-fg/10 text-panel-fg/50"
      }`}
    >
      {active ? "active" : "hidden"}
    </button>
  );
}

function AddNote() {
  return (
    <p className="mb-3 text-xs text-panel-fg/50">
      Select one or many images to add them — no label required, add one later if you want.
    </p>
  );
}

function HeroField({
  label,
  defaultValue,
  onSave,
  textarea,
  dir,
}: {
  label: string;
  defaultValue: string;
  onSave: (value: string) => void;
  textarea?: boolean;
  dir?: "rtl";
}) {
  const cls =
    "w-full rounded-control bg-panel px-2 py-1.5 text-sm outline-none ring-1 ring-panel-fg/10 focus:ring-brass";
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value.trim();
    if (value !== defaultValue) onSave(value);
  };
  return (
    <label className="block text-xs">
      <span className="mb-1 block text-panel-fg/50">{label}</span>
      {textarea ? (
        <textarea dir={dir} defaultValue={defaultValue} rows={2} onBlur={onBlur} className={cls} />
      ) : (
        <input dir={dir} defaultValue={defaultValue} onBlur={onBlur} className={cls} />
      )}
    </label>
  );
}

function HeroTab({ rows, onChange }: { rows: HeroSlide[]; onChange: () => void }) {
  const nextSortOrder = useNextSortOrder(rows.length);

  const save = (id: string, patch: Partial<HeroSlide>) =>
    updateHeroSlideFn({ data: { id, ...patch } }).then(onChange);

  return (
    <div className="space-y-4">
      <div className="rounded-panel bg-panel-2 p-4 ring-1 ring-panel-fg/10">
        <div className="mb-2 text-xs font-medium tracking-[0.1em] text-panel-fg/50 uppercase">
          Add hero slides
        </div>
        <p className="mb-3 text-xs text-panel-fg/50">
          Select one or many images to add them — fill in the eyebrow/title/subtitle (English and
          Arabic) below afterward.
        </p>
        <BulkImagePicker
          bucket="app-content"
          onUploaded={async (image_url) => {
            await createHeroSlideFn({ data: { image_url, sort_order: nextSortOrder() } });
            onChange();
          }}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState label="No hero slides yet — the homepage falls back to a built-in default until you add one." />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="rounded-panel bg-panel-2 p-4 ring-1 ring-panel-fg/10">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <ImagePicker
                  bucket="app-content"
                  imageUrl={row.image_url}
                  onUploaded={(image_url) => save(row.id, { image_url })}
                />
                <div className="flex items-center gap-2">
                  <ActiveToggle
                    active={row.is_active}
                    onToggle={() => save(row.id, { is_active: !row.is_active })}
                  />
                  <button
                    type="button"
                    aria-label="Delete"
                    onClick={async () => {
                      if (!confirm("Delete this hero slide?")) return;
                      await deleteHeroSlideFn({ data: { id: row.id } });
                      onChange();
                    }}
                    className="grid size-8 place-items-center rounded-control text-panel-fg/50 ring-1 ring-panel-fg/10 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <HeroField
                  label="Eyebrow (EN)"
                  defaultValue={row.eyebrow_en}
                  onSave={(eyebrow_en) => save(row.id, { eyebrow_en })}
                />
                <HeroField
                  label="Eyebrow (AR)"
                  dir="rtl"
                  defaultValue={row.eyebrow_ar}
                  onSave={(eyebrow_ar) => save(row.id, { eyebrow_ar })}
                />
                <HeroField
                  label="Title (EN)"
                  defaultValue={row.title_en}
                  onSave={(title_en) => save(row.id, { title_en })}
                />
                <HeroField
                  label="Title (AR)"
                  dir="rtl"
                  defaultValue={row.title_ar}
                  onSave={(title_ar) => save(row.id, { title_ar })}
                />
                <HeroField
                  label="Subtitle (EN)"
                  textarea
                  defaultValue={row.subtitle_en}
                  onSave={(subtitle_en) => save(row.id, { subtitle_en })}
                />
                <HeroField
                  label="Subtitle (AR)"
                  textarea
                  dir="rtl"
                  defaultValue={row.subtitle_ar}
                  onSave={(subtitle_ar) => save(row.id, { subtitle_ar })}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HomeHeroList({ rows, onChange }: { rows: HomeHeroContent[]; onChange: () => void }) {
  const nextSortOrder = useNextSortOrder(rows.length);
  const [adding, setAdding] = useState(false);

  const save = (id: string, patch: Partial<HomeHeroContent>) =>
    updateHomeHeroContentFn({ data: { id, ...patch } }).then(onChange);

  const addSlide = async () => {
    setAdding(true);
    try {
      await createHomeHeroContentFn({ data: { sort_order: nextSortOrder() } });
      onChange();
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="rounded-panel bg-panel-2 p-5 ring-1 ring-panel-fg/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold">Hero cards</h2>
          <p className="mt-1 text-sm text-panel-fg/60">
            The swipeable "Find your next car" cards at the top of the mobile app's home screen.
          </p>
        </div>
        <button
          type="button"
          disabled={adding}
          onClick={addSlide}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-control bg-brass px-3.5 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {adding ? "Adding…" : "Add card"}
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 rounded-control bg-panel p-6 text-center text-sm text-panel-fg/50 ring-1 ring-panel-fg/10">
          No hero cards yet.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="rounded-control bg-panel p-4 ring-1 ring-panel-fg/10">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] tracking-[0.1em] text-panel-fg/40 uppercase">
                  Card
                </span>
                <div className="flex items-center gap-2">
                  <ActiveToggle
                    active={row.is_active}
                    onToggle={() => save(row.id, { is_active: !row.is_active })}
                  />
                  <button
                    type="button"
                    aria-label="Delete"
                    onClick={async () => {
                      if (!confirm("Delete this hero card?")) return;
                      await deleteHomeHeroContentFn({ data: { id: row.id } });
                      onChange();
                    }}
                    className="grid size-8 shrink-0 place-items-center rounded-control text-panel-fg/50 ring-1 ring-panel-fg/10 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <HeroField
                  label="Title (EN)"
                  defaultValue={row.title}
                  onSave={(title) => save(row.id, { title })}
                />
                <HeroField
                  label="Title (AR)"
                  dir="rtl"
                  defaultValue={row.title_ar}
                  onSave={(title_ar) => save(row.id, { title_ar })}
                />
                <HeroField
                  label="Subtitle (EN)"
                  textarea
                  defaultValue={row.subtitle}
                  onSave={(subtitle) => save(row.id, { subtitle })}
                />
                <HeroField
                  label="Subtitle (AR)"
                  textarea
                  dir="rtl"
                  defaultValue={row.subtitle_ar}
                  onSave={(subtitle_ar) => save(row.id, { subtitle_ar })}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TrustItemsList({ rows, onChange }: { rows: HomeTrustItem[]; onChange: () => void }) {
  const nextSortOrder = useNextSortOrder(rows.length);
  const [adding, setAdding] = useState(false);

  const addItem = async () => {
    setAdding(true);
    try {
      await createHomeTrustItemFn({ data: { sort_order: nextSortOrder() } });
      onChange();
    } finally {
      setAdding(false);
    }
  };

  const fieldCls =
    "w-full rounded-control bg-panel px-2 py-1.5 text-sm outline-none ring-1 ring-panel-fg/10 focus:ring-brass";

  return (
    <div className="rounded-panel bg-panel-2 p-5 ring-1 ring-panel-fg/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold">Trust badges</h2>
          <p className="mt-1 text-sm text-panel-fg/60">
            The row of icon + text badges under the AI Assistant bar (currently 200-Point
            Inspection, Warranty Included, Nationwide Delivery). Upload an icon image, or fall back
            to a Material Icons name.
          </p>
        </div>
        <button
          type="button"
          disabled={adding}
          onClick={addItem}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-control bg-brass px-3.5 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {adding ? "Adding…" : "Add badge"}
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 rounded-control bg-panel p-6 text-center text-sm text-panel-fg/50 ring-1 ring-panel-fg/10">
          No trust badges yet.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="rounded-control bg-panel p-3 ring-1 ring-panel-fg/10">
              <div className="flex flex-wrap items-center gap-3">
                <ImagePicker
                  bucket="app-content"
                  imageUrl={row.icon_url}
                  onUploaded={async (icon_url) => {
                    await updateHomeTrustItemFn({ data: { id: row.id, icon_url } });
                    onChange();
                  }}
                />
                <input
                  dir="ltr"
                  defaultValue={row.icon}
                  placeholder="Fallback icon (e.g. fact_check)"
                  onBlur={async (e) => {
                    const icon = e.target.value.trim();
                    if (icon !== row.icon) {
                      await updateHomeTrustItemFn({ data: { id: row.id, icon } });
                      onChange();
                    }
                  }}
                  className={`${fieldCls} w-44 shrink-0`}
                />
                {row.icon_url ? (
                  <button
                    type="button"
                    onClick={async () => {
                      await updateHomeTrustItemFn({ data: { id: row.id, icon_url: null } });
                      onChange();
                    }}
                    className="shrink-0 text-xs font-medium text-panel-fg/50 hover:text-destructive"
                  >
                    Remove image
                  </button>
                ) : null}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  defaultValue={row.label}
                  placeholder="Label (EN)"
                  onBlur={async (e) => {
                    const label = e.target.value.trim();
                    if (label !== row.label) {
                      await updateHomeTrustItemFn({ data: { id: row.id, label } });
                      onChange();
                    }
                  }}
                  className={`${fieldCls} min-w-40 flex-1`}
                />
                <input
                  dir="rtl"
                  defaultValue={row.label_ar}
                  placeholder="Label (AR)"
                  onBlur={async (e) => {
                    const label_ar = e.target.value.trim();
                    if (label_ar !== row.label_ar) {
                      await updateHomeTrustItemFn({ data: { id: row.id, label_ar } });
                      onChange();
                    }
                  }}
                  className={`${fieldCls} min-w-40 flex-1`}
                />
                <div className="ms-auto flex items-center gap-2">
                  <ActiveToggle
                    active={row.is_active}
                    onToggle={async () => {
                      await updateHomeTrustItemFn({
                        data: { id: row.id, is_active: !row.is_active },
                      });
                      onChange();
                    }}
                  />
                  <button
                    type="button"
                    aria-label="Delete"
                    onClick={async () => {
                      if (!confirm("Delete this trust badge?")) return;
                      await deleteHomeTrustItemFn({ data: { id: row.id } });
                      onChange();
                    }}
                    className="grid size-8 shrink-0 place-items-center rounded-control text-panel-fg/50 ring-1 ring-panel-fg/10 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AppHomeTab({
  hero,
  trustItems,
  onChange,
}: {
  hero: HomeHeroContent[];
  trustItems: HomeTrustItem[];
  onChange: () => void;
}) {
  return (
    <div className="space-y-4">
      <HomeHeroList rows={hero} onChange={onChange} />
      <TrustItemsList rows={trustItems} onChange={onChange} />
    </div>
  );
}

function OnboardingTab({ rows, onChange }: { rows: OnboardingSlide[]; onChange: () => void }) {
  const nextSortOrder = useNextSortOrder(rows.length);

  return (
    <div className="space-y-4">
      <div className="rounded-panel bg-panel-2 p-4 ring-1 ring-panel-fg/10">
        <div className="mb-2 text-xs font-medium tracking-[0.1em] text-panel-fg/50 uppercase">
          Add slides
        </div>
        <AddNote />
        <BulkImagePicker
          bucket="app-content"
          onUploaded={async (image_url) => {
            await createOnboardingSlideFn({
              data: { slide_key: "", image_url, sort_order: nextSortOrder() },
            });
            onChange();
          }}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState label="No onboarding slides yet." />
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-panel bg-panel-2 p-3 ring-1 ring-panel-fg/10"
            >
              <ImagePicker
                bucket="app-content"
                imageUrl={row.image_url}
                onUploaded={async (image_url) => {
                  await updateOnboardingSlideFn({ data: { id: row.id, image_url } });
                  onChange();
                }}
              />
              <input
                defaultValue={row.slide_key}
                placeholder="Slide key (optional)"
                onBlur={async (e) => {
                  const slide_key = e.target.value.trim();
                  if (slide_key !== row.slide_key) {
                    await updateOnboardingSlideFn({ data: { id: row.id, slide_key } });
                    onChange();
                  }
                }}
                className="w-40 rounded-control bg-panel px-2 py-1.5 text-sm outline-none ring-1 ring-panel-fg/10 focus:ring-brass"
              />
              <div className="flex items-center gap-2">
                <ActiveToggle
                  active={row.is_active}
                  onToggle={async () => {
                    await updateOnboardingSlideFn({
                      data: { id: row.id, is_active: !row.is_active },
                    });
                    onChange();
                  }}
                />
                <button
                  type="button"
                  aria-label="Delete"
                  onClick={async () => {
                    if (!confirm("Delete this slide?")) return;
                    await deleteOnboardingSlideFn({ data: { id: row.id } });
                    onChange();
                  }}
                  className="grid size-8 place-items-center rounded-control text-panel-fg/50 ring-1 ring-panel-fg/10 hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SplashTab({ rows, onChange }: { rows: SplashWallpaper[]; onChange: () => void }) {
  const nextSortOrder = useNextSortOrder(rows.length);

  return (
    <div className="space-y-4">
      <div className="rounded-panel bg-panel-2 p-4 ring-1 ring-panel-fg/10">
        <div className="mb-2 text-xs font-medium tracking-[0.1em] text-panel-fg/50 uppercase">
          Add wallpapers
        </div>
        <p className="mb-3 text-xs text-panel-fg/50">Select one or many images to add them.</p>
        <BulkImagePicker
          bucket="app-content"
          onUploaded={async (image_url) => {
            await createSplashWallpaperFn({ data: { image_url, sort_order: nextSortOrder() } });
            onChange();
          }}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState label="No splash wallpapers yet." />
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-panel bg-panel-2 p-3 ring-1 ring-panel-fg/10"
            >
              <ImagePicker
                bucket="app-content"
                imageUrl={row.image_url}
                onUploaded={async (image_url) => {
                  await updateSplashWallpaperFn({ data: { id: row.id, image_url } });
                  onChange();
                }}
              />
              <div className="flex items-center gap-2">
                <ActiveToggle
                  active={row.is_active}
                  onToggle={async () => {
                    await updateSplashWallpaperFn({
                      data: { id: row.id, is_active: !row.is_active },
                    });
                    onChange();
                  }}
                />
                <button
                  type="button"
                  aria-label="Delete"
                  onClick={async () => {
                    if (!confirm("Delete this wallpaper?")) return;
                    await deleteSplashWallpaperFn({ data: { id: row.id } });
                    onChange();
                  }}
                  className="grid size-8 place-items-center rounded-control text-panel-fg/50 ring-1 ring-panel-fg/10 hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FlyersTab({ rows, onChange }: { rows: FinanceFlyer[]; onChange: () => void }) {
  const nextSortOrder = useNextSortOrder(rows.length);

  return (
    <div className="space-y-4">
      <div className="rounded-panel bg-panel-2 p-4 ring-1 ring-panel-fg/10">
        <div className="mb-2 text-xs font-medium tracking-[0.1em] text-panel-fg/50 uppercase">
          Add flyers
        </div>
        <AddNote />
        <BulkImagePicker
          bucket="finance-logos"
          onUploaded={async (image_url) => {
            await createFinanceFlyerFn({
              data: { text: "", image_url, sort_order: nextSortOrder() },
            });
            onChange();
          }}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState label="No finance flyers yet." />
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-panel bg-panel-2 p-3 ring-1 ring-panel-fg/10"
            >
              <div className="flex flex-1 items-start gap-3">
                <ImagePicker
                  bucket="finance-logos"
                  imageUrl={row.image_url}
                  onUploaded={async (image_url) => {
                    await updateFinanceFlyerFn({ data: { id: row.id, image_url } });
                    onChange();
                  }}
                />
                <textarea
                  defaultValue={row.text}
                  placeholder="Flyer text (optional)"
                  rows={2}
                  onBlur={async (e) => {
                    const text = e.target.value.trim();
                    if (text !== row.text) {
                      await updateFinanceFlyerFn({ data: { id: row.id, text } });
                      onChange();
                    }
                  }}
                  className="w-64 flex-1 rounded-control bg-panel px-2 py-1.5 text-sm outline-none ring-1 ring-panel-fg/10 focus:ring-brass"
                />
              </div>
              <div className="flex items-center gap-2">
                <ActiveToggle
                  active={row.is_active}
                  onToggle={async () => {
                    await updateFinanceFlyerFn({ data: { id: row.id, is_active: !row.is_active } });
                    onChange();
                  }}
                />
                <button
                  type="button"
                  aria-label="Delete"
                  onClick={async () => {
                    if (!confirm("Delete this flyer?")) return;
                    await deleteFinanceFlyerFn({ data: { id: row.id } });
                    onChange();
                  }}
                  className="grid size-8 place-items-center rounded-control text-panel-fg/50 ring-1 ring-panel-fg/10 hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FinancePartnersTab({ rows, onChange }: { rows: FinancePartner[]; onChange: () => void }) {
  const nextSortOrder = useNextSortOrder(rows.length);

  return (
    <div className="space-y-4">
      <div className="rounded-panel bg-panel-2 p-4 ring-1 ring-panel-fg/10">
        <div className="mb-2 text-xs font-medium tracking-[0.1em] text-panel-fg/50 uppercase">
          Add finance partners
        </div>
        <p className="mb-3 text-xs text-panel-fg/50">
          Select one or many logos to add them — each becomes its own partner, name optional.
        </p>
        <BulkImagePicker
          bucket="finance-logos"
          onUploaded={async (logo_url) => {
            await createFinancePartnerFn({
              data: { name: "", logo_url, sort_order: nextSortOrder() },
            });
            onChange();
          }}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState label="No finance partners yet." />
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-panel bg-panel-2 p-3 ring-1 ring-panel-fg/10"
            >
              <div className="flex flex-1 flex-wrap items-center gap-4">
                <div>
                  <div className="mb-1 text-[10px] text-panel-fg/40 uppercase">Logo (EN)</div>
                  <ImagePicker
                    bucket="finance-logos"
                    imageUrl={row.logo_url}
                    onUploaded={async (logo_url) => {
                      await updateFinancePartnerFn({ data: { id: row.id, logo_url } });
                      onChange();
                    }}
                  />
                </div>
                <div>
                  <div className="mb-1 text-[10px] text-panel-fg/40 uppercase">Logo (AR)</div>
                  <ImagePicker
                    bucket="finance-logos"
                    imageUrl={row.logo_url_ar}
                    onUploaded={async (logo_url_ar) => {
                      await updateFinancePartnerFn({ data: { id: row.id, logo_url_ar } });
                      onChange();
                    }}
                  />
                </div>
                <input
                  defaultValue={row.name}
                  placeholder="Partner name (optional)"
                  onBlur={async (e) => {
                    const name = e.target.value.trim();
                    if (name !== row.name) {
                      await updateFinancePartnerFn({ data: { id: row.id, name } });
                      onChange();
                    }
                  }}
                  className="w-40 rounded-control bg-panel px-2 py-1.5 text-sm outline-none ring-1 ring-panel-fg/10 focus:ring-brass"
                />
              </div>
              <div className="flex items-center gap-2">
                <ActiveToggle
                  active={row.is_active}
                  onToggle={async () => {
                    await updateFinancePartnerFn({
                      data: { id: row.id, is_active: !row.is_active },
                    });
                    onChange();
                  }}
                />
                <button
                  type="button"
                  aria-label="Delete"
                  onClick={async () => {
                    if (!confirm(`Delete "${row.name || "this partner"}"?`)) return;
                    await deleteFinancePartnerFn({ data: { id: row.id } });
                    onChange();
                  }}
                  className="grid size-8 place-items-center rounded-control text-panel-fg/50 ring-1 ring-panel-fg/10 hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BrandsTab({ rows, onChange }: { rows: Brand[]; onChange: () => void }) {
  const nextSortOrder = useNextSortOrder(rows.length);

  return (
    <div className="space-y-4">
      <div className="rounded-panel bg-panel-2 p-4 ring-1 ring-panel-fg/10">
        <div className="mb-2 text-xs font-medium tracking-[0.1em] text-panel-fg/50 uppercase">
          Add brands
        </div>
        <AddNote />
        <BulkImagePicker
          bucket="app-content"
          onUploaded={async (image_url) => {
            await createBrandFn({ data: { text: "", image_url, sort_order: nextSortOrder() } });
            onChange();
          }}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState label="No brands yet." />
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-panel bg-panel-2 p-3 ring-1 ring-panel-fg/10"
            >
              <div className="flex flex-1 items-center gap-3">
                <ImagePicker
                  bucket="app-content"
                  imageUrl={row.image_url}
                  onUploaded={async (image_url) => {
                    await updateBrandFn({ data: { id: row.id, image_url } });
                    onChange();
                  }}
                />
                <input
                  defaultValue={row.text}
                  placeholder="Brand name (optional)"
                  onBlur={async (e) => {
                    const text = e.target.value.trim();
                    if (text !== row.text) {
                      await updateBrandFn({ data: { id: row.id, text } });
                      onChange();
                    }
                  }}
                  className="w-48 rounded-control bg-panel px-2 py-1.5 text-sm outline-none ring-1 ring-panel-fg/10 focus:ring-brass"
                />
              </div>
              <div className="flex items-center gap-2">
                <ActiveToggle
                  active={row.is_active}
                  onToggle={async () => {
                    await updateBrandFn({ data: { id: row.id, is_active: !row.is_active } });
                    onChange();
                  }}
                />
                <button
                  type="button"
                  aria-label="Delete"
                  onClick={async () => {
                    if (!confirm(`Delete "${row.text || "this brand"}"?`)) return;
                    await deleteBrandFn({ data: { id: row.id } });
                    onChange();
                  }}
                  className="grid size-8 place-items-center rounded-control text-panel-fg/50 ring-1 ring-panel-fg/10 hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
