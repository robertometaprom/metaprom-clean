import Link from "next/link";
import type { Locale } from "@/lib/i18n";

type LegalNoticeProps = {
  kind: "auth" | "checkout";
  locale?: Locale;
  className?: string;
};

const AUTH_COPY: Record<
  Locale,
  { lead: string; terms: string; mid: string; privacy: string }
> = {
  es: {
    lead: "Al continuar aceptas los",
    terms: "Términos",
    mid: "y reconoces el",
    privacy: "Aviso de Privacidad",
  },
  en: {
    lead: "By continuing you accept the",
    terms: "Terms",
    mid: "and acknowledge the",
    privacy: "Privacy Notice",
  },
};

const CHECKOUT_COPY: Record<
  Locale,
  { lead: string; terms: string; privacy: string; and: string; payments: string }
> = {
  es: {
    lead: "Al comprar aceptas los",
    terms: "Términos",
    privacy: "el Aviso de Privacidad",
    and: "y la",
    payments: "política de pagos y reembolsos",
  },
  en: {
    lead: "By purchasing you agree to the",
    terms: "Terms",
    privacy: "the Privacy Notice",
    and: "and the",
    payments: "payments and refunds policy",
  },
};

const LINK_CLASS = "underline underline-offset-2 hover:opacity-100";

export default function LegalNotice({
  kind,
  locale = "es",
  className = "",
}: LegalNoticeProps) {
  if (kind === "auth") {
    const copy = AUTH_COPY[locale];
    return (
      <p
        className={`text-center text-[11px] leading-4 text-current/40 ${className}`.trim()}
      >
        {copy.lead}{" "}
        <Link href="/terminos" className={LINK_CLASS}>
          {copy.terms}
        </Link>{" "}
        {copy.mid}{" "}
        <Link href="/privacidad" className={LINK_CLASS}>
          {copy.privacy}
        </Link>
        .
      </p>
    );
  }

  const copy = CHECKOUT_COPY[locale];
  return (
    <p
      className={`text-center text-[11px] leading-4 text-current/40 ${className}`.trim()}
    >
      {copy.lead}{" "}
      <Link href="/terminos" className={LINK_CLASS}>
        {copy.terms}
      </Link>
      {", "}
      <Link href="/privacidad" className={LINK_CLASS}>
        {copy.privacy}
      </Link>{" "}
      {copy.and}{" "}
      <Link href="/pagos-reembolsos" className={LINK_CLASS}>
        {copy.payments}
      </Link>
      .
    </p>
  );
}
