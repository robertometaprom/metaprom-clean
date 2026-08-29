/**
 * Recurring membership catalog — separate from V1 one-off packages.
 *
 * Selector mapping is locale-independent:
 *   golden + monthly → golden_monthly
 *   golden + annual  → golden_annual
 *   premium + monthly → premium_monthly
 *   premium + annual  → premium_annual
 *
 * Never reuse one-off Stripe Price IDs. Never invent price_* values.
 */
import type { PlanesBillingCycle, PlanesMembershipId } from "./planes-offer";

export type MembershipTier = PlanesMembershipId;
export type MembershipBillingCycle = PlanesBillingCycle;

export type MembershipProductId =
  | "golden_monthly"
  | "golden_annual"
  | "premium_monthly"
  | "premium_annual";

export type MembershipProduct = {
  id: MembershipProductId;
  tier: MembershipTier;
  billingCycle: MembershipBillingCycle;
  name: string;
  displayPrice: number;
  commercials: number;
  interval: "month" | "year";
  stripeEnvironmentVariable: string;
  currency: "MXN";
};

export const MEMBERSHIP_PRODUCTS: readonly MembershipProduct[] = [
  {
    id: "golden_monthly",
    tier: "golden",
    billingCycle: "monthly",
    name: "Golden Monthly",
    displayPrice: 350,
    commercials: 8,
    interval: "month",
    stripeEnvironmentVariable: "STRIPE_PRICE_ID_GOLDEN_MONTHLY",
    currency: "MXN",
  },
  {
    id: "golden_annual",
    tier: "golden",
    billingCycle: "annual",
    name: "Golden Annual",
    displayPrice: 2990,
    commercials: 100,
    interval: "year",
    stripeEnvironmentVariable: "STRIPE_PRICE_ID_GOLDEN_ANNUAL",
    currency: "MXN",
  },
  {
    id: "premium_monthly",
    tier: "premium",
    billingCycle: "monthly",
    name: "Premium Monthly",
    displayPrice: 600,
    commercials: 15,
    interval: "month",
    stripeEnvironmentVariable: "STRIPE_PRICE_ID_PREMIUM_MONTHLY",
    currency: "MXN",
  },
  {
    id: "premium_annual",
    tier: "premium",
    billingCycle: "annual",
    name: "Premium Annual",
    displayPrice: 4990,
    commercials: 200,
    interval: "year",
    stripeEnvironmentVariable: "STRIPE_PRICE_ID_PREMIUM_ANNUAL",
    currency: "MXN",
  },
] as const;

export const MEMBERSHIP_STRIPE_PRICE_ENV_BY_PRODUCT: Record<
  MembershipProductId,
  string
> = Object.fromEntries(
  MEMBERSHIP_PRODUCTS.map((product) => [
    product.id,
    product.stripeEnvironmentVariable,
  ]),
) as Record<MembershipProductId, string>;

const MEMBERSHIP_BY_ID = new Map(
  MEMBERSHIP_PRODUCTS.map((product) => [product.id, product]),
);

export function isMembershipProductId(
  value: string,
): value is MembershipProductId {
  return MEMBERSHIP_BY_ID.has(value as MembershipProductId);
}

export function getMembershipProductById(
  id: string,
): MembershipProduct | undefined {
  return MEMBERSHIP_BY_ID.get(id as MembershipProductId);
}

export function getMembershipProductForSelector(
  tier: MembershipTier,
  cycle: MembershipBillingCycle,
): MembershipProduct {
  const product = MEMBERSHIP_PRODUCTS.find(
    (item) => item.tier === tier && item.billingCycle === cycle,
  );

  if (!product) {
    throw new Error(`No membership product for ${tier} + ${cycle}.`);
  }

  return product;
}

export function membershipAmountMinorUnits(product: MembershipProduct): number {
  return Math.round(product.displayPrice * 100);
}

function readMembershipPriceIdFromEnv(envName: string): string | null {
  const value = process.env[envName]?.trim();
  return value && value.length > 0 ? value : null;
}

export function resolveMembershipByStripePriceId(
  priceId: string,
): MembershipProduct | null {
  const normalized = priceId.trim();
  if (!normalized.startsWith("price_")) return null;

  for (const product of MEMBERSHIP_PRODUCTS) {
    const configured = readMembershipPriceIdFromEnv(
      product.stripeEnvironmentVariable,
    );
    if (configured && configured === normalized) {
      return product;
    }
  }

  return null;
}

export type MembershipPurchasability = {
  productId: MembershipProductId;
  hasStripePriceId: boolean;
  stripePriceIdValid: boolean;
  purchasable: boolean;
};

export function getMembershipPurchasability(
  product: MembershipProduct,
): MembershipPurchasability {
  const rawPriceId = readMembershipPriceIdFromEnv(
    product.stripeEnvironmentVariable,
  );
  const hasStripePriceId = rawPriceId !== null;
  const stripePriceIdValid = hasStripePriceId
    ? rawPriceId.startsWith("price_")
    : false;

  return {
    productId: product.id,
    hasStripePriceId,
    stripePriceIdValid,
    purchasable: hasStripePriceId && stripePriceIdValid,
  };
}

export function getAllMembershipPurchasability(): Record<
  MembershipProductId,
  MembershipPurchasability
> {
  return Object.fromEntries(
    MEMBERSHIP_PRODUCTS.map((product) => [
      product.id,
      getMembershipPurchasability(product),
    ]),
  ) as Record<MembershipProductId, MembershipPurchasability>;
}
