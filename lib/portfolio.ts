export type PortfolioItem = {
  id: string;
  category: string;
  emotion: string;
  folder: string;
  beforeImage: string;
  premiumImage: string;
  commercialVideo: string;
};

export type CreationPath = {
  id: string;
  icon: string;
  title: string;
  description: string;
};

export type Principle = {
  id: string;
  lines: string[];
};

export type LandingCopy = {
  hero: {
    headline: string;
    subheadline: string;
    primaryCta: string;
    secondaryCta: string;
    primaryCtaHref: string;
    secondaryCtaHref: string;
  };
  creationPaths: {
    headline: string;
  };
  noAi: {
    sentence: string;
  };
  finalCta: {
    headline: string;
    button: string;
    buttonHref: string;
  };
};

const PORTFOLIO_MEDIA = {
  before: "before.jpg",
  premium: "premium.jpg",
  commercial: "commercial.mp4",
} as const;

export function portfolioMediaPaths(folder: string) {
  const base = `/portfolio/${folder}`;
  return {
    beforeImage: `${base}/${PORTFOLIO_MEDIA.before}`,
    premiumImage: `${base}/${PORTFOLIO_MEDIA.premium}`,
    commercialVideo: `${base}/${PORTFOLIO_MEDIA.commercial}`,
  };
}

function definePortfolioItem(
  item: Omit<PortfolioItem, "beforeImage" | "premiumImage" | "commercialVideo">,
): PortfolioItem {
  return {
    ...item,
    ...portfolioMediaPaths(item.folder),
  };
}

export const PORTFOLIO_ITEMS: PortfolioItem[] = [
  definePortfolioItem({
    id: "restaurant",
    folder: "restaurant",
    category: "Restaurant",
    emotion: "The first bite",
  }),
  definePortfolioItem({
    id: "coffee",
    folder: "coffee",
    category: "Coffee",
    emotion: "A peaceful morning",
  }),
  definePortfolioItem({
    id: "flower",
    folder: "flower",
    category: "Flower Shop",
    emotion: "A surprise bouquet",
  }),
  definePortfolioItem({
    id: "living-room",
    folder: "living-room",
    category: "Living Room",
    emotion: "Family enjoying home",
  }),
];

export const CREATION_PATHS: CreationPath[] = [
  {
    id: "premium-images",
    icon: "✨",
    title: "Premium Marketing Images",
    description: "Turn ordinary photos into premium marketing content.",
  },
  {
    id: "commercial-videos",
    icon: "🎬",
    title: "Cinematic Commercials",
    description: "Bring your business to life with beautiful cinematic videos.",
  },
  {
    id: "marketplace-images",
    icon: "📦",
    title: "Marketplace Images",
    description:
      "Professional product images optimized for Amazon, Mercado Libre and Shopify.",
  },
];

export const PRINCIPLES: Principle[] = [
  {
    id: "reveal",
    lines: ["We don't invent your business.", "We reveal its best version."],
  },
  {
    id: "marketing",
    lines: ["We don't sell AI.", "We create marketing that sells."],
  },
  {
    id: "identity",
    lines: ["Your business.", "Your identity.", "Only better."],
  },
];

export const LANDING_COPY: LandingCopy = {
  hero: {
    headline: "MAKE YOUR BUSINESS LOOK LIKE A PREMIUM BRAND.",
    subheadline:
      "Upload one photo. Metaprom creates premium marketing images and cinematic commercials that transform how customers perceive your business.",
    primaryCta: "Start Free",
    secondaryCta: "Watch Examples",
    primaryCtaHref: "/login",
    secondaryCtaHref: "#transformations",
  },
  creationPaths: {
    headline: "WHAT DO YOU WANT TO CREATE?",
  },
  noAi: {
    sentence: "YOU DON'T NEED TO LEARN AI.",
  },
  finalCta: {
    headline: "What could Metaprom do with your business?",
    button: "Upload my first photo",
    buttonHref: "/login",
  },
};
