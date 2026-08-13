import { PRICING_PACKAGES } from "@/lib/pricing/catalog";

import { PaymentProviderError } from "./types";

/** Stable package keys → env var names from the canonical catalog. */
export const PACKAGE_STRIPE_PRICE_ENV_BY_PRODUCT: Record<string, string> =
  Object.fromEntries(
    PRICING_PACKAGES.map((pkg) => [pkg.id, pkg.stripeEnvironmentVariable]),
  );

/** Env var that holds the Stripe Price ID for a product key in the active mode. */
export const STRIPE_PRICE_ENV_BY_PRODUCT: Record<string, string> = {
  ...PACKAGE_STRIPE_PRICE_ENV_BY_PRODUCT,
};

export function assertStripeSecretKey(secretKey: string): void {
  if (!secretKey.startsWith("sk_test_") && !secretKey.startsWith("sk_live_")) {
    throw new PaymentProviderError(
      "STRIPE_SECRET_KEY must start with sk_test_ or sk_live_.",
    );
  }
}

export function getStripeSecretKey(): string {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new PaymentProviderError(
      "Stripe is not configured. Set STRIPE_SECRET_KEY and PAYMENT_PROVIDER=stripe.",
    );
  }

  assertStripeSecretKey(secretKey);
  return secretKey;
}

export function isStripeLiveMode(): boolean {
  return getStripeSecretKey().startsWith("sk_live_");
}

/**
 * Resolve the Stripe Price ID for a Metaprom product in the active mode.
 * Does not invent IDs — requires a real price_* value from the Stripe Dashboard.
 */
export function getStripePriceId(productId: string): string {
  const envName = STRIPE_PRICE_ENV_BY_PRODUCT[productId];

  if (!envName) {
    throw new PaymentProviderError(
      `No Stripe Price mapping for product "${productId}".`,
    );
  }

  const priceId = process.env[envName]?.trim();

  if (!priceId) {
    throw new PaymentProviderError(
      `Missing ${envName}. Create a one-time Price in the active Stripe mode for this product, then set ${envName}=price_...`,
    );
  }

  if (priceId.startsWith("price_")) {
    return priceId;
  }

  throw new PaymentProviderError(
    `${envName} must be a Stripe Price ID starting with price_ (got a non-price value).`,
  );
}

export function getStripeWebhookSecret(): string {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!webhookSecret) {
    throw new PaymentProviderError(
      "Missing STRIPE_WEBHOOK_SECRET. Add a webhook endpoint in the active Stripe mode and set its signing secret (whsec_...).",
    );
  }

  if (!webhookSecret.startsWith("whsec_")) {
    throw new PaymentProviderError(
      "STRIPE_WEBHOOK_SECRET must be a Stripe signing secret starting with whsec_.",
    );
  }

  return webhookSecret;
}
