import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getPackagePurchasability,
  getPricingPackageById,
  type PricingPackage,
  type PricingPackageId,
} from "@/lib/pricing";

import { grantPackageEntitlementFromPurchase } from "@/lib/entitlements";
import { ADVERTISING_ASSET_FULFILLMENT_OPERATIONAL } from "@/lib/entitlements/flags";

import { getPaymentProvider } from "./index";
import { updateAssetPaymentState } from "./persistence";
import type {
  CheckoutSession,
  PaymentMethod,
  PaymentProviderId,
} from "./types";
import { PaymentProviderError } from "./types";
import { assertStripePackagePriceMatchesCatalog } from "./validate-stripe-price";

export type CreateCheckoutSessionInput = {
  productKey: string;
  userId: string;
  customerEmail?: string;
  /**
   * Optional current project asset. When present for a commercial package,
   * one entitlement may be consumed after payment for that project only.
   */
  assetId?: string | null;
  /**
   * Preferred method hint. Package checkouts default to card + OXXO in Stripe.
   */
  paymentMethod?: PaymentMethod;
};

export type CreateCheckoutSessionResult = {
  productKey: PricingPackageId;
  package: PricingPackage;
  amountMxn: number;
  currency: "MXN";
  quantity: number;
  category: PricingPackage["category"];
  entitlementKind: "commercial" | "advertising_asset";
  provider: PaymentProviderId;
  session: CheckoutSession;
  purchaseId: number | string;
  assetId: string | null;
};

function isPricingPackageId(value: string): value is PricingPackageId {
  return getPricingPackageById(value) != null;
}

/**
 * ONE reusable package checkout entry point.
 * Browser sends only the stable product key; server resolves catalog + Stripe Price.
 */
export async function createCheckoutSession(
  supabase: SupabaseClient,
  input: CreateCheckoutSessionInput,
): Promise<CreateCheckoutSessionResult> {
  const productKey = input.productKey.trim();

  if (!isPricingPackageId(productKey)) {
    throw new PaymentProviderError(`Invalid product key: ${productKey}`);
  }

  const pkg = getPricingPackageById(productKey);

  if (!pkg || !pkg.active) {
    throw new PaymentProviderError(`Package is not available: ${productKey}`);
  }

  // Advertising Image packages require the first-persist consume path.
  if (
    pkg.category === "assets" &&
    !ADVERTISING_ASSET_FULFILLMENT_OPERATIONAL
  ) {
    throw new PaymentProviderError(
      `Advertising Image package "${productKey}" is not available yet (Próximamente).`,
    );
  }

  const purchasability = getPackagePurchasability(pkg);
  if (!purchasability.purchasable) {
    throw new PaymentProviderError(
      `Package is not purchasable: ${productKey}. Configure a matching Stripe Test Price or wait until the package is active.`,
    );
  }

  const assetId =
    typeof input.assetId === "string" && input.assetId.trim()
      ? input.assetId.trim()
      : null;

  const paymentMethod = input.paymentMethod ?? "card";
  const provider = getPaymentProvider();

  // Hard gate: never open Checkout when Stripe amount ≠ catalog amount.
  if (provider.id === "stripe") {
    await assertStripePackagePriceMatchesCatalog(pkg);
  }

  // Studio HD unlock binds an asset → return to /studio for fulfillment UX.
  // Catalog purchases from /planes keep the package confirmation page.
  const successPath = assetId ? "/studio" : "/planes/compra";
  const cancelPath = assetId ? "/studio" : "/planes";

  const session = await provider.createCheckout({
    assetId: assetId ?? undefined,
    productId: pkg.id,
    amountMxn: pkg.displayPrice,
    currency: pkg.currency,
    paymentMethod,
    // Package checkouts always offer card + OXXO for MXN one-time prices.
    paymentMethodTypes: ["card", "oxxo"],
    customerEmail: input.customerEmail,
    userId: input.userId,
    successPath,
    cancelPath,
    metadata: {
      packageId: pkg.id,
      packageName: pkg.name,
      category: pkg.category,
      quantity: String(pkg.quantity),
      entitlementKind:
        pkg.category === "commercials" ? "commercial" : "advertising_asset",
      checkoutKind: "package",
    },
  });

  const purchaseInsert = {
    user_id: input.userId,
    asset_id: assetId,
    product_id: pkg.id,
    amount_mxn: pkg.displayPrice,
    currency: "MXN",
    status: session.status,
    provider: provider.id,
    provider_reference: session.sessionId,
    payment_method: paymentMethod,
    metadata: {
      providerPurchaseId: session.purchaseId,
      sessionId: session.sessionId,
      oxxoReference: session.oxxoReference,
      packageId: pkg.id,
      packageName: pkg.name,
      category: pkg.category,
      quantity: pkg.quantity,
      entitlementKind:
        pkg.category === "commercials" ? "commercial" : "advertising_asset",
      checkoutKind: "package",
      consumeCurrentProject: Boolean(assetId),
    },
    completed_at:
      session.status === "completed" ? new Date().toISOString() : null,
  };

  const { data: purchase, error: purchaseError } = await supabase
    .from("purchases")
    .insert(purchaseInsert)
    .select("id, status")
    .single();

  if (purchaseError || !purchase) {
    throw new PaymentProviderError(
      `Purchase insert failed: ${purchaseError?.message ?? "unknown error"}`,
    );
  }

  if (assetId) {
    await updateAssetPaymentState(supabase, assetId, session.status, {
      purchaseId: purchase.id,
    });
  }

  // Mock/instant card completion grants immediately; Stripe path grants via webhook.
  if (session.status === "completed") {
    await grantPackageEntitlementFromPurchase(supabase, {
      userId: input.userId,
      purchaseId: purchase.id,
      productId: pkg.id,
      metadata: { instantCompletion: true },
    });
  }

  return {
    productKey: pkg.id,
    package: pkg,
    amountMxn: pkg.displayPrice,
    currency: "MXN",
    quantity: pkg.quantity,
    category: pkg.category,
    entitlementKind:
      pkg.category === "commercials" ? "commercial" : "advertising_asset",
    provider: provider.id,
    session,
    purchaseId: purchase.id,
    assetId,
  };
}
