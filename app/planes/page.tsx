import type { Metadata } from "next";
import PlanesExperience, {
  buildPackageCardView,
} from "@/components/pricing/PlanesExperience";
import { getLocale, getMessages } from "@/lib/i18n";
import {
  getActivePricingCategories,
  getAllPackagePurchasability,
  getPackagesByCategory,
  PRICING_PACKAGES,
} from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Planes Metaprom — Comerciales e imágenes publicitarias",
  description:
    "Comerciales e imágenes publicitarias listos para usar. Sin suscripciones. Sin vencimientos. Compra solo lo que necesites.",
};

export default async function PlanesPage() {
  const locale = await getLocale();
  const messages = await getMessages(locale);
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
      categories={categories}
    />
  );
}
