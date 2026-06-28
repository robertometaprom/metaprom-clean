export type PricingEntry = {
  id: string;
  priceMxn: number;
};

/** Single source of truth for MXN prices. Update here only. */
export const PRICING_ENTRIES: PricingEntry[] = [
  { id: "premium-image", priceMxn: 49 },
  { id: "commercial-video", priceMxn: 149 },
  { id: "marketplace-image", priceMxn: 49 },
];

export const HERO_PRICE_PRODUCT_ID = "commercial-video";

export function getPriceById(id: string): number | undefined {
  return PRICING_ENTRIES.find((entry) => entry.id === id)?.priceMxn;
}

export function formatPriceMxn(amount: number, locale: "en" | "es"): string {
  const formatted = new Intl.NumberFormat(locale === "es" ? "es-MX" : "en-US", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(amount);

  return formatted;
}
