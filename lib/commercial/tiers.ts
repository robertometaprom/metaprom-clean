export type CommercialTier = "teaser" | "premium";

export const TEASER_MAX_SECONDS = 5;
export const PREMIUM_TARGET_SECONDS = 12;

export const TEASER_VIDEO_CRF = 28;
export const PREMIUM_VIDEO_CRF = 20;

export const WATERMARK_TEXT = "Metaprom";

export type TierVideoConfig = {
  tier: CommercialTier;
  maxSeconds: number;
  applyWatermark: boolean;
  crf: number;
};

export function getTierVideoConfig(tier: CommercialTier): TierVideoConfig {
  if (tier === "premium") {
    return {
      tier,
      maxSeconds: PREMIUM_TARGET_SECONDS,
      applyWatermark: false,
      crf: PREMIUM_VIDEO_CRF,
    };
  }

  return {
    tier,
    maxSeconds: TEASER_MAX_SECONDS,
    applyWatermark: true,
    crf: TEASER_VIDEO_CRF,
  };
}

export type AssetPaymentStatus = "none" | "pending" | "paid";

export function isPremiumUnlocked(status: AssetPaymentStatus): boolean {
  return status === "paid";
}
