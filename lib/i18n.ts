export type Locale = "en" | "es";

export const LOCALE_COOKIE_NAME = "locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type Messages = {
  nav: {
    brand: string;
    planes: string;
    planesCta: string;
    signIn: string;
    signInShort: string;
    signUp: string;
    startFree: string;
    dashboard: string;
    signOut: string;
    credits: string;
    library: string;
    account: string;
    closeMenu: string;
    create: string;
    localeLabel: string;
  };
  auth: {
    subtitle: string;
    google: string;
    googleLoading: string;
    googleError: string;
    methodNote: string;
    legalLead: string;
    terms: string;
    legalAnd: string;
    privacy: string;
    backHome: string;
    loading: string;
    errorAuthCallback: string;
  };
  credits: {
    title: string;
    intro: string;
    available: string;
    buyMore: string;
    commercials: string;
    images: string;
    loading: string;
    loadError: string;
    networkError: string;
    viewPlanes: string;
  };
  legalNav: {
    aria: string;
    terms: string;
    privacy: string;
    payments: string;
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
    cta: string;
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
    planes: string;
  };
};

export type ResolvedShowcaseItem = {
  id: string;
  title: string;
  description: string;
  beforeImage: string;
  premiumImage: string;
  commercialVideo: string;
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
};

export type LandingContent = {
  locale: Locale;
  nav: Messages["nav"];
  cinema: Messages["cinema"] & {
    primaryCtaHref: string;
    secondaryCtaHref: string;
  };
  priceConfidence: Messages["priceConfidence"];
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
    cta: string;
    ctaHref: string;
    products: ResolvedPricingProduct[];
  };
  footer: Messages["footer"];
  legalNav: Messages["legalNav"];
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

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "es";
}

export function getSafeInternalPath(
  value: string | null | undefined,
  fallback = "/",
): string {
  if (!value) return fallback;

  let path = value.trim();
  try {
    path = decodeURIComponent(path);
  } catch {
    return fallback;
  }

  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
    return fallback;
  }

  if (path.startsWith("/api/") || path.startsWith("/auth/")) {
    return fallback;
  }

  return path;
}

export async function getLocale(): Promise<Locale> {
  const { cookies, headers } = await import("next/headers");
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;

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
