import Link from "next/link";
import AuthButton from "@/components/AuthButton";
import type { Messages } from "@/lib/i18n";

type NavbarProps = {
  labels: Messages["nav"];
};

export default function Navbar({ labels }: NavbarProps) {
  return (
    <nav className="fixed top-0 left-0 z-50 w-full px-6 py-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="text-xl font-semibold tracking-tight text-[#F5F5F0] md:text-2xl"
          >
            {labels.brand}
          </Link>
          <Link
            href="/planes"
            className="text-sm font-medium tracking-wide text-white/70 transition hover:text-white md:text-base"
          >
            {labels.planes}
          </Link>
        </div>

        <AuthButton labels={labels} />
      </div>
    </nav>
  );
}
