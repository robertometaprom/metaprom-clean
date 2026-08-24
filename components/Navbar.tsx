import Link from "next/link";
import AuthButton from "@/components/AuthButton";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import PublicSiteLinks from "@/components/public/PublicSiteLinks";
import MetapromLogo from "@/components/studio/MetapromLogo";
import type { Locale, Messages } from "@/lib/i18n";

type NavbarProps = {
  labels: Messages["nav"];
  locale: Locale;
};

export default function Navbar({ labels, locale }: NavbarProps) {
  return (
    <nav className="pointer-events-none fixed top-0 left-0 z-50 w-full px-5 pt-4 pb-3 md:px-8 md:pt-5 md:pb-4">
      <div className="pointer-events-auto mx-auto flex max-w-7xl items-center justify-between gap-2 md:gap-4">
        <div className="min-w-0 max-w-[min(6.25rem,calc(100%-16.5rem))] md:max-w-none">
          {/* Compact lockup (symbol + wordmark, no slogan) — mobile and desktop. */}
          <Link
            href="/"
            aria-label={labels.brand}
            className="inline-flex max-w-full items-center md:hidden"
          >
            <MetapromLogo variant="compact" height={64} priority />
          </Link>
          <Link
            href="/"
            aria-label={labels.brand}
            className="hidden items-center md:inline-flex"
          >
            <MetapromLogo variant="compact" height={48} priority />
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <PublicSiteLinks
            locale={locale}
            keys={["studio", "examples", "about"]}
            className="hidden items-center gap-4 md:flex"
            linkClassName="whitespace-nowrap text-[13px] text-white/70 transition hover:text-white sm:text-base"
          />
          <Link
            href="/planes"
            className="whitespace-nowrap text-[13px] text-white/70 transition hover:text-white sm:text-base"
          >
            <span className="md:hidden">{labels.planes}</span>
            <span className="hidden md:inline">{labels.planesCta}</span>
          </Link>
          <LocaleSwitcher locale={locale} />
          <AuthButton labels={labels} />
        </div>
      </div>
    </nav>
  );
}
