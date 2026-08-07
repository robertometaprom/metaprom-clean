import type { SupabaseClient } from "@supabase/supabase-js";

import {
  consumeEntitlement,
  grantPackageEntitlementFromPurchase,
  resolvePackageForProductId,
} from "@/lib/entitlements";

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

async function fulfillPackageEntitlements(
  supabase: SupabaseClient,
  purchase: PurchaseRecord,
): Promise<void> {
  const pkg = resolvePackageForProductId(purchase.product_id);

  if (!pkg) {
    return;
  }

  const grant = await grantPackageEntitlementFromPurchase(supabase, {
    userId: purchase.user_id,
    purchaseId: purchase.id,
    productId: purchase.product_id,
    metadata: {
      sessionFulfillment: true,
    },
  });

  if (!grant) {
    return;
  }

  const metadata = toRecordMetadata(purchase.metadata);
  const assetId =
    purchase.asset_id == null || purchase.asset_id === ""
      ? null
      : String(purchase.asset_id);

  // Optional current-project consumption: one unit only, remaining balance kept.
  if (
    assetId &&
    pkg.category === "commercials" &&
    metadata.consumeCurrentProject === true
  ) {
    try {
      await consumeEntitlement(supabase, {
        userId: purchase.user_id,
        kind: "commercial",
        quantity: 1,
        assetId,
        productId: pkg.id,
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
}

export async function persistPaymentResult(
  supabase: SupabaseClient,
  providerId: PaymentProviderId,
  result: PaymentWebhookResult,
): Promise<PurchaseRecord | null> {
  const purchase = await findPurchaseByProviderSession(
    supabase,
    providerId,
    result.sessionId,
  );

  if (!purchase) return null;

  // Never downgrade a completed (paid) purchase on webhook retries / races.
  if (purchase.status === "completed") {
    if (result.status === "completed") {
      await fulfillPackageEntitlements(supabase, purchase);
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

  const assetId =
    purchase.asset_id == null || purchase.asset_id === ""
      ? null
      : String(purchase.asset_id);

  if (assetId) {
    await updateAssetPaymentState(supabase, assetId, result.status, {
      purchaseId: purchase.id,
    });
  }

  const nextPurchase: PurchaseRecord = {
    ...purchase,
    status: result.status,
    metadata: update.metadata ?? purchase.metadata,
  };

  if (result.status === "completed") {
    await fulfillPackageEntitlements(supabase, nextPurchase);
  }

  return nextPurchase;
}
