import type { Gtm5ImageChannelId } from "@/lib/gtm5";

export type PlatformMarkAsset = {
  src: string;
  width: number;
  height: number;
  href?: string;
};

/**
 * Shopify inverted primary logo: local copy of the public SVG from
 * https://www.shopify.com/brand-assets
 * (cdn.shopify.com/shopifycloud/brochure/assets/brand-assets/).
 * Amazon, Mercado Libre, TikTok, Instagram, Facebook, and YouTube stay
 * text-only: their published rules require extra permission, a sales
 * context we do not have, or an official pack we could not download here.
 */
export const IMAGE_CHANNEL_MARKS: Partial<
  Record<Gtm5ImageChannelId, PlatformMarkAsset>
> = {
  shopify: {
    src: "/logos/platforms/shopify.svg",
    width: 304,
    height: 87,
    href: "https://www.shopify.com",
  },
};
