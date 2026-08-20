export const GTM5_FLOW_STEP_IDS = [
  "photo",
  "direction",
  "premium",
  "commercial",
] as const;

export const GTM5_IMAGE_CHANNEL_IDS = [
  "amazon",
  "mercadolibre",
  "shopify",
  "realEstate",
  "menus",
  "flyers",
  "banners",
  "catalogs",
  "social",
  "digital",
] as const;

export const GTM5_FEATURED_IMAGE_CHANNEL_IDS = [
  "amazon",
  "mercadolibre",
  "shopify",
] as const;

export const GTM5_VIDEO_PLATFORM_IDS = [
  "tiktok",
  "instagram",
  "facebook",
  "youtube",
] as const;

export const GTM5_FAQ_IDS = [
  "need-ai",
  "what-can-create",
  "just-generation",
  "generation-not-right",
  "real-estate",
  "platforms",
  "premium-commercial",
] as const;

export type Gtm5FlowStepId = (typeof GTM5_FLOW_STEP_IDS)[number];
export type Gtm5ImageChannelId = (typeof GTM5_IMAGE_CHANNEL_IDS)[number];
export type Gtm5VideoPlatformId = (typeof GTM5_VIDEO_PLATFORM_IDS)[number];
export type Gtm5FaqId = (typeof GTM5_FAQ_IDS)[number];
