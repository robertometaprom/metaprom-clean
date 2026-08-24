import { METAPROM_BRAND } from "@/lib/brand";

/** Canonical public brand entity. Do not confuse with product names (Studio, Director). */
export const CANONICAL_BRAND_NAME = "Metaprom AI";

/** Canonical production origin. No trailing slash. */
export const CANONICAL_SITE_ORIGIN = "https://www.metaprom.com";

/** Canonical homepage URL, including the trailing slash. */
export const CANONICAL_SITE_URL = `${CANONICAL_SITE_ORIGIN}/`;

/** Google Search Console verification token. Preserve exactly. */
export const GOOGLE_SITE_VERIFICATION =
  "Z4iHqhKoXHK2Mb4W_k3jGQbb4G5Qgnw8TAROyhjLPrU";

export const HOMEPAGE_TITLE =
  "Metaprom AI — Premium Marketing for Your Business";

export const HOMEPAGE_DESCRIPTION =
  "Premium marketing images and cinematic commercials that transform how customers perceive your business.";

export const ORGANIZATION_LOGO_PATH = METAPROM_BRAND.logoDark;
export const OPEN_GRAPH_IMAGE_PATH = METAPROM_BRAND.logoDark;

/**
 * First-class public URLs for the production sitemap.
 * Keep this list exact — do not add auth, share, API, or internal surfaces.
 */
export const PUBLIC_SITEMAP_PATHS = [
  "/",
  "/studio",
  "/examples",
  "/about",
  "/planes",
  "/soporte",
  "/terminos",
  "/privacidad",
  "/pagos-reembolsos",
] as const;

export type PublicSitemapPath = (typeof PUBLIC_SITEMAP_PATHS)[number];

export function canonicalUrl(path: PublicSitemapPath | string): string {
  if (path === "/") {
    return CANONICAL_SITE_URL;
  }

  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${CANONICAL_SITE_ORIGIN}${normalized.replace(/\/+$/, "")}`;
}

export function buildPublicSitemapEntries(): Array<{ url: string }> {
  return PUBLIC_SITEMAP_PATHS.map((path) => ({
    url: canonicalUrl(path),
  }));
}

/**
 * Crawl rules for clearly private/internal URL prefixes.
 * Pages that rely on noindex (Share, login, analytics, credits, purchase
 * status, admin) are intentionally not disallowed so Google can observe
 * those directives.
 */
export const ROBOTS_DISALLOW_PATHS = [
  "/api/",
  "/auth/",
  "/dashboard",
  "/dashboard_backup",
  "/test",
  "/video-test",
] as const;

export const ROBOTS_SITEMAP_URL = `${CANONICAL_SITE_ORIGIN}/sitemap.xml`;

export function buildRobotsConfig(): {
  rules: {
    userAgent: string;
    allow: string;
    disallow: string[];
  };
  sitemap: string;
} {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...ROBOTS_DISALLOW_PATHS],
    },
    sitemap: ROBOTS_SITEMAP_URL,
  };
}
