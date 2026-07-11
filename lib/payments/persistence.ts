import type { SupabaseClient } from "@supabase/supabase-js";

import type { PaymentSessionStatus, PaymentWebhookResult } from "./types";

type PurchaseRecord = {
  id: string;
  asset_id: string;
  status: PaymentSessionStatus;
};

function toAssetPaymentStatus(status: PaymentSessionStatus): "none" | "pending" | "paid" {
  if (status === "completed") return "paid";
  if (status === "pending" || status === "awaiting_payment") return "pending";
  return "none";
}

async function assetHasCompletedPurchase(
  supabase: SupabaseClient,
  assetId: string,
  excludedPurchaseId: string,
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

export async function updateAssetPaymentState(
  supabase: SupabaseClient,
  assetId: string,
  status: PaymentSessionStatus,
  options?: { purchaseId?: string },
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
  result: PaymentWebhookResult,
): Promise<PurchaseRecord | null> {
  const { data: purchase } = await supabase
    .from("purchases")
    .select("id, asset_id, status")
    .eq("id", result.purchaseId)
    .maybeSingle<PurchaseRecord>();

  if (!purchase) return null;

  const update: {
    status: PaymentSessionStatus;
    provider_reference?: string;
    completed_at?: string | null;
  } = {
    status: result.status,
  };

  if (result.providerReference) {
    update.provider_reference = result.providerReference;
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
  };
}
