import Link from "next/link";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import Footer from "@/components/landing/Footer";
import PublicSiteLinks from "@/components/public/PublicSiteLinks";
import MetapromLogo from "@/components/studio/MetapromLogo";
import type { Locale, Messages } from "@/lib/i18n";

type PublicPageShellProps = {
  locale: Locale;
  brand: string;
  footer: Messages["footer"];
  legal: Messages["legalNav"];
  children: React.ReactNode;
};

export default function PublicPageShell({
  locale,
  brand,
  footer,
  legal,
  children,
}: PublicPageShellProps) {
  return (
    <div className="min-h-screen bg-black text-[#F5F5F0]">
      <header className="border-b border-white/5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-5 md:px-8">
          <Link href="/" aria-label={brand}>
            <MetapromLogo variant="dark" height={32} priority />
          </Link>
          <div className="flex items-center gap-3 sm:gap-4">
            <PublicSiteLinks
              locale={locale}
              keys={["studio", "examples", "about"]}
              className="hidden items-center gap-4 md:flex"
              linkClassName="whitespace-nowrap text-sm text-white/70 transition hover:text-white"
            />
            <LocaleSwitcher locale={locale} />
          </div>
        </div>
      </header>

      {children}

      <Footer labels={footer} brand={brand} locale={locale} legal={legal} />
    </div>
  );
}
