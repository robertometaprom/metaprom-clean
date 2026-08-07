import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";

import { InsufficientEntitlementError } from "./consume";
import { ADVERTISING_ASSET_FULFILLMENT_OPERATIONAL } from "./flags";

export type ConsumeAdvertisingAssetResult = {
  /** True when a new ledger consume was applied. */
  consumed: boolean;
  /** True when this asset_id was already billed (idempotent retry). */
  alreadyConsumed: boolean;
  assetId: number;
};

function toAssetId(assetId: string | number): number {
  const parsed =
    typeof assetId === "string" ? Number(assetId) : assetId;

  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid asset id for advertising image consume: ${assetId}`);
  }

  return parsed;
}

/**
 * Verify the finished advertising image belongs to the user and has image_path.
 */
async function assertFinishedOwnedAsset(
  supabase: SupabaseClient,
  userId: string,
  assetId: number,
): Promise<void> {
  const { data: asset, error: assetError } = await supabase
    .from("assets")
    .select("id, project_id, image_path")
    .eq("id", assetId)
    .maybeSingle();

  if (assetError || !asset) {
    throw new Error(
      `Advertising image asset ${assetId} not found for entitlement consume.`,
    );
  }

  if (!asset.image_path) {
    throw new Error(
      `Advertising image asset ${assetId} is not finished (missing image_path).`,
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
      `Advertising image asset ${assetId} is not owned by user ${userId}.`,
    );
  }
}

/**
 * Safe, idempotent consume for the billable event:
 * first persistence of a new finished Imagen Publicitaria (asset with image_path).
 *
 * - service_role RPC only
 * - one debit per asset_id (unique ledger index)
 * - ownership + finished-image checks before debit
 */
export async function consumeAdvertisingAssetOnFirstPersist(
  input: {
    userId: string;
    assetId: string | number;
    metadata?: Record<string, unknown>;
    /** Optional admin client; created when omitted. */
    admin?: SupabaseClient;
  },
): Promise<ConsumeAdvertisingAssetResult | null> {
  if (!ADVERTISING_ASSET_FULFILLMENT_OPERATIONAL) {
    return null;
  }

  const assetId = toAssetId(input.assetId);
  const admin = input.admin ?? createAdminClient();

  await assertFinishedOwnedAsset(admin, input.userId, assetId);

  const { data, error } = await admin.rpc(
    "consume_advertising_asset_on_first_persist",
    {
      p_user_id: input.userId,
      p_asset_id: assetId,
      p_metadata: {
        reason: "first_persist_finished_advertising_image",
        ...input.metadata,
      },
    },
  );

  if (error) {
    if (
      error.message.toLowerCase().includes("insufficient") ||
      error.code === "P0001"
    ) {
      throw new InsufficientEntitlementError("advertising_asset");
    }

    throw new Error(
      `Failed to consume advertising image entitlement for asset ${assetId}: ${error.message}`,
    );
  }

  const consumed = Boolean(data);

  return {
    consumed,
    alreadyConsumed: !consumed,
    assetId,
  };
}

/**
 * Soft consume helper for non-gating call sites only.
 * Standalone Advertising Image first-persist must use
 * `consumeAdvertisingAssetOnFirstPersist` (hard) and revoke on insufficient.
 */
export async function tryConsumeAdvertisingAssetOnFirstPersist(
  input: {
    userId: string;
    assetId: string | number;
    metadata?: Record<string, unknown>;
    admin?: SupabaseClient;
  },
): Promise<ConsumeAdvertisingAssetResult | null> {
  try {
    return await consumeAdvertisingAssetOnFirstPersist(input);
  } catch (error) {
    if (error instanceof InsufficientEntitlementError) {
      console.warn(
        "[entitlements] Soft consume skipped: insufficient advertising image balance.",
        { userId: input.userId, assetId: input.assetId },
      );
      return null;
    }

    console.error(
      "[entitlements] Advertising image consume failed after first persist:",
      error,
    );
    return null;
  }
}
