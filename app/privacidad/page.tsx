import type { Metadata } from "next";
import LegalDocument from "@/components/legal/LegalDocument";
import { getLocale } from "@/lib/i18n";
import { PRIVACY_POLICY } from "@/lib/legal/policies";
import { publicIndexMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const copy = PRIVACY_POLICY[locale];

  return publicIndexMetadata({
    title: copy.metaTitle,
    description: copy.metaDescription,
    path: "/privacidad",
  });
}

export default async function PrivacidadPage() {
  const locale = await getLocale();

  return <LegalDocument locale={locale} copy={PRIVACY_POLICY[locale]} />;
}
