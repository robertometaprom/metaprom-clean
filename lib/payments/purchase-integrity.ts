import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getPricingPackageById,
  type PricingPackage,
  type PricingPackageId,
} from "@/lib/pricing";

import { PACKAGE_STRIPE_PRICE_ENV_BY_PRODUCT } from "./stripe-config";

/** Legacy Studio SKU — not in the V1 catalog; still a Commercial HD purchase. */
export const LEGACY_COMMERCIAL_PRODUCT_ID = "commercial-video";

export type OwnedAssetRecord = {
  id: string;
  projectId: string;
  paymentStatus: string | null;
  teaserVideoPath: string | null;
  teaserVideoUrl: string | null;
  videoUrl: string | null;
  premiumVideoPath: string | null;
};

export function isLegacyCommercialProductId(productId: string): boolean {
  return productId.trim() === LEGACY_COMMERCIAL_PRODUCT_ID;
}

export function isCommercialCatalogPackage(
  pkg: PricingPackage | null | undefined,
): boolean {
  return pkg?.category === "commercials";
}

export function isAdvertisingCatalogPackage(
  pkg: PricingPackage | null | undefined,
): boolean {
  return pkg?.category === "assets";
}

/**
 * Commercial workflow vs standalone Advertising Image.
 * Teaser presence is the production discriminator; do not use UI unlock helpers
 * (those also exclude already-paid assets).
 */
export function isCommercialWorkflowAsset(asset: {
  teaserVideoPath?: string | null;
  teaserVideoUrl?: string | null;
  videoUrl?: string | null;
  teaser_video_path?: string | null;
  teaser_video_url?: string | null;
  video_url?: string | null;
}): boolean {
  return Boolean(
    asset.teaserVideoPath ||
      asset.teaser_video_path ||
      asset.teaserVideoUrl ||
      asset.teaser_video_url ||
      asset.videoUrl ||
      asset.video_url,
  );
}

export function canBindAssetToPackage(pkg: PricingPackage): boolean {
  return pkg.category === "commercials";
}

export function shouldFulfillPremiumForProduct(productId: string): boolean {
  if (isLegacyCommercialProductId(productId)) return true;
  const pkg = getPricingPackageById(productId) ?? null;
  return isCommercialCatalogPackage(pkg);
}

/**
 * Map a live Stripe Price ID back to the canonical catalog package.
 * Uses configured env values only — never trusts client metadata.
 */
export function resolvePackageByStripePriceId(
  priceId: string,
): PricingPackage | null {
  const normalized = priceId.trim();
  if (!normalized.startsWith("price_")) return null;

  for (const [productId, envName] of Object.entries(
    PACKAGE_STRIPE_PRICE_ENV_BY_PRODUCT,
  )) {
    const configured = process.env[envName]?.trim();
    if (configured && configured === normalized) {
      return getPricingPackageById(productId as PricingPackageId) ?? null;
    }
  }

  return null;
}

/**
 * Stripe confirms the charged Price; Metaprom catalog determines the grant.
 * Conflicting purchase.product_id is ignored in favor of the Price mapping.
 */
export function resolveTrustedGrantPackage(input: {
  productId: string;
  stripePriceId?: string | null;
}): PricingPackage | null {
  const stripePriceId = input.stripePriceId?.trim() || null;

  if (stripePriceId) {
    return resolvePackageByStripePriceId(stripePriceId);
  }

  return getPricingPackageById(input.productId) ?? null;
}

export async function loadOwnedAssetById(
  supabase: SupabaseClient,
  userId: string,
  assetId: string,
): Promise<OwnedAssetRecord | null> {
  const { data: asset, error } = await supabase
    .from("assets")
    .select(
      "id, project_id, payment_status, teaser_video_path, teaser_video_url, video_url, premium_video_path",
    )
    .eq("id", assetId)
    .maybeSingle();

  if (error || !asset) return null;

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", asset.project_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!project) return null;

  return {
    id: String(asset.id),
    projectId: String(asset.project_id),
    paymentStatus:
      typeof asset.payment_status === "string" ? asset.payment_status : null,
    teaserVideoPath:
      typeof asset.teaser_video_path === "string" ? asset.teaser_video_path : null,
    teaserVideoUrl:
      typeof asset.teaser_video_url === "string" ? asset.teaser_video_url : null,
    videoUrl: typeof asset.video_url === "string" ? asset.video_url : null,
    premiumVideoPath:
      typeof asset.premium_video_path === "string"
        ? asset.premium_video_path
        : null,
  };
}

export async function hasCommercialConsumeForAsset(
  supabase: SupabaseClient,
  userId: string,
  assetId: string,
): Promise<boolean> {
  const numericAssetId = Number(assetId);
  const assetFilter = Number.isFinite(numericAssetId) ? numericAssetId : assetId;

  const { data, error } = await supabase
    .from("entitlement_ledger")
    .select("id")
    .eq("user_id", userId)
    .eq("asset_id", assetFilter)
    .eq("entry_type", "consume")
    .eq("entitlement_kind", "commercial")
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to verify commercial consume for asset ${assetId}: ${error.message}`,
    );
  }

  return Boolean(data);
}

export async function loadCompletedCommercialPurchase(
  supabase: SupabaseClient,
  input: {
    purchaseId: string | number;
    userId: string;
    assetId: string;
  },
): Promise<{ id: string; productId: string } | null> {
  const { data, error } = await supabase
    .from("purchases")
    .select("id, user_id, asset_id, product_id, status")
    .eq("id", input.purchaseId)
    .maybeSingle();

  if (error || !data) return null;
  if (data.user_id !== input.userId) return null;
  if (data.status !== "completed") return null;
  if (data.asset_id == null || String(data.asset_id) !== String(input.assetId)) {
    return null;
  }
  if (!shouldFulfillPremiumForProduct(String(data.product_id))) {
    return null;
  }

  return { id: String(data.id), productId: String(data.product_id) };
}

export type PremiumAuthorization =
  | { authorized: true; via: "ledger_consume" | "paid_purchase" }
  | { authorized: false; reason: string };

/**
 * Independent of checkout: Premium generation requires a trusted commercial
 * consume ledger row, or a completed commercial purchase loaded by id
 * (webhook session lookup only).
 */
export async function resolvePremiumAuthorization(
  supabase: SupabaseClient,
  input: {
    userId: string;
    assetId: string;
    paidPurchaseId?: string | number | null;
  },
): Promise<PremiumAuthorization> {
  if (input.paidPurchaseId != null && input.paidPurchaseId !== "") {
    const purchase = await loadCompletedCommercialPurchase(supabase, {
      purchaseId: input.paidPurchaseId,
      userId: input.userId,
      assetId: input.assetId,
    });
    if (purchase) {
      return { authorized: true, via: "paid_purchase" };
    }
  }

  if (await hasCommercialConsumeForAsset(supabase, input.userId, input.assetId)) {
    return { authorized: true, via: "ledger_consume" };
  }

  return {
    authorized: false,
    reason: "Premium video requires completed payment.",
  };
}
