import {
  PRICING_CATEGORIES,
  PRICING_PACKAGES,
  type PricingCategory,
  type PricingPackage,
  type PricingPackageId,
} from "./catalog";

export function getPricingPackageById(
  id: PricingPackageId | string,
): PricingPackage | undefined {
  return PRICING_PACKAGES.find((pkg) => pkg.id === id);
}

export function getPackagesByCategory(
  category: PricingCategory,
  options?: { includeInactive?: boolean },
): PricingPackage[] {
  return PRICING_PACKAGES.filter((pkg) => {
    if (pkg.category !== category) return false;
    if (!options?.includeInactive && !pkg.active) return false;
    return true;
  }).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getActivePricingCategories() {
  return PRICING_CATEGORIES.filter((category) =>
    PRICING_PACKAGES.some((pkg) => pkg.category === category.id && pkg.active),
  );
}

export function listActivePricingPackages(): PricingPackage[] {
  return PRICING_PACKAGES.filter((pkg) => pkg.active).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
}
