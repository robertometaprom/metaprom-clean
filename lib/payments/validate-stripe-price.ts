import "server-only";

import Stripe from "stripe";

import type { MembershipProduct, PricingPackage } from "@/lib/pricing";
import { membershipAmountMinorUnits } from "@/lib/pricing/memberships";

import {
  getStripePriceId,
  getStripeSecretKey,
  isStripeLiveMode,
} from "./stripe-config";
import { PaymentProviderError } from "./types";

/** Catalog displayPrice (major MXN) → Stripe unit_amount (centavos). */
export function packageAmountMinorUnits(pkg: PricingPackage): number {
  return Math.round(pkg.displayPrice * 100);
}

/**
 * Validate a catalog package's configured Stripe Price before Checkout.
 * Never create a session when amount/currency/mode do not match the catalog.
 */
export async function assertStripePackagePriceMatchesCatalog(
  pkg: PricingPackage,
): Promise<{ priceId: string; unitAmount: number }> {
  const priceId = getStripePriceId(pkg.id);
  const expectedAmount = packageAmountMinorUnits(pkg);
  const stripe = new Stripe(getStripeSecretKey());

  let price: Stripe.Price;

  try {
    price = await stripe.prices.retrieve(priceId);
  } catch {
    throw new PaymentProviderError(
      `Stripe Price ${priceId} for ${pkg.id} could not be retrieved. Verify ${pkg.stripeEnvironmentVariable} in the active Stripe mode.`,
    );
  }

  if (price.livemode !== isStripeLiveMode()) {
    throw new PaymentProviderError(
      `Stripe Price ${priceId} does not belong to the active Stripe mode.`,
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

/**
 * Validate a membership's configured recurring Stripe Price before Checkout.
 * Never open a subscription session when amount/currency/interval do not match.
 */
export async function assertStripeMembershipPriceMatchesCatalog(
  product: MembershipProduct,
): Promise<{ priceId: string; unitAmount: number }> {
  const priceId = getStripePriceId(product.id);
  const expectedAmount = membershipAmountMinorUnits(product);
  const stripe = new Stripe(getStripeSecretKey());

  let price: Stripe.Price;

  try {
    price = await stripe.prices.retrieve(priceId);
  } catch {
    throw new PaymentProviderError(
      `Stripe Price ${priceId} for ${product.id} could not be retrieved. Verify ${product.stripeEnvironmentVariable} in the active Stripe mode.`,
    );
  }

  if (price.livemode !== isStripeLiveMode()) {
    throw new PaymentProviderError(
      `Stripe Price ${priceId} does not belong to the active Stripe mode.`,
    );
  }

  if (!price.active) {
    throw new PaymentProviderError(
      `Stripe Price ${priceId} for ${product.id} is inactive.`,
    );
  }

  if (price.type !== "recurring") {
    throw new PaymentProviderError(
      `Stripe Price ${priceId} for ${product.id} must be recurring (got ${price.type}).`,
    );
  }

  if (price.recurring?.interval !== product.interval) {
    throw new PaymentProviderError(
      `Stripe Price ${priceId} for ${product.id} must recur ${product.interval}ly (got ${price.recurring?.interval ?? "none"}).`,
    );
  }

  if (price.currency !== "mxn") {
    throw new PaymentProviderError(
      `Stripe Price ${priceId} for ${product.id} must use MXN (got ${price.currency}).`,
    );
  }

  if (price.unit_amount == null) {
    throw new PaymentProviderError(
      `Stripe Price ${priceId} for ${product.id} is missing unit_amount.`,
    );
  }

  if (price.unit_amount !== expectedAmount) {
    throw new PaymentProviderError(
      `Stripe Price ${priceId} amount mismatch for ${product.id}: catalog expects ${expectedAmount} centavos (MXN $${product.displayPrice}), Stripe has ${price.unit_amount}. Checkout blocked.`,
    );
  }

  return { priceId, unitAmount: price.unit_amount };
}
