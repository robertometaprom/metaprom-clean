export type ShowcaseEntry = {
  id: string;
  beforeImage: string;
  premiumImage: string;
  video: string;
  /** References a product id in lib/pricing.ts */
  priceProductId: string;
};

export const SHOWCASE_FEATURED_ID = "restaurant";

export const SHOWCASE_ENTRIES: ShowcaseEntry[] = [
  {
    id: "restaurant",
    beforeImage: "/showcase/restaurant/before.jpg",
    premiumImage: "/showcase/restaurant/premium.jpg",
    video: "/showcase/restaurant/commercial.mp4",
    priceProductId: "commercial-video",
  },
  {
    id: "coffee",
    beforeImage: "/showcase/coffee/before.jpg",
    premiumImage: "/showcase/coffee/premium.jpg",
    video: "/showcase/coffee/commercial.mp4",
    priceProductId: "commercial-video",
  },
  {
    id: "flower",
    beforeImage: "/showcase/flower/before.jpg",
    premiumImage: "/showcase/flower/premium.jpg",
    video: "/showcase/flower/commercial.mp4",
    priceProductId: "commercial-video",
  },
  {
    id: "living-room",
    beforeImage: "/showcase/living-room/before.jpg",
    premiumImage: "/showcase/living-room/premium.jpg",
    video: "/showcase/living-room/commercial.mp4",
    priceProductId: "commercial-video",
  },
];
