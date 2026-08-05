import { PaymentProviderError } from "./types";

/** Env var that holds the Stripe Test Mode Price ID for commercial HD video. */
export const STRIPE_PRICE_ENV_BY_PRODUCT: Record<string, string> = {
  "commercial-video": "STRIPE_PRICE_ID_COMMERCIAL_VIDEO",
};

export function assertStripeTestSecretKey(secretKey: string): void {
  if (secretKey.startsWith("sk_live_")) {
    throw new PaymentProviderError(
      "Live Stripe keys are blocked. Use a Test Mode secret key (sk_test_...) only.",
    );
  }

  if (!secretKey.startsWith("sk_test_")) {
    throw new PaymentProviderError(
      "STRIPE_SECRET_KEY must be a Stripe Test Mode key starting with sk_test_.",
    );
  }
}

export function getStripeTestSecretKey(): string {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new PaymentProviderError(
      "Stripe is not configured. Set STRIPE_SECRET_KEY (sk_test_...) and PAYMENT_PROVIDER=stripe.",
    );
  }

  assertStripeTestSecretKey(secretKey);
  return secretKey;
}

/**
 * Resolve the Stripe Test Mode Price ID for a Metaprom product.
 * Does not invent IDs — requires a real price_* value from the Stripe Dashboard.
 */
export function getStripeTestPriceId(productId: string): string {
  const envName = STRIPE_PRICE_ENV_BY_PRODUCT[productId];

  if (!envName) {
    throw new PaymentProviderError(
      `No Stripe Test Price mapping for product "${productId}".`,
    );
  }

  const priceId = process.env[envName]?.trim();

  if (!priceId) {
    throw new PaymentProviderError(
      `Missing ${envName}. Create a one-time Price in Stripe Test Mode for this product, then set ${envName}=price_...`,
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
      "Missing STRIPE_WEBHOOK_SECRET. Add a Test Mode webhook endpoint in Stripe and set the signing secret (whsec_...).",
    );
  }

  if (!webhookSecret.startsWith("whsec_")) {
    throw new PaymentProviderError(
      "STRIPE_WEBHOOK_SECRET must be a Stripe signing secret starting with whsec_.",
    );
  }

  return webhookSecret;
}
