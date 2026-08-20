import type { Metadata } from "next";
import LegalDocument from "@/components/legal/LegalDocument";
import { getLocale } from "@/lib/i18n";
import { PAYMENTS_POLICY } from "@/lib/legal/policies";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const copy = PAYMENTS_POLICY[locale];

  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
  };
}

export default async function PagosReembolsosPage() {
  const locale = await getLocale();

  return <LegalDocument locale={locale} copy={PAYMENTS_POLICY[locale]} />;
}
