import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";

import { InsufficientEntitlementError } from "./consume";

async function markAssetPaid(
  supabase: SupabaseClient,
  assetId: number,
): Promise<void> {
  const { error } = await supabase
    .from("assets")
    .update({ payment_status: "paid" })
    .eq("id", assetId);

  if (error) {
    throw new Error(
      `Failed to mark commercial asset ${assetId} as paid: ${error.message}`,
    );
  }
}

export type ConsumeCommercialResult = {
  /** True when a new ledger consume was applied. */
  consumed: boolean;
  /** True when this asset_id was already authorized (idempotent retry). */
  alreadyConsumed: boolean;
  assetId: number;
};

function toAssetId(assetId: string | number): number {
  const parsed =
    typeof assetId === "string" ? Number(assetId) : assetId;

  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid asset id for commercial consume: ${assetId}`);
  }

  return parsed;
}

/**
 * Verify the commercial asset belongs to the user.
 * Returns current payment_status for short-circuit when already paid.
 */
async function assertOwnedCommercialAsset(
  supabase: SupabaseClient,
  userId: string,
  assetId: number,
): Promise<{ paymentStatus: string | null }> {
  const { data: asset, error: assetError } = await supabase
    .from("assets")
    .select("id, project_id, payment_status")
    .eq("id", assetId)
    .maybeSingle();

  if (assetError || !asset) {
    throw new Error(
      `Commercial asset ${assetId} not found for entitlement consume.`,
    );
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", asset.project_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (projectError || !project) {
    throw new Error(
      `Commercial asset ${assetId} is not owned by user ${userId}.`,
    );
  }

  return {
    paymentStatus:
      typeof asset.payment_status === "string" ? asset.payment_status : null,
  };
}

/**
 * Safe, idempotent consume for prepaid Premium Commercial unlock:
 * spend exactly 1 commercial entitlement for the current asset, then mark paid.
 *
 * - service_role RPC only
 * - one debit per asset_id (unique ledger index)
 * - ownership check before debit
 * - already-paid assets do not consume again
 */
export async function consumeCommercialForAsset(
  input: {
    userId: string;
    assetId: string | number;
    metadata?: Record<string, unknown>;
    /** Optional admin client; created when omitted. */
    admin?: SupabaseClient;
  },
): Promise<ConsumeCommercialResult> {
  const assetId = toAssetId(input.assetId);
  const admin = input.admin ?? createAdminClient();

  const { paymentStatus } = await assertOwnedCommercialAsset(
    admin,
    input.userId,
    assetId,
  );

  // Already unlocked via Stripe or a prior prepaid spend — do not debit again.
  if (paymentStatus === "paid") {
    return {
      consumed: false,
      alreadyConsumed: true,
      assetId,
    };
  }

  const { data, error } = await admin.rpc("consume_commercial_for_asset", {
    p_user_id: input.userId,
    p_asset_id: assetId,
    p_metadata: {
      reason: "prepaid_balance_premium_commercial",
      ...input.metadata,
    },
  });

  if (error) {
    if (
      error.message.toLowerCase().includes("insufficient") ||
      error.code === "P0001"
    ) {
      throw new InsufficientEntitlementError("commercial");
    }

    throw new Error(
      `Failed to consume commercial entitlement for asset ${assetId}: ${error.message}`,
    );
  }

  const consumed = Boolean(data);

  // Converge with Stripe fulfillment: premium-video requires payment_status=paid.
  await markAssetPaid(admin, assetId);

  return {
    consumed,
    alreadyConsumed: !consumed,
    assetId,
  };
}
