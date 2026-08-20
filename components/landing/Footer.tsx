import Link from "next/link";
import MetapromLogo from "@/components/studio/MetapromLogo";
import type { Locale, Messages } from "@/lib/i18n";
import LegalLinks from "@/components/legal/LegalLinks";

type FooterProps = {
  labels: Messages["footer"];
  brand: string;
  locale: Locale;
  legal: Messages["legalNav"];
};

export default function Footer({ labels, brand, locale, legal }: FooterProps) {
  return (
    <footer className="border-t border-white/5">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-6 py-16 md:flex-row md:items-center md:py-20">
        <div>
          <Link href="/" aria-label={brand}>
            <MetapromLogo variant="dark" height={28} />
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/40">
            {labels.tagline}
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 md:items-end">
          <Link
            href="/planes"
            className="text-sm text-white/55 transition hover:text-white"
          >
            {labels.planes}
          </Link>
          <LegalLinks
            locale={locale}
            labels={legal}
            className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-white/40 md:justify-end"
          />
          <p className="text-sm text-white/30">{labels.copyright}</p>
        </div>
      </div>
    </footer>
  );
}
