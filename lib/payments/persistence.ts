import type { SupabaseClient } from "@supabase/supabase-js";

import { grantPackageEntitlementFromPurchase } from "@/lib/entitlements";
import { consumeCommercialForAsset } from "@/lib/entitlements/consume-commercial";
import type { PricingPackage } from "@/lib/pricing";
import { recordPremiumActivated, recordPurchaseCompleted } from "@/lib/analytics/record";

import {
  isCommercialWorkflowAsset,
  loadOwnedAssetById,
  resolveTrustedGrantPackage,
  shouldFulfillPremiumForProduct,
} from "./purchase-integrity";
import type {
  PaymentProviderId,
  PaymentSessionStatus,
  PaymentWebhookResult,
} from "./types";

type PurchaseRecord = {
  id: number | string;
  user_id: string;
  asset_id: string | number | null;
  product_id: string;
  status: PaymentSessionStatus;
  metadata?: Record<string, unknown>;
};

function toRecordMetadata(
  metadata: PurchaseRecord["metadata"],
): Record<string, unknown> {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata;
  }

  return {};
}

function toAssetPaymentStatus(status: PaymentSessionStatus): "none" | "pending" | "paid" {
  if (status === "completed") return "paid";
  if (status === "pending" || status === "awaiting_payment") return "pending";
  return "none";
}

function boundAssetId(purchase: PurchaseRecord): string | null {
  if (purchase.asset_id == null || purchase.asset_id === "") return null;
  return String(purchase.asset_id);
}

function reconcilePurchaseAgainstStripeSnapshot(
  purchase: PurchaseRecord,
  result: PaymentWebhookResult,
): PurchaseRecord {
  if (result.stripeUserId && result.stripeUserId !== purchase.user_id) {
    throw new Error(
      `Purchase ${purchase.id} user_id does not match the Stripe Checkout Session.`,
    );
  }

  const snapshotPresent = result.stripeAssetId != null;
  if (snapshotPresent) {
    const snapshotAssetId = result.stripeAssetId?.trim() || "";
    const dbAssetId = boundAssetId(purchase) ?? "";
    if (snapshotAssetId !== dbAssetId) {
      console.error(
        "[payments] Refusing bound-asset fulfillment: purchase.asset_id disagrees with Stripe session snapshot",
        {
          purchaseId: purchase.id,
          purchaseAssetId: dbAssetId,
          stripeAssetId: snapshotAssetId || null,
        },
      );
    }
    return { ...purchase, asset_id: snapshotAssetId || null };
  }

  return purchase;
}

async function assetHasCompletedPurchase(
  supabase: SupabaseClient,
  assetId: string,
  excludedPurchaseId: number | string,
): Promise<boolean> {
  const { data } = await supabase
    .from("purchases")
    .select("id")
    .eq("asset_id", assetId)
    .eq("status", "completed")
    .neq("id", excludedPurchaseId)
    .limit(1);

  return Boolean(data?.length);
}

export async function findPurchaseByProviderSession(
  supabase: SupabaseClient,
  providerId: PaymentProviderId,
  sessionId: string,
): Promise<PurchaseRecord | null> {
  const { data } = await supabase
    .from("purchases")
    .select("id, user_id, asset_id, product_id, status, metadata")
    .eq("provider", providerId)
    .eq("provider_reference", sessionId)
    .maybeSingle<PurchaseRecord>();

  return data ?? null;
}

export async function updateAssetPaymentState(
  supabase: SupabaseClient,
  assetId: string,
  status: PaymentSessionStatus,
  options?: { purchaseId?: number | string },
): Promise<void> {
  let nextStatus = toAssetPaymentStatus(status);

  if (
    nextStatus === "none" &&
    options?.purchaseId &&
    (await assetHasCompletedPurchase(supabase, assetId, options.purchaseId))
  ) {
    nextStatus = "paid";
  }

  const { error } = await supabase
    .from("assets")
    .update({ payment_status: nextStatus })
    .eq("id", assetId);

  if (error) {
    throw new Error(
      `Failed to update asset payment status for ${assetId}: ${error.message}`,
    );
  }
}

function resolveGrantPackageOrThrow(
  purchase: PurchaseRecord,
  result: PaymentWebhookResult,
  providerId: PaymentProviderId,
): PricingPackage | null {
  const stripePriceId = result.stripePriceId?.trim() || null;

  if (providerId === "stripe" && result.status === "completed") {
    if (!stripePriceId) {
      throw new Error(
        `Stripe completed session ${result.sessionId} is missing a catalog Price ID.`,
      );
    }

    const pkg = resolveTrustedGrantPackage({
      productId: purchase.product_id,
      stripePriceId,
    });

    if (!pkg) {
      throw new Error(
        `Stripe Price ${stripePriceId} does not map to a Metaprom catalog package.`,
      );
    }

    if (pkg.id !== purchase.product_id) {
      console.error(
        "[payments] purchase.product_id disagrees with charged Stripe Price; granting catalog package for Price",
        {
          purchaseId: purchase.id,
          productId: purchase.product_id,
          stripePackageId: pkg.id,
          stripePriceId,
        },
      );
    }

    return pkg;
  }

  return resolveTrustedGrantPackage({
    productId: purchase.product_id,
    stripePriceId,
  });
}

async function syncPurchaseProductIfNeeded(
  supabase: SupabaseClient,
  purchase: PurchaseRecord,
  pkg: PricingPackage,
): Promise<PurchaseRecord> {
  if (purchase.product_id === pkg.id) {
    return purchase;
  }

  const metadata = {
    ...toRecordMetadata(purchase.metadata),
    packageId: pkg.id,
    packageName: pkg.name,
    category: pkg.category,
    quantity: pkg.quantity,
    entitlementKind:
      pkg.category === "commercials" ? "commercial" : "advertising_asset",
    productIdCorrectedFrom: purchase.product_id,
  };

  const { error } = await supabase
    .from("purchases")
    .update({
      product_id: pkg.id,
      amount_mxn: pkg.displayPrice,
      metadata,
    })
    .eq("id", purchase.id);

  if (error) {
    throw new Error(
      `Failed to correct purchase ${purchase.id} product_id: ${error.message}`,
    );
  }

  return {
    ...purchase,
    product_id: pkg.id,
    metadata,
  };
}

async function maybeUpdateBoundCommercialAsset(
  supabase: SupabaseClient,
  purchase: PurchaseRecord,
  status: PaymentSessionStatus,
): Promise<string | null> {
  const assetId = boundAssetId(purchase);
  if (!assetId) return null;
  if (!shouldFulfillPremiumForProduct(purchase.product_id)) {
    return null;
  }

  const owned = await loadOwnedAssetById(supabase, purchase.user_id, assetId);
  if (!owned) {
    console.error(
      "[payments] Refusing asset payment update: purchase user does not own bound asset",
      { purchaseId: purchase.id, assetId, userId: purchase.user_id },
    );
    return null;
  }

  if (!isCommercialWorkflowAsset(owned)) {
    console.error(
      "[payments] Refusing asset payment update: bound asset is not a Commercial preview",
      { purchaseId: purchase.id, assetId },
    );
    return null;
  }

  await updateAssetPaymentState(supabase, assetId, status, {
    purchaseId: purchase.id,
  });

  return assetId;
}

async function fulfillPackageEntitlements(
  supabase: SupabaseClient,
  purchase: PurchaseRecord,
  pkg: PricingPackage | null,
): Promise<void> {
  if (!pkg) {
    return;
  }

  const grant = await grantPackageEntitlementFromPurchase(supabase, {
    userId: purchase.user_id,
    purchaseId: purchase.id,
    productId: pkg.id,
    metadata: {
      sessionFulfillment: true,
    },
  });

  if (grant) {
    try {
      await recordPremiumActivated({
        userId: purchase.user_id,
        purchaseId: purchase.id,
        productId: pkg.id,
      });
    } catch (analyticsError) {
      console.error("premium_activated analytics failed:", analyticsError);
    }
  }

  const assetId = boundAssetId(purchase);

  // Consume is idempotent per asset. Retry even when grant.granted is false so
  // a prior grant + failed consume can still authorize the bound Commercial.
  if (!assetId || pkg.category !== "commercials" || !grant) {
    return;
  }

  const owned = await loadOwnedAssetById(supabase, purchase.user_id, assetId);
  if (!owned || !isCommercialWorkflowAsset(owned)) {
    return;
  }

  try {
    await consumeCommercialForAsset({
      userId: purchase.user_id,
      assetId,
      admin: supabase,
      metadata: {
        reason: "current_project_after_package_purchase",
        purchaseId: purchase.id,
      },
    });
  } catch (error) {
    console.error(
      "[payments] Failed to consume current-project commercial entitlement:",
      error,
    );
  }
}

export async function persistPaymentResult(
  supabase: SupabaseClient,
  providerId: PaymentProviderId,
  result: PaymentWebhookResult,
): Promise<PurchaseRecord | null> {
  let purchase = await findPurchaseByProviderSession(
    supabase,
    providerId,
    result.sessionId,
  );

  if (!purchase) return null;

  purchase = reconcilePurchaseAgainstStripeSnapshot(purchase, result);

  const pkg =
    result.status === "completed"
      ? resolveGrantPackageOrThrow(purchase, result, providerId)
      : null;

  if (pkg) {
    purchase = await syncPurchaseProductIfNeeded(supabase, purchase, pkg);
  }

  // Never downgrade a completed (paid) purchase on webhook retries / races.
  if (purchase.status === "completed") {
    if (result.status === "completed") {
      await fulfillPackageEntitlements(supabase, purchase, pkg);
      try {
        await recordPurchaseCompleted({
          userId: purchase.user_id,
          purchaseId: purchase.id,
          productId: purchase.product_id,
          amountMxn: pkg?.displayPrice,
          currency: pkg ? "MXN" : undefined,
          sessionId: result.sessionId,
        });
      } catch (analyticsError) {
        console.error("purchase_completed analytics failed:", analyticsError);
      }
    }
    return purchase;
  }

  const update: {
    status: PaymentSessionStatus;
    completed_at?: string | null;
    metadata?: Record<string, unknown>;
  } = {
    status: result.status,
  };

  if (
    result.providerReference &&
    result.providerReference !== result.sessionId
  ) {
    update.metadata = {
      ...toRecordMetadata(purchase.metadata),
      paymentIntentId: result.providerReference,
    };
  }

  if (result.status === "completed") {
    update.completed_at = new Date().toISOString();
  }

  if (result.status === "failed" || result.status === "cancelled") {
    update.completed_at = null;
  }

  const { error: purchaseError } = await supabase
    .from("purchases")
    .update(update)
    .eq("id", purchase.id);

  if (purchaseError) {
    throw new Error(
      `Failed to update purchase ${purchase.id}: ${purchaseError.message}`,
    );
  }

  const nextPurchase: PurchaseRecord = {
    ...purchase,
    status: result.status,
    metadata: update.metadata ?? purchase.metadata,
  };

  await maybeUpdateBoundCommercialAsset(supabase, nextPurchase, result.status);

  if (result.status === "completed") {
    await fulfillPackageEntitlements(supabase, nextPurchase, pkg);
    try {
      await recordPurchaseCompleted({
        userId: nextPurchase.user_id,
        purchaseId: nextPurchase.id,
        productId: nextPurchase.product_id,
        amountMxn: pkg?.displayPrice,
        currency: pkg ? "MXN" : undefined,
        sessionId: result.sessionId,
      });
    } catch (analyticsError) {
      console.error("purchase_completed analytics failed:", analyticsError);
    }
  }

  return nextPurchase;
}
