import Link from "next/link";

type LegalLinksProps = {
  className?: string;
};

export default function LegalLinks({ className = "" }: LegalLinksProps) {
  return (
    <nav aria-label="Información legal" className={className}>
      <Link href="/terminos" className="transition hover:text-white">
        Términos
      </Link>
      <Link href="/privacidad" className="transition hover:text-white">
        Privacidad
      </Link>
      <Link href="/pagos-reembolsos" className="transition hover:text-white">
        Pagos y reembolsos
      </Link>
    </nav>
  );
}
