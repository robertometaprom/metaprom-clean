import type { SupabaseClient } from "@supabase/supabase-js";

import type { EntitlementKind } from "./types";

export class InsufficientEntitlementError extends Error {
  readonly kind: EntitlementKind;

  constructor(kind: EntitlementKind) {
    super(`Insufficient ${kind} entitlement balance.`);
    this.name = "InsufficientEntitlementError";
    this.kind = kind;
  }
}

/**
 * Atomically consume entitlement units for a user.
 * Prefer `consumeAdvertisingAssetOnFirstPersist` for Imágenes Publicitarias
 * (idempotent per finished asset_id).
 */
export async function consumeEntitlement(
  supabase: SupabaseClient,
  input: {
    userId: string;
    kind: EntitlementKind;
    quantity?: number;
    assetId?: string | number | null;
    productId?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<number> {
  const quantity = input.quantity ?? 1;
  const assetId =
    input.assetId == null || input.assetId === ""
      ? null
      : typeof input.assetId === "string"
        ? Number(input.assetId)
        : input.assetId;

  const { data, error } = await supabase.rpc("consume_entitlement", {
    p_user_id: input.userId,
    p_entitlement_kind: input.kind,
    p_quantity: quantity,
    p_asset_id: assetId != null && Number.isFinite(assetId) ? assetId : null,
    p_product_id: input.productId ?? null,
    p_metadata: input.metadata ?? {},
  });

  if (error) {
    if (
      error.message.toLowerCase().includes("insufficient") ||
      error.code === "P0001"
    ) {
      throw new InsufficientEntitlementError(input.kind);
    }

    throw new Error(`Failed to consume entitlement: ${error.message}`);
  }

  return typeof data === "number" ? data : Number(data);
}
