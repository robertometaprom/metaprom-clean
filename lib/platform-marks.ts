import type { Gtm5ImageChannelId, Gtm5VideoPlatformId } from "@/lib/gtm5";

export type PlatformMarkAsset = {
  src: string;
  width: number;
  height: number;
};

/**
 * Local identification marks for channels customers already use.
 * Display only. These marks do not describe a commercial relationship.
 */
export const IMAGE_CHANNEL_MARKS: Partial<
  Record<Gtm5ImageChannelId, PlatformMarkAsset>
> = {
  amazon: {
    src: "/logos/platforms/amazon.svg",
    width: 148,
    height: 42,
  },
  mercadolibre: {
    src: "/logos/platforms/mercado-libre.svg",
    width: 248,
    height: 48,
  },
  shopify: {
    src: "/logos/platforms/shopify.svg",
    width: 304,
    height: 87,
  },
};

export const VIDEO_PLATFORM_MARKS: Record<
  Gtm5VideoPlatformId,
  PlatformMarkAsset
> = {
  tiktok: {
    src: "/logos/platforms/tiktok.svg",
    width: 48,
    height: 48,
  },
  instagram: {
    src: "/logos/platforms/instagram.svg",
    width: 48,
    height: 48,
  },
  facebook: {
    src: "/logos/platforms/facebook.svg",
    width: 48,
    height: 48,
  },
  youtube: {
    src: "/logos/platforms/youtube.svg",
    width: 48,
    height: 48,
  },
};
