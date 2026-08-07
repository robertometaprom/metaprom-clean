import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getPricingPackageById,
  type PricingCategory,
  type PricingPackage,
} from "@/lib/pricing";

import type { EntitlementKind, GrantPackageResult } from "./types";

export function entitlementKindForCategory(
  category: PricingCategory,
): EntitlementKind {
  return category === "commercials" ? "commercial" : "advertising_asset";
}

export function resolvePackageForProductId(
  productId: string,
): PricingPackage | null {
  return getPricingPackageById(productId) ?? null;
}

/**
 * Grant catalog package quantity exactly once per completed purchase.
 * Idempotent under webhook retries via entitlement_ledger unique grant index.
 */
export async function grantPackageEntitlementFromPurchase(
  supabase: SupabaseClient,
  input: {
    userId: string;
    purchaseId: string | number;
    productId: string;
    metadata?: Record<string, unknown>;
  },
): Promise<GrantPackageResult | null> {
  const pkg = resolvePackageForProductId(input.productId);

  if (!pkg) {
    return null;
  }

  const kind = entitlementKindForCategory(pkg.category);
  const purchaseId =
    typeof input.purchaseId === "string"
      ? Number(input.purchaseId)
      : input.purchaseId;

  if (!Number.isFinite(purchaseId)) {
    throw new Error(`Invalid purchase id for entitlement grant: ${input.purchaseId}`);
  }

  const { data, error } = await supabase.rpc("grant_package_entitlement", {
    p_user_id: input.userId,
    p_purchase_id: purchaseId,
    p_product_id: pkg.id,
    p_entitlement_kind: kind,
    p_quantity: pkg.quantity,
    p_metadata: {
      packageName: pkg.name,
      category: pkg.category,
      ...input.metadata,
    },
  });

  if (error) {
    throw new Error(
      `Failed to grant package entitlement for purchase ${purchaseId}: ${error.message}`,
    );
  }

  return {
    granted: Boolean(data),
    kind,
    quantity: pkg.quantity,
    productId: pkg.id,
    purchaseId,
  };
}
