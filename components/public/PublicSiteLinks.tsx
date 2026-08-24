import Link from "next/link";
import type { Locale } from "@/lib/i18n";

export const PUBLIC_NAV_KEYS = [
  "studio",
  "examples",
  "about",
  "planes",
] as const;

export type PublicNavKey = (typeof PUBLIC_NAV_KEYS)[number];

export const PUBLIC_NAV_HREFS: Record<PublicNavKey, string> = {
  studio: "/studio",
  examples: "/examples",
  about: "/about",
  planes: "/planes",
};

export const PUBLIC_NAV_LABELS: Record<
  Locale,
  Record<PublicNavKey, string>
> = {
  en: {
    studio: "Studio",
    examples: "Examples",
    about: "About",
    planes: "Plans",
  },
  es: {
    studio: "Studio",
    examples: "Ejemplos",
    about: "Acerca de",
    planes: "Planes",
  },
};

const PUBLIC_NAV_ARIA: Record<Locale, string> = {
  en: "Metaprom AI",
  es: "Metaprom AI",
};

type PublicSiteLinksProps = {
  locale: Locale;
  keys?: readonly PublicNavKey[];
  labels?: Partial<Record<PublicNavKey, string>>;
  className?: string;
  linkClassName?: string;
};

export default function PublicSiteLinks({
  locale,
  keys = PUBLIC_NAV_KEYS,
  labels,
  className = "",
  linkClassName = "transition hover:text-white",
}: PublicSiteLinksProps) {
  const copy = { ...PUBLIC_NAV_LABELS[locale], ...labels };

  return (
    <nav aria-label={PUBLIC_NAV_ARIA[locale]} className={className}>
      {keys.map((key) => (
        <Link
          key={key}
          href={PUBLIC_NAV_HREFS[key]}
          className={linkClassName}
        >
          {copy[key]}
        </Link>
      ))}
    </nav>
  );
}
