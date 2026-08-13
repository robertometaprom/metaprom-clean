import { ADVERTISING_ASSET_FULFILLMENT_OPERATIONAL } from "@/lib/entitlements/flags";

import type { PricingPackage } from "./catalog";

/**
 * Legacy studio SKU env — must NEVER be used for V1 package catalog checkout.
 * Connecting a V1 package to this price would charge the wrong amount.
 */
export const LEGACY_STUDIO_STRIPE_PRICE_ENV = "STRIPE_PRICE_ID_COMMERCIAL_VIDEO";

/**
 * Package checkout path is wired. Purchasability still requires a real
 * Stripe Price ID in the package's dedicated env var for the active mode.
 */
export const PACKAGE_CHECKOUT_ENABLED = true;

export type PackagePurchasability = {
  packageId: PricingPackage["id"];
  active: boolean;
  hasStripePriceId: boolean;
  stripePriceIdValid: boolean;
  /** True only when the package may start a real checkout charge. */
  purchasable: boolean;
  /** CTA label key resolved by the UI from catalog copy. */
  ctaState: "purchase" | "activate_payments" | "coming_soon";
};

function readStripePriceIdFromEnv(envName: string): string | null {
  if (envName === LEGACY_STUDIO_STRIPE_PRICE_ENV) {
    return null;
  }

  const value = process.env[envName]?.trim();
  return value && value.length > 0 ? value : null;
}

function isValidStripePriceId(priceId: string): boolean {
  return priceId.startsWith("price_");
}

/**
 * Advertising Image packages are sellable only when first-persist consume is live.
 * Flag lives in entitlements/flags (no circular import via entitlements/index).
 */
function isAdvertisingAssetSellable(pkg: PricingPackage): boolean {
  if (pkg.category !== "assets") return true;
  return ADVERTISING_ASSET_FULFILLMENT_OPERATIONAL;
}

/**
 * Server-side purchasability for a catalog package.
 * Never invents Price IDs. Never falls back to the legacy commercial-video price.
 */
export function getPackagePurchasability(
  pkg: PricingPackage,
): PackagePurchasability {
  const advertisingSellable = isAdvertisingAssetSellable(pkg);
  const rawPriceId = advertisingSellable
    ? readStripePriceIdFromEnv(pkg.stripeEnvironmentVariable)
    : null;
  const hasStripePriceId = rawPriceId !== null;
  const stripePriceIdValid = hasStripePriceId
    ? isValidStripePriceId(rawPriceId)
    : false;

  const purchasable =
    PACKAGE_CHECKOUT_ENABLED &&
    pkg.active &&
    advertisingSellable &&
    hasStripePriceId &&
    stripePriceIdValid;

  let ctaState: PackagePurchasability["ctaState"] = "activate_payments";

  if (purchasable) {
    ctaState = "purchase";
  } else if (!pkg.active || !advertisingSellable) {
    // Inactive catalog packages + Advertising Assets (fulfillment off) → Próximamente.
    ctaState = "coming_soon";
  } else {
    // Missing/invalid Price ID → Próximamente (ctaUnavailable).
    ctaState = "activate_payments";
  }

  return {
    packageId: pkg.id,
    active: pkg.active,
    hasStripePriceId,
    stripePriceIdValid,
    purchasable,
    ctaState,
  };
}

export function getAllPackagePurchasability(
  packages: readonly PricingPackage[],
): Record<string, PackagePurchasability> {
  return Object.fromEntries(
    packages.map((pkg) => [pkg.id, getPackagePurchasability(pkg)]),
  );
}
