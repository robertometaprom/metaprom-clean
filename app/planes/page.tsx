import type { Metadata } from "next";
import PlanesExperience, {
  buildPackageCardView,
} from "@/components/pricing/PlanesExperience";
import { getLocale, getMessages } from "@/lib/i18n";
import { isMexicoRequestMarket } from "@/lib/market";
import {
  getActivePricingCategories,
  getAllPackagePurchasability,
  getPackagesByCategory,
  PRICING_PACKAGES,
} from "@/lib/pricing";
import { publicIndexMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = publicIndexMetadata({
  title: "Planes Metaprom — Comerciales e imágenes publicitarias",
  description:
    "Comerciales e imágenes publicitarias listos para usar. Sin suscripciones. Sin vencimientos. Compra solo lo que necesites.",
  path: "/planes",
});

export default async function PlanesPage() {
  const locale = await getLocale();
  const messages = await getMessages(locale);
  const showOxxoPay = await isMexicoRequestMarket();
  const purchasability = getAllPackagePurchasability(PRICING_PACKAGES);

  const categories = getActivePricingCategories().map((meta) => ({
    meta,
    packages: getPackagesByCategory(meta.id).map((pkg) =>
      buildPackageCardView(pkg, purchasability[pkg.id], locale),
    ),
  }));

  return (
    <PlanesExperience
      brand={messages.nav.brand}
      navPlanesLabel={messages.nav.planes}
      createLabel={messages.nav.create}
      locale={locale}
      legal={messages.legalNav}
      showOxxoPay={showOxxoPay}
      categories={categories}
    />
  );
}
