import Link from "next/link";
import MetapromLogo from "@/components/studio/MetapromLogo";

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
      <Link href="/" aria-label={brand}>
        <MetapromLogo variant="dark" height={24} />
      </Link>
      <p className="mt-2 text-xs leading-relaxed text-white/35">{tagline}</p>
    </footer>
  );
}
