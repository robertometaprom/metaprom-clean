import type { Gtm5ImageChannelId, Gtm5VideoPlatformId } from "@/lib/gtm5";

export type PlatformMarkLayout =
  | "image-lockup"
  | "image-stacked"
  | "video-lockup"
  | "video-icon";

export type PlatformMarkAsset = {
  src: string;
  width: number;
  height: number;
  layout: PlatformMarkLayout;
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
    width: 399,
    height: 133,
    layout: "image-lockup",
  },
  mercadolibre: {
    src: "/logos/platforms/mercado-libre-final.png",
    width: 3873,
    height: 3366,
    layout: "image-stacked",
  },
  shopify: {
    src: "/logos/platforms/shopify.svg",
    width: 304,
    height: 87,
    layout: "image-lockup",
  },
};

export const VIDEO_PLATFORM_MARKS: Record<
  Gtm5VideoPlatformId,
  PlatformMarkAsset
> = {
  tiktok: {
    src: "/logos/platforms/tiktok.svg",
    width: 1000,
    height: 291,
    layout: "video-lockup",
  },
  instagram: {
    src: "/logos/platforms/instagram.svg",
    width: 1000,
    height: 1000,
    layout: "video-icon",
  },
  facebook: {
    src: "/logos/platforms/facebook.svg",
    width: 40,
    height: 40,
    layout: "video-icon",
  },
  youtube: {
    src: "/logos/platforms/youtube.svg",
    width: 389,
    height: 84,
    layout: "video-lockup",
  },
};

export const PLATFORM_MARK_LAYOUT_CLASS: Record<PlatformMarkLayout, string> = {
  "image-lockup":
    "block h-auto w-auto max-h-14 max-w-[86%] object-contain md:max-h-[5.5rem]",
  "image-stacked":
    "block h-auto w-auto max-h-[9.25rem] max-w-[58%] object-contain md:max-h-[11rem] md:max-w-[52%]",
  "video-lockup":
    "block h-auto w-auto max-h-8 max-w-[94%] object-contain md:max-h-[3.25rem]",
  "video-icon":
    "block h-auto w-auto max-h-12 max-w-12 object-contain md:max-h-[4.75rem] md:max-w-[4.75rem]",
};
