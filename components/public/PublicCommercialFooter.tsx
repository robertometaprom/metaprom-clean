import Link from "next/link";
import LegalLinks from "@/components/legal/LegalLinks";
import MetapromLogo from "@/components/studio/MetapromLogo";
import type { Locale } from "@/lib/i18n";

type PublicCommercialFooterProps = {
  brand: string;
  tagline: string;
  locale?: Locale;
};

export default function PublicCommercialFooter({
  brand,
  tagline,
  locale = "es",
}: PublicCommercialFooterProps) {
  return (
    <footer className="mt-12 border-t border-white/5 pt-8">
      <Link href="/" aria-label={brand}>
        <MetapromLogo variant="dark" height={24} />
      </Link>
      <p className="mt-2 text-xs leading-relaxed text-white/35">{tagline}</p>
      <LegalLinks
        locale={locale}
        className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/35"
      />
    </footer>
  );
}
