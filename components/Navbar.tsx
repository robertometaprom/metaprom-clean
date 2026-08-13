import Link from "next/link";
import AuthButton from "@/components/AuthButton";
import MetapromLogo from "@/components/studio/MetapromLogo";
import type { Messages } from "@/lib/i18n";

type NavbarProps = {
  labels: Messages["nav"];
};

export default function Navbar({ labels }: NavbarProps) {
  return (
    <nav className="pointer-events-none fixed top-0 left-0 z-50 w-full px-5 pt-4 pb-3 md:px-8 md:pt-5 md:pb-4">
      <div className="pointer-events-auto mx-auto flex max-w-7xl items-center justify-between gap-3 md:gap-4">
        <div className="min-w-0 max-w-[min(9rem,calc(100%-9.5rem))] md:max-w-none">
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

        <div className="shrink-0">
          <AuthButton labels={labels} />
        </div>
      </div>
    </nav>
  );
}
