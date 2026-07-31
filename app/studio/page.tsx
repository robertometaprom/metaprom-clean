import { getPaymentProviderDisplayMetadata } from "@/lib/payments";
import StudioPageClient from "./StudioPageClient";

export default function StudioPage() {
  const paymentProviderDisplay = getPaymentProviderDisplayMetadata();

  return (
    <StudioPageClient paymentProviderDisplay={paymentProviderDisplay} />
  );
}
