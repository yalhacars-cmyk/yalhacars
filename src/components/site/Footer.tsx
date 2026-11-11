import { Link } from "@tanstack/react-router";
import {
  Apple,
  ChevronRight,
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Music2,
  Phone,
  Smartphone,
  Twitter,
  Youtube,
} from "lucide-react";
import { CITIES } from "@/data/cars";
import { FINANCE_PARTNERS, partnerLogo } from "@/data/financePartners";
import type { FinancePartnerLogo } from "@/data/siteContent";
import { useLocale, useT } from "@/lib/i18n/context";
import { formatSar, tr } from "@/lib/i18n/dictionary";
import { FinancePartnersMarquee } from "@/components/site/FinancePartnersMarquee";

const budgetAmounts = [50000, 70000, 100000, 150000, 200000];
const footerCities = ["Riyadh", "Jeddah", "Dammam", "Tabuk", "Makkah"].filter((c) =>
  CITIES.includes(c),
);
const footerColors = ["Red", "Black", "White", "Grey", "Blue"];
const newCarBrands = [
  "Hyundai",
  "Ford",
  "Toyota",
  "Kia",
  "Geely",
  "Honda",
  "Jetour",
  "Changan",
  "Nissan",
  "Suzuki",
  "Baic",
];
const usedCarBrands = [
  "Toyota",
  "Hyundai",
  "Nissan",
  "Kia",
  "Ford",
  "Chevrolet",
  "Mazda",
  "Honda",
  "Changan",
  "Haval",
];
const footerCategories = [
  "SUV",
  "Sedan",
  "Coupe",
  "Pick Up",
  "Hatchback",
  "Van",
  "MPV",
  "Crossover",
];

const socialIcons = [
  { icon: Facebook, label: "Facebook" },
  { icon: Instagram, label: "Instagram" },
  { icon: Twitter, label: "Twitter/X" },
  { icon: Linkedin, label: "LinkedIn" },
  { icon: Youtube, label: "YouTube" },
  { icon: Music2, label: "TikTok" },
];

function FooterColumn({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 text-sm font-semibold text-panel-accent">{heading}</div>
      <ul className="space-y-2.5 text-sm">{children}</ul>
    </div>
  );
}

export function Footer({
  phone,
  email,
  financePartnerLogos,
}: {
  phone: string;
  email: string;
  financePartnerLogos: FinancePartnerLogo[];
}) {
  const t = useT();
  const { locale } = useLocale();

  const legalLinks = [
    { to: "/finance" as const, label: t.footer.financeWithUs },
    { to: "/about" as const, label: t.footer.aboutUs },
    { to: "/contact" as const, label: t.footer.contactUs },
    { to: "/terms" as const, label: t.footer.termsConditions },
    { to: "/privacy" as const, label: t.footer.privacyPolicy },
  ];

  return (
    <footer className="bg-panel text-panel-fg">
      <div className="mx-auto max-w-[1360px] px-5 py-10 sm:px-8 sm:py-12">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          <div className="col-span-2 sm:col-span-3 lg:col-span-4 xl:col-span-1">
            <img
              src={locale === "ar" ? "/brand/logo-ar.webp" : "/brand/logo-en.webp"}
              alt={t.brand.name}
              className="h-12 w-auto rounded-[8px]"
            />
            <p className="mt-3 font-display text-sm text-panel-accent">{t.footer.brandLine}</p>

            <div className="mt-5 flex flex-col gap-2">
              {legalLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="flex items-center justify-between rounded-control px-3 py-2.5 text-xs font-medium text-panel-fg ring-1 ring-panel-fg/15 transition-colors hover:bg-panel-2"
                >
                  {link.label}
                  <ChevronRight className="size-3.5 text-panel-fg/40 rtl:rotate-180" />
                </Link>
              ))}
            </div>
          </div>

          <FooterColumn heading={t.footer.budgetHeading}>
            {budgetAmounts.map((amount) => (
              <li key={amount}>
                <Link
                  to="/buy"
                  search={{ maxPrice: amount }}
                  className="text-panel-fg/60 hover:text-panel-fg"
                >
                  {t.footer.budgetLabel(formatSar(amount, locale))}
                </Link>
              </li>
            ))}
          </FooterColumn>

          <FooterColumn heading={t.footer.locationHeading}>
            {footerCities.map((city) => (
              <li key={city}>
                <Link to="/buy" search={{ city }} className="text-panel-fg/60 hover:text-panel-fg">
                  {t.footer.locationLabel(tr(city, locale))}
                </Link>
              </li>
            ))}
          </FooterColumn>

          <FooterColumn heading={t.footer.colorHeading}>
            {footerColors.map((color) => (
              <li key={color}>
                <Link to="/buy" search={{ color }} className="text-panel-fg/60 hover:text-panel-fg">
                  {t.footer.colorCarsLabel(tr(color, locale))}
                </Link>
              </li>
            ))}
          </FooterColumn>

          <FooterColumn heading={t.footer.newCarsHeading}>
            {newCarBrands.map((brand) => (
              <li key={brand}>
                <Link
                  to="/buy"
                  search={{ make: brand, condition: "New" }}
                  className="text-panel-fg/60 hover:text-panel-fg"
                >
                  {t.footer.newCarsLabel(brand)}
                </Link>
              </li>
            ))}
          </FooterColumn>

          <FooterColumn heading={t.footer.usedCarsHeading}>
            {usedCarBrands.map((brand) => (
              <li key={brand}>
                <Link
                  to="/buy"
                  search={{ make: brand, condition: "Used" }}
                  className="text-panel-fg/60 hover:text-panel-fg"
                >
                  {t.footer.usedCarsLabel(brand)}
                </Link>
              </li>
            ))}
          </FooterColumn>

          <FooterColumn heading={t.footer.categoryHeading}>
            {footerCategories.map((category) => (
              <li key={category}>
                <Link
                  to="/buy"
                  search={{ bodyType: category }}
                  className="text-panel-fg/60 hover:text-panel-fg"
                >
                  {t.footer.categoryLabel(tr(category, locale))}
                </Link>
              </li>
            ))}
          </FooterColumn>
        </div>

        <div className="mt-10 border-t border-panel-fg/15 pt-6">
          <div className="mb-2 text-[11px] tracking-[0.14em] text-panel-fg/40 uppercase">
            {t.footer.financePartnersHeading}
          </div>
          {financePartnerLogos.length > 0 ? (
            <FinancePartnersMarquee logos={financePartnerLogos} />
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              {FINANCE_PARTNERS.map((partner) => (
                <span
                  key={partner.name.en}
                  className="grid h-10 place-items-center rounded-control bg-white px-3 py-1.5"
                  title={partner.name[locale]}
                >
                  <img
                    src={partnerLogo(partner, locale)}
                    alt={partner.name[locale]}
                    loading="lazy"
                    className="h-full max-w-[88px] object-contain"
                  />
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-6 border-t border-panel-fg/15 pt-6">
          <div className="flex flex-col gap-3 text-xs text-panel-fg/60 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5 text-panel-accent" />
              <span className="font-medium text-panel-fg">{t.footer.addressLabel}:</span>{" "}
              {t.footer.location}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Phone className="size-3.5 text-panel-accent" />
              <span className="font-medium text-panel-fg">{t.footer.phoneLabel}:</span>{" "}
              <span dir="ltr">{phone}</span>
            </span>
            <a
              href={`mailto:${email}`}
              className="inline-flex items-center gap-1.5 hover:text-panel-fg"
            >
              <Mail className="size-3.5 text-panel-accent" />
              <span className="font-medium text-panel-fg">{t.footer.emailLabel}:</span>{" "}
              <span dir="ltr">{email}</span>
            </a>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-panel-fg/40">
              © {new Date().getFullYear()} Yalhacar. {t.footer.rights}
            </span>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-control bg-panel-2 px-3 py-1.5 text-[11px] font-medium text-panel-fg ring-1 ring-panel-fg/10">
                  <Smartphone className="size-3.5" /> {t.footer.getTheApp}
                </span>
                <span className="grid size-7 place-items-center rounded-control bg-panel-2 text-panel-fg ring-1 ring-panel-fg/10">
                  <Apple className="size-3.5" />
                </span>
              </div>

              <div className="flex items-center gap-2">
                {socialIcons.map((social) => (
                  <span
                    key={social.label}
                    aria-label={social.label}
                    title={social.label}
                    className="grid size-7 place-items-center rounded-full bg-sand text-sand-fg/85"
                  >
                    <social.icon className="size-3.5" />
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
