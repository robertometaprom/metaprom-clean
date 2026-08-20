import type { Metadata } from "next";
import LegalDocument from "@/components/legal/LegalDocument";
import { getLocale } from "@/lib/i18n";
import { TERMS_POLICY } from "@/lib/legal/policies";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const copy = TERMS_POLICY[locale];

  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
  };
}

export default async function TerminosPage() {
  const locale = await getLocale();

  return <LegalDocument locale={locale} copy={TERMS_POLICY[locale]} />;
}
