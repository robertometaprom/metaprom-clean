export type Locale = "en" | "es";

export type Messages = {
  nav: {
    brand: string;
    signIn: string;
    startFree: string;
    dashboard: string;
    signOut: string;
  };
  cinema: {
    headline: string;
    subheadline: string;
    primaryCta: string;
    secondaryCta: string;
  };
  priceConfidence: {
    label: string;
  };
  reveal: {
    before: string;
    premium: string;
    commercial: string;
  };
  showcaseSection: {
    headline: string;
  };
  showcaseLabels: {
    before: string;
    premium: string;
    commercial: string;
    price: string;
  };
  showcase: Record<
    string,
    {
      title: string;
      description: string;
    }
  >;
  steps: {
    items: Record<string, { label: string }>;
  };
  testimonials: {
    headline: string;
    items: Record<
      string,
      {
        businessName: string;
        city: string;
        quote: string;
      }
    >;
  };
  pricing: {
    headline: string;
    note: string;
    products: Record<
      string,
      {
        name: string;
        description: string;
      }
    >;
  };
  footer: {
    tagline: string;
    copyright: string;
  };
};

export type ResolvedShowcaseItem = {
  id: string;
  title: string;
  description: string;
  beforeImage: string;
  premiumImage: string;
  commercialVideo: string;
  priceMxn: number;
  priceFormatted: string;
};

export type ResolvedStep = {
  id: string;
  label: string;
};

export type ResolvedTestimonial = {
  id: string;
  ownerPhoto: string;
  beforeImage: string;
  premiumImage: string;
  commercialVideo: string;
  businessName: string;
  city: string;
  quote: string;
};

export type ResolvedPricingProduct = {
  id: string;
  name: string;
  description: string;
  priceMxn: number;
  priceFormatted: string;
};

export type LandingContent = {
  locale: Locale;
  nav: Messages["nav"];
  cinema: Messages["cinema"] & {
    primaryCtaHref: string;
    secondaryCtaHref: string;
  };
  priceConfidence: Messages["priceConfidence"] & {
    priceFormatted: string;
  };
  reveal: Messages["reveal"];
  showcaseSection: Messages["showcaseSection"];
  showcaseLabels: Messages["showcaseLabels"];
  featured: ResolvedShowcaseItem;
  showcase: ResolvedShowcaseItem[];
  steps: ResolvedStep[];
  testimonials: {
    headline: string;
    items: ResolvedTestimonial[];
  };
  pricing: {
    headline: string;
    note: string;
    products: ResolvedPricingProduct[];
  };
  footer: Messages["footer"];
};

const SUPPORTED_LOCALES: Locale[] = ["en", "es"];

export function detectLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return "en";

  const languages = acceptLanguage
    .split(",")
    .map((part) => part.trim().split(";")[0]?.toLowerCase() ?? "");

  for (const language of languages) {
    if (language.startsWith("es")) return "es";
    if (language.startsWith("en")) return "en";
  }

  return "en";
}

export function isLocale(value: string | undefined): value is Locale {
  return value === "en" || value === "es";
}

export async function getLocale(): Promise<Locale> {
  const { cookies, headers } = await import("next/headers");
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("locale")?.value;

  if (isLocale(cookieLocale)) {
    return cookieLocale;
  }

  const headerStore = await headers();
  return detectLocale(headerStore.get("accept-language"));
}

export async function getMessages(locale: Locale): Promise<Messages> {
  if (locale === "es") {
    return (await import("@/messages/es.json")).default as Messages;
  }

  return (await import("@/messages/en.json")).default as Messages;
}

export function getSupportedLocales(): Locale[] {
  return SUPPORTED_LOCALES;
}

export async function getLandingContent(): Promise<LandingContent> {
  const locale = await getLocale();
  const messages = await getMessages(locale);
  const { buildLandingContent } = await import("@/lib/landing-content");
  return buildLandingContent(locale, messages);
}
