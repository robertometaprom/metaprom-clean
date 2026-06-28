import type { LandingContent, Locale, Messages } from "@/lib/i18n";
import {
  formatPriceMxn,
  getPriceById,
  HERO_PRICE_PRODUCT_ID,
  PRICING_ENTRIES,
} from "@/lib/pricing";
import { SHOWCASE_ENTRIES, SHOWCASE_FEATURED_ID } from "@/lib/showcases";
import {
  TESTIMONIAL_ENTRIES,
  testimonialOwnerPhoto,
} from "@/lib/testimonials";

const STEP_IDS = ["photo", "transform", "download", "publish"] as const;

export function buildLandingContent(
  locale: Locale,
  messages: Messages,
): LandingContent {
  const showcase: LandingContent["showcase"] = SHOWCASE_ENTRIES.map(
    (entry) => {
      const copy = messages.showcase[entry.id];
      const priceMxn = getPriceById(entry.priceProductId) ?? 0;

      return {
        id: entry.id,
        title: copy.title,
        description: copy.description,
        beforeImage: entry.beforeImage,
        premiumImage: entry.premiumImage,
        commercialVideo: entry.video,
        priceMxn,
        priceFormatted: formatPriceMxn(priceMxn, locale),
      };
    },
  );

  const showcaseById = Object.fromEntries(
    showcase.map((item) => [item.id, item]),
  );

  const featured =
    showcaseById[SHOWCASE_FEATURED_ID] ?? showcase[0];

  const heroPrice = getPriceById(HERO_PRICE_PRODUCT_ID) ?? 0;

  const pricingProducts = PRICING_ENTRIES.map((entry) => {
    const copy = messages.pricing.products[entry.id];
    return {
      id: entry.id,
      name: copy.name,
      description: copy.description,
      priceMxn: entry.priceMxn,
      priceFormatted: formatPriceMxn(entry.priceMxn, locale),
    };
  });

  const testimonials = TESTIMONIAL_ENTRIES.map((entry) => {
    const copy = messages.testimonials.items[entry.id];
    const media = showcaseById[entry.showcaseId];

    return {
      id: entry.id,
      ownerPhoto: testimonialOwnerPhoto(entry.folder),
      beforeImage: media.beforeImage,
      premiumImage: media.premiumImage,
      commercialVideo: media.commercialVideo,
      businessName: copy.businessName,
      city: copy.city,
      quote: copy.quote,
    };
  });

  const steps = STEP_IDS.map((id) => ({
    id,
    label: messages.steps.items[id].label,
  }));

  return {
    locale,
    nav: messages.nav,
    cinema: {
      ...messages.cinema,
      primaryCtaHref: "/login",
      secondaryCtaHref: "#how-it-works",
    },
    priceConfidence: {
      ...messages.priceConfidence,
      priceFormatted: formatPriceMxn(heroPrice, locale),
    },
    reveal: messages.reveal,
    showcaseSection: messages.showcaseSection,
    showcaseLabels: messages.showcaseLabels,
    featured,
    showcase,
    steps,
    testimonials: {
      headline: messages.testimonials.headline,
      items: testimonials,
    },
    pricing: {
      headline: messages.pricing.headline,
      note: messages.pricing.note,
      products: pricingProducts,
    },
    footer: messages.footer,
  };
}
