import Link from "next/link";
import type { Locale, Messages } from "@/lib/i18n";

type LegalLinksProps = {
  className?: string;
  locale?: Locale;
  labels?: Messages["legalNav"];
};

const DEFAULT_LABELS: Record<Locale, Messages["legalNav"]> = {
  es: {
    aria: "Información legal",
    terms: "Términos",
    privacy: "Privacidad",
    payments: "Pagos y reembolsos",
  },
  en: {
    aria: "Legal information",
    terms: "Terms",
    privacy: "Privacy",
    payments: "Payments and refunds",
  },
};

export default function LegalLinks({
  className = "",
  locale = "es",
  labels,
}: LegalLinksProps) {
  const copy = labels ?? DEFAULT_LABELS[locale];

  return (
    <nav aria-label={copy.aria} className={className}>
      <Link href="/terminos" className="transition hover:text-white">
        {copy.terms}
      </Link>
      <Link href="/privacidad" className="transition hover:text-white">
        {copy.privacy}
      </Link>
      <Link href="/pagos-reembolsos" className="transition hover:text-white">
        {copy.payments}
      </Link>
    </nav>
  );
}
