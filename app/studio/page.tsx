import { getPaymentProviderDisplayMetadata } from "@/lib/payments";
import { getLocale, getMessages } from "@/lib/i18n";
import StudioPageClient from "./StudioPageClient";

export default async function StudioPage() {
  const locale = await getLocale();
  const messages = await getMessages(locale);
  const paymentProviderDisplay = getPaymentProviderDisplayMetadata();

  return (
    <StudioPageClient
      paymentProviderDisplay={paymentProviderDisplay}
      locale={locale}
      nav={messages.nav}
    />
  );
}
