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
        <Link href="/" aria-label={labels.brand} className="inline-flex shrink-0 items-center">
          <span className="md:hidden">
            <MetapromLogo variant="dark" height={34} priority />
          </span>
          <span className="hidden md:inline-flex">
            <MetapromLogo variant="dark" height={48} priority />
          </span>
        </Link>

        <AuthButton labels={labels} />
      </div>
    </nav>
  );
}
