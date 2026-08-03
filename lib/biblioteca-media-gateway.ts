import type { AssetPaymentStatus } from "@/lib/commercial/tiers";

/** Private owner access today; future public preview sharing can add rules here. */
export type BibliotecaMediaAccessMode = "owner" | "public_share";

export type BibliotecaMediaType = "original" | "teaser" | "premium";

export type BibliotecaMediaAsset = {
  id: string;
  project_id: string;
  original_path: string | null;
  teaser_video_path: string | null;
  premium_video_path: string | null;
  payment_status?: AssetPaymentStatus | null;
};

export const BIBLIOTECA_MEDIA_SIGNED_URL_TTL_SECONDS = 60 * 5;

export function buildBibliotecaMediaGatewayUrl(
  assetId: string,
  type: BibliotecaMediaType,
): string {
  const params = new URLSearchParams({
    assetId,
    type,
  });
  return `/api/biblioteca/media?${params.toString()}`;
}

export function resolveBibliotecaMediaPath(
  asset: BibliotecaMediaAsset,
  type: BibliotecaMediaType,
): string | null {
  switch (type) {
    case "original":
      return asset.original_path;
    case "teaser":
      return asset.teaser_video_path;
    case "premium":
      return asset.premium_video_path;
    default:
      return null;
  }
}

/** Mirrors Biblioteca client ownership rules for premium delivery. */
export function isBibliotecaPremiumEntitled(
  asset: BibliotecaMediaAsset,
): boolean {
  if (asset.payment_status === "paid") {
    return true;
  }

  // Legacy records may have the HD file persisted before payment_status was set.
  return Boolean(asset.premium_video_path);
}

export function canDeliverBibliotecaMedia(
  asset: BibliotecaMediaAsset,
  type: BibliotecaMediaType,
  mode: BibliotecaMediaAccessMode,
): boolean {
  if (mode === "public_share") {
    // Reserved for future share_slug / share-token authorization.
    return type === "teaser";
  }

  if (type === "premium") {
    return isBibliotecaPremiumEntitled(asset);
  }

  return true;
}
