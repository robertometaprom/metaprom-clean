/**
 * Studio / legacy one-off product prices (existing checkout SKUs).
 * Kept separate from the V1 package catalog so package pricing can evolve independently.
 */

export type PricingEntry = {
  id: string;
  priceMxn: number;
};

/** Single source of truth for existing studio MXN prices. Update here only. */
export const PRICING_ENTRIES: PricingEntry[] = [
  { id: "premium-image", priceMxn: 49 },
  { id: "commercial-video", priceMxn: 149 },
  { id: "marketplace-image", priceMxn: 49 },
];

export const HERO_PRICE_PRODUCT_ID = "commercial-video";

export function getPriceById(id: string): number | undefined {
  return PRICING_ENTRIES.find((entry) => entry.id === id)?.priceMxn;
}
