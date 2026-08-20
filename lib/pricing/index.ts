/**
 * Public pricing module.
 *
 * - V1 package catalog: ./catalog
 * - Studio legacy SKUs: ./studio-prices (unchanged checkout amounts)
 * - Package purchasability: ./purchasability (never uses legacy Stripe price)
 */

export {
  ASSET_FORMAT_EXAMPLES_LIST,
  ASSET_PRODUCT_NAME,
  PRICING_BADGES,
  PRICING_CATEGORIES,
  PRICING_CURRENCY,
  PRICING_FAQ,
  PRICING_FAQ_BY_LOCALE,
  PRICING_PACKAGES,
  PRICING_PAGE_COPY,
  getPricingFaq,
  type AssetsPackageId,
  type CommercialPackageId,
  type PricingBadge,
  type PricingBadgeId,
  type PricingCategory,
  type PricingCategoryMeta,
  type PricingCurrency,
  type PricingFaqItem,
  type PricingPackage,
  type PricingPackageId,
  type PricingPackageKind,
} from "./catalog";

export { formatPriceMxn } from "./format";

export {
  getAllPackagePurchasability,
  getPackagePurchasability,
  LEGACY_STUDIO_STRIPE_PRICE_ENV,
  PACKAGE_CHECKOUT_ENABLED,
  type PackagePurchasability,
} from "./purchasability";

export {
  getActivePricingCategories,
  getPackagesByCategory,
  getPricingPackageById,
  listActivePricingPackages,
} from "./selectors";

export {
  HERO_PRICE_PRODUCT_ID,
  PRICING_ENTRIES,
  getPriceById,
  type PricingEntry,
} from "./studio-prices";
