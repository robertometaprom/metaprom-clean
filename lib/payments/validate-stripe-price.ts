import "server-only";

import Stripe from "stripe";

import type { PricingPackage } from "@/lib/pricing";

import { getStripeTestPriceId, getStripeTestSecretKey } from "./stripe-config";
import { PaymentProviderError } from "./types";

/** Catalog displayPrice (major MXN) → Stripe unit_amount (centavos). */
export function packageAmountMinorUnits(pkg: PricingPackage): number {
  return Math.round(pkg.displayPrice * 100);
}

/**
 * Validate a catalog package's configured Stripe Test Price before Checkout.
 * Never create a session when amount/currency/mode do not match the catalog.
 */
export async function assertStripePackagePriceMatchesCatalog(
  pkg: PricingPackage,
): Promise<{ priceId: string; unitAmount: number }> {
  const priceId = getStripeTestPriceId(pkg.id);
  const expectedAmount = packageAmountMinorUnits(pkg);
  const stripe = new Stripe(getStripeTestSecretKey());

  let price: Stripe.Price;

  try {
    price = await stripe.prices.retrieve(priceId);
  } catch {
    throw new PaymentProviderError(
      `Stripe Price ${priceId} for ${pkg.id} could not be retrieved. Verify ${pkg.stripeEnvironmentVariable} in Test Mode.`,
    );
  }

  if (price.livemode) {
    throw new PaymentProviderError(
      `Stripe Price ${priceId} is Live Mode. V1 checkout requires Test Mode prices only.`,
    );
  }

  if (!price.active) {
    throw new PaymentProviderError(
      `Stripe Price ${priceId} for ${pkg.id} is inactive.`,
    );
  }

  if (price.type !== "one_time") {
    throw new PaymentProviderError(
      `Stripe Price ${priceId} for ${pkg.id} must be one-time (got ${price.type}).`,
    );
  }

  if (price.currency !== "mxn") {
    throw new PaymentProviderError(
      `Stripe Price ${priceId} for ${pkg.id} must use MXN (got ${price.currency}).`,
    );
  }

  if (price.unit_amount == null) {
    throw new PaymentProviderError(
      `Stripe Price ${priceId} for ${pkg.id} is missing unit_amount.`,
    );
  }

  if (price.unit_amount !== expectedAmount) {
    throw new PaymentProviderError(
      `Stripe Price ${priceId} amount mismatch for ${pkg.id}: catalog expects ${expectedAmount} centavos (MXN $${pkg.displayPrice}), Stripe has ${price.unit_amount}. Checkout blocked.`,
    );
  }

  return { priceId, unitAmount: price.unit_amount };
}
