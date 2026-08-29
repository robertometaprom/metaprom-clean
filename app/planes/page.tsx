import type { Metadata } from "next";
import PlanesExperience from "@/components/pricing/PlanesExperience";
import { getLocale, getMessages } from "@/lib/i18n";
import { isMexicoRequestMarket } from "@/lib/market";
import {
  getAllMembershipPurchasability,
  getPackagePurchasability,
  getPlanesOfferCopy,
  getPricingPackageById,
  PLANES_ONE_OFF_PRODUCT_KEY,
} from "@/lib/pricing";
import { publicIndexMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const copy = getPlanesOfferCopy(locale);

  return publicIndexMetadata({
    title: copy.metaTitle,
    description: copy.metaDescription,
    path: "/planes",
  });
}

export default async function PlanesPage() {
  const locale = await getLocale();
  const messages = await getMessages(locale);
  const showOxxoPay = await isMexicoRequestMarket();
  const copy = getPlanesOfferCopy(locale);
  const oneOffPackage = getPricingPackageById(PLANES_ONE_OFF_PRODUCT_KEY);

  if (!oneOffPackage) {
    throw new Error("Missing commercial_1 package for /planes one-off checkout.");
  }

  return (
    <PlanesExperience
      brand={messages.nav.brand}
      navPlanesLabel={messages.nav.planes}
      createLabel={messages.nav.create}
      locale={locale}
      legal={messages.legalNav}
      showOxxoPay={showOxxoPay}
      copy={copy}
      oneOffPurchasability={getPackagePurchasability(oneOffPackage)}
      membershipPurchasability={getAllMembershipPurchasability()}
    />
  );
}
