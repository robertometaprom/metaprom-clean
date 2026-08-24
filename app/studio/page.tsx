import type { Metadata } from "next";
import { canSeeAnalyticsNav } from "@/lib/analytics/dashboard-access";
import { getPaymentProviderDisplayMetadata } from "@/lib/payments";
import { getLocale, getMessages } from "@/lib/i18n";
import { publicIndexMetadata } from "@/lib/seo/metadata";
import { createClient } from "@/lib/supabase/server";
import StudioPageClient from "./StudioPageClient";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const messages = await getMessages(locale);

  return publicIndexMetadata({
    title: messages.studioSeo.metaTitle,
    description: messages.studioSeo.metaDescription,
    path: "/studio",
  });
}

export default async function StudioPage() {
  const locale = await getLocale();
  const messages = await getMessages(locale);
  const paymentProviderDisplay = getPaymentProviderDisplayMetadata();

  let showAnalyticsNav = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    showAnalyticsNav = canSeeAnalyticsNav(user);
  } catch {
    showAnalyticsNav = false;
  }

  return (
    <StudioPageClient
      paymentProviderDisplay={paymentProviderDisplay}
      locale={locale}
      nav={messages.nav}
      showAnalyticsNav={showAnalyticsNav}
    />
  );
}
