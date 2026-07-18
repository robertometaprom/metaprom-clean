import Link from "next/link";

type PublicCommercialFooterProps = {
  brand: string;
  tagline: string;
};

export default function PublicCommercialFooter({
  brand,
  tagline,
}: PublicCommercialFooterProps) {
  return (
    <footer className="mt-12 border-t border-white/5 pt-8">
      <Link
        href="/"
        className="text-sm font-semibold tracking-tight text-[#F5F5F0]"
      >
        {brand}
      </Link>
      <p className="mt-2 text-xs leading-relaxed text-white/35">{tagline}</p>
    </footer>
  );
}
