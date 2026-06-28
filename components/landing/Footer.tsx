import Link from "next/link";
import type { Messages } from "@/lib/i18n";

type FooterProps = {
  labels: Messages["footer"];
  brand: string;
};

export default function Footer({ labels, brand }: FooterProps) {
  return (
    <footer className="border-t border-white/5">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-6 py-16 md:flex-row md:items-center md:py-20">
        <div>
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-[#F5F5F0] md:text-xl"
          >
            {brand}
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/40">
            {labels.tagline}
          </p>
        </div>

        <p className="text-sm text-white/30">{labels.copyright}</p>
      </div>
    </footer>
  );
}
