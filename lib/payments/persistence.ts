import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  PaymentProviderId,
  PaymentSessionStatus,
  PaymentWebhookResult,
} from "./types";

type PurchaseRecord = {
  id: number | string;
  asset_id: string;
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
    .select("id, asset_id, status, metadata")
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

  await supabase
    .from("assets")
    .update({ payment_status: nextStatus })
    .eq("id", assetId);
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

  await supabase.from("purchases").update(update).eq("id", purchase.id);

  await updateAssetPaymentState(supabase, purchase.asset_id, result.status, {
    purchaseId: purchase.id,
  });

  return {
    ...purchase,
    status: result.status,
    metadata: update.metadata ?? purchase.metadata,
  };
}
