import type { LandingContent, Locale, Messages } from "@/lib/i18n";
import { GTM5_FLOW_STEP_IDS } from "@/lib/gtm5";
import { SHOWCASE_ENTRIES, SHOWCASE_FEATURED_ID } from "@/lib/showcases";
import {
  TESTIMONIAL_ENTRIES,
  testimonialOwnerPhoto,
} from "@/lib/testimonials";

const PLANES_HREF = "/planes";
const REAL_ESTATE_SHOWCASE_ID = "living-room";

export function buildLandingContent(
  locale: Locale,
  messages: Messages,
): LandingContent {
  const showcase: LandingContent["showcase"] = SHOWCASE_ENTRIES.map(
    (entry) => {
      const copy = messages.showcase[entry.id];

      return {
        id: entry.id,
        title: copy.title,
        description: copy.description,
        beforeImage: entry.beforeImage,
        premiumImage: entry.premiumImage,
        commercialVideo: entry.video,
      };
    },
  );

  const showcaseById = Object.fromEntries(
    showcase.map((item) => [item.id, item]),
  );

  const featured =
    showcaseById[SHOWCASE_FEATURED_ID] ?? showcase[0];
  const realEstateVisual =
    showcaseById[REAL_ESTATE_SHOWCASE_ID] ?? featured;

  const pricingProducts = Object.entries(messages.pricing.products).map(
    ([id, copy]) => ({
      id,
      name: copy.name,
      description: copy.description,
    }),
  );

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

  const steps = GTM5_FLOW_STEP_IDS.map((id) => ({
    id,
    title: messages.steps.items[id].title,
    body: messages.steps.items[id].body,
  }));

  return {
    locale,
    nav: messages.nav,
    cinema: {
      ...messages.cinema,
      primaryCtaHref: "/studio",
      secondaryCtaHref: "#how-it-works",
    },
    priceConfidence: messages.priceConfidence,
    reveal: messages.reveal,
    showcaseSection: messages.showcaseSection,
    showcaseLabels: messages.showcaseLabels,
    featured,
    showcase,
    whatIs: messages.whatIs,
    productFlow: {
      aria: messages.steps.aria,
      supporting: messages.steps.supporting,
      steps,
    },
    imageUseCases: messages.imageUseCases,
    realEstate: {
      ...messages.realEstate,
      visual: {
        beforeImage: realEstateVisual.beforeImage,
        premiumImage: realEstateVisual.premiumImage,
      },
    },
    videoUseCases: messages.videoUseCases,
    aiVs: messages.aiVs,
    faq: messages.faq,
    testimonials: {
      headline: messages.testimonials.headline,
      items: testimonials,
    },
    pricing: {
      headline: messages.pricing.headline,
      note: messages.pricing.note,
      cta: messages.pricing.cta,
      ctaHref: PLANES_HREF,
      products: pricingProducts,
    },
    footer: messages.footer,
    legalNav: messages.legalNav,
  };
}
