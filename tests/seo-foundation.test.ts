/**
 * Google identity + public site architecture — SEO foundation.
 *
 * Run: npm run test:seo
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { Messages } from "../lib/i18n.ts";
import { publicIndexMetadata, privateNoIndexMetadata } from "../lib/seo/metadata.ts";
import {
  CANONICAL_BRAND_NAME,
  CANONICAL_SITE_ORIGIN,
  CANONICAL_SITE_URL,
  GOOGLE_SITE_VERIFICATION,
  HOMEPAGE_DESCRIPTION,
  HOMEPAGE_TITLE,
  PUBLIC_SITEMAP_PATHS,
  ROBOTS_DISALLOW_PATHS,
  ROBOTS_SITEMAP_URL,
  buildPublicSitemapEntries,
  buildRobotsConfig,
  canonicalUrl,
} from "../lib/seo/site.ts";
import { getPublicStructuredData } from "../lib/seo/structured-data.ts";
import { PUBLIC_SUPPORT_EMAIL } from "../lib/support/public.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

const es = JSON.parse(readRepo("messages/es.json")) as Messages;
const en = JSON.parse(readRepo("messages/en.json")) as Messages;

const FORBIDDEN_SITEMAP_PATHS = [
  "/login",
  "/analytics",
  "/admin",
  "/admin/dashboard",
  "/creditos",
  "/planes/compra",
  "/biblioteca",
  "/experience",
  "/auth",
  "/auth/callback",
  "/api",
  "/api/payments/checkout",
  "/p/",
  "/share/wa/",
  "/dashboard",
  "/test",
  "/video-test",
];

const INVENTED_ENTITY_PATTERN =
  /founder|co-founder|employees|headquarters|office address|street address|founding date|investors?|customer count|award-winning|best-rated|testimonials/i;

const PII_PATTERN =
  /robertometaprom@gmail\.com|\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b|CURP|RFC\b/;

test("canonical brand identity is Metaprom AI at www.metaprom.com", () => {
  assert.equal(CANONICAL_BRAND_NAME, "Metaprom AI");
  assert.equal(CANONICAL_SITE_ORIGIN, "https://www.metaprom.com");
  assert.equal(CANONICAL_SITE_URL, "https://www.metaprom.com/");
  assert.equal(en.nav.brand, "Metaprom AI");
  assert.equal(es.nav.brand, "Metaprom AI");
  assert.equal(canonicalUrl("/"), "https://www.metaprom.com/");
  assert.equal(canonicalUrl("/studio"), "https://www.metaprom.com/studio");
});

test("homepage identity uses Metaprom AI, www canonical, and preserved Google verification", () => {
  assert.equal(
    HOMEPAGE_TITLE,
    "Metaprom AI — Premium Marketing for Your Business",
  );
  assert.match(HOMEPAGE_TITLE, /Metaprom AI/);
  assert.equal(
    HOMEPAGE_DESCRIPTION,
    "Premium marketing images and cinematic commercials that transform how customers perceive your business.",
  );

  const layout = readRepo("app/layout.tsx");
  const homepage = readRepo("app/page.tsx");

  assert.match(layout, /GOOGLE_SITE_VERIFICATION/);
  assert.match(layout, /CANONICAL_BRAND_NAME/);
  assert.match(layout, /metadataBase/);
  assert.equal(
    GOOGLE_SITE_VERIFICATION,
    "Z4iHqhKoXHK2Mb4W_k3jGQbb4G5Qgnw8TAROyhjLPrU",
  );
  assert.match(homepage, /HOMEPAGE_TITLE/);
  assert.match(homepage, /HOMEPAGE_DESCRIPTION/);
  assert.match(homepage, /publicIndexMetadata/);
  assert.match(homepage, /path: "\/"/);

  const homepageMeta = publicIndexMetadata({
    title: HOMEPAGE_TITLE,
    description: HOMEPAGE_DESCRIPTION,
    path: "/",
  });
  assert.equal(homepageMeta.title, HOMEPAGE_TITLE);
  assert.equal(homepageMeta.description, HOMEPAGE_DESCRIPTION);
  assert.equal(homepageMeta.alternates?.canonical, CANONICAL_SITE_URL);
  assert.deepEqual(homepageMeta.robots, { index: true, follow: true });
  assert.equal(homepageMeta.openGraph?.siteName, "Metaprom AI");
});

test("WebSite and Organization structured data identify Metaprom AI + www.metaprom.com", () => {
  const data = getPublicStructuredData();
  const json = JSON.stringify(data);

  assert.equal(data["@context"], "https://schema.org");
  const organization = data["@graph"].find((node) => node["@type"] === "Organization");
  const website = data["@graph"].find((node) => node["@type"] === "WebSite");

  assert.ok(organization, "Organization node");
  assert.ok(website, "WebSite node");
  assert.equal(organization?.name, "Metaprom AI");
  assert.equal(organization?.url, "https://www.metaprom.com/");
  assert.equal(website?.name, "Metaprom AI");
  assert.equal(website?.url, "https://www.metaprom.com/");
  assert.match(json, /www\.metaprom\.com\/brand\/metaprom-logo-dark\.png/);
  assert.equal(organization?.email, PUBLIC_SUPPORT_EMAIL);

  assert.doesNotMatch(json, INVENTED_ENTITY_PATTERN);
  assert.doesNotMatch(json, /LocalBusiness|AggregateRating|Review|sameAs/);
  assert.doesNotMatch(json, /SearchAction|foundingDate|address|telephone|employee/);
  assert.doesNotMatch(json, PII_PATTERN);

  assert.match(readRepo("app/layout.tsx"), /JsonLd/);
  assert.match(readRepo("components/seo/JsonLd.tsx"), /application\/ld\+json/);
});

test("/studio is intentionally indexable with its own title and canonical", () => {
  const studio = readRepo("app/studio/page.tsx");
  assert.match(studio, /generateMetadata/);
  assert.match(studio, /studioSeo/);
  assert.match(studio, /path: "\/studio"/);
  assert.doesNotMatch(studio, /index:\s*false/);

  assert.equal(en.studioSeo.metaTitle, "Studio — Metaprom AI");
  assert.match(en.studioSeo.metaDescription, /premium marketing images/i);
  assert.match(en.studioSeo.metaDescription, /cinematic commercials/i);
  assert.equal(es.studioSeo.metaTitle, "Studio — Metaprom AI");
  assert.match(es.studioSeo.metaDescription, /imágenes de marketing premium/i);

  const meta = publicIndexMetadata({
    title: en.studioSeo.metaTitle,
    description: en.studioSeo.metaDescription,
    path: "/studio",
  });
  assert.equal(meta.alternates?.canonical, "https://www.metaprom.com/studio");
  assert.deepEqual(meta.robots, { index: true, follow: true });
});

test("/examples exists, is indexable, and reuses landing showcases without customer claims", () => {
  const page = readRepo("app/examples/page.tsx");
  assert.match(page, /path: "\/examples"/);
  assert.match(page, /ShowcaseGrid/);
  assert.doesNotMatch(page, /Testimonials/);
  assert.doesNotMatch(page, /index:\s*false/);

  assert.equal(en.examples.metaTitle, "Examples — Metaprom AI");
  assert.equal(en.examples.title, "Examples");
  assert.equal(
    en.examples.lead,
    "Examples of premium marketing images and cinematic commercials created with Metaprom AI.",
  );
  assert.equal(es.examples.title, "Ejemplos");
  assert.doesNotMatch(
    JSON.stringify({ en: en.examples, es: es.examples }),
    /real business owners|dueños de negocios reales|fictional|fictitious|testimonial/i,
  );
  assert.doesNotMatch(
    JSON.stringify({ en: en.examples, es: es.examples }),
    INVENTED_ENTITY_PATTERN,
  );

  const meta = publicIndexMetadata({
    title: en.examples.metaTitle,
    description: en.examples.metaDescription,
    path: "/examples",
  });
  assert.equal(meta.alternates?.canonical, "https://www.metaprom.com/examples");
  assert.deepEqual(meta.robots, { index: true, follow: true });
});

test("/about exists, is indexable, and stays a factual identity page", () => {
  const page = readRepo("app/about/page.tsx");
  assert.match(page, /path: "\/about"/);
  assert.match(page, /www\.metaprom\.com/);
  assert.match(page, /href="\/studio"/);
  assert.doesNotMatch(page, /index:\s*false/);

  assert.equal(en.about.metaTitle, "About Metaprom AI");
  assert.equal(en.about.title, "About Metaprom AI");
  assert.match(en.about.intro, /creative platform/);
  assert.match(en.about.studio, /Studio/);
  assert.match(en.about.ai, /Artificial intelligence is part of the underlying creative capability/);
  assert.match(es.about.title, /Acerca de Metaprom AI/);
  assert.match(es.about.intro, /plataforma creativa/);

  const aboutText = JSON.stringify({ en: en.about, es: es.about });
  assert.doesNotMatch(aboutText, INVENTED_ENTITY_PATTERN);
  assert.doesNotMatch(aboutText, /domain history|registered in|since 19|oficina|CDMX|Mexico City office/i);
  assert.doesNotMatch(aboutText, PII_PATTERN);

  const meta = publicIndexMetadata({
    title: en.about.metaTitle,
    description: en.about.metaDescription,
    path: "/about",
  });
  assert.equal(meta.alternates?.canonical, "https://www.metaprom.com/about");
});

test("sitemap contains exactly the approved public www URLs", () => {
  const sitemapSource = readRepo("app/sitemap.ts");
  assert.match(sitemapSource, /buildPublicSitemapEntries/);

  const entries = buildPublicSitemapEntries();
  const urls = entries.map((entry) => entry.url);

  assert.deepEqual(urls, [
    "https://www.metaprom.com/",
    "https://www.metaprom.com/studio",
    "https://www.metaprom.com/examples",
    "https://www.metaprom.com/about",
    "https://www.metaprom.com/planes",
    "https://www.metaprom.com/soporte",
    "https://www.metaprom.com/terminos",
    "https://www.metaprom.com/privacidad",
    "https://www.metaprom.com/pagos-reembolsos",
  ]);
  assert.equal(urls.length, PUBLIC_SITEMAP_PATHS.length);
  assert.equal(new Set(urls).size, urls.length);

  for (const forbidden of FORBIDDEN_SITEMAP_PATHS) {
    assert.equal(
      urls.some((url) => url.includes(forbidden)),
      false,
      forbidden,
    );
  }
});

test("robots advertises the sitemap and does not block noindex observation", () => {
  const robotsSource = readRepo("app/robots.ts");
  assert.match(robotsSource, /buildRobotsConfig/);

  const robots = buildRobotsConfig();
  assert.equal(robots.sitemap, "https://www.metaprom.com/sitemap.xml");
  assert.equal(robots.sitemap, ROBOTS_SITEMAP_URL);
  assert.equal(robots.rules.allow, "/");
  assert.deepEqual(robots.rules.disallow, [...ROBOTS_DISALLOW_PATHS]);

  const disallow = robots.rules.disallow.join("\n");
  assert.match(disallow, /\/api\//);
  assert.match(disallow, /\/auth\//);
  assert.doesNotMatch(disallow, /\/studio\b/);
  assert.doesNotMatch(disallow, /\/examples/);
  assert.doesNotMatch(disallow, /\/about/);
  assert.doesNotMatch(disallow, /\/login/);
  assert.doesNotMatch(disallow, /\/analytics/);
  assert.doesNotMatch(disallow, /\/p\//);
  assert.doesNotMatch(disallow, /\/share/);
  assert.doesNotMatch(disallow, /\/creditos/);
  assert.doesNotMatch(disallow, /\/planes/);
  assert.doesNotMatch(disallow, /\/admin/);
  assert.doesNotMatch(disallow, /\/soporte/);
});

test("login, credits, purchase status, admin, analytics, and Share stay noindex", () => {
  assert.match(
    readRepo("app/login/page.tsx"),
    /privateNoIndexMetadata/,
  );
  assert.match(
    readRepo("app/creditos/page.tsx"),
    /robots: \{ index: false, follow: false \}/,
  );
  assert.match(
    readRepo("app/planes/compra/page.tsx"),
    /robots: \{ index: false, follow: false \}/,
  );
  assert.match(
    readRepo("app/admin/dashboard/page.tsx"),
    /robots: \{ index: false, follow: false \}/,
  );
  assert.match(
    readRepo("app/analytics/page.tsx"),
    /robots: \{ index: false, follow: false \}/,
  );
  assert.match(
    readRepo("app/share/wa/[share_slug]/page.tsx"),
    /privateNoIndexMetadata/,
  );

  const sharePage = readRepo("app/p/[share_slug]/page.tsx");
  const robotsBlocks =
    sharePage.match(/robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/g) ??
    [];
  assert.ok(robotsBlocks.length >= 2);

  const noindex = privateNoIndexMetadata();
  assert.deepEqual(noindex.robots, { index: false, follow: false });
  assert.equal(noindex.title, undefined);
});

test("public navigation exposes Studio, Examples, About, and Plans as crawlable links", () => {
  const navbar = readRepo("components/Navbar.tsx");
  const footer = readRepo("components/landing/Footer.tsx");
  const links = readRepo("components/public/PublicSiteLinks.tsx");

  assert.match(navbar, /PublicSiteLinks/);
  assert.match(footer, /PublicSiteLinks/);
  assert.match(links, /studio: "\/studio"/);
  assert.match(links, /examples: "\/examples"/);
  assert.match(links, /about: "\/about"/);
  assert.match(links, /planes: "\/planes"/);
  assert.match(links, /href=\{PUBLIC_NAV_HREFS\[key\]\}/);
  assert.match(navbar, /href="\/planes"/);
  assert.match(footer, /href="\/planes"/);
  assert.doesNotMatch(navbar, /\/analytics/);
  assert.doesNotMatch(footer, /\/analytics/);
});

test("Share metadata privacy remains prompt-free and no PII is introduced", () => {
  const sharePage = readRepo("app/p/[share_slug]/page.tsx");
  const shareMeta = readRepo("lib/preview/public-preview-metadata.ts");
  const aboutPage = readRepo("app/about/page.tsx");
  const examplesPage = readRepo("app/examples/page.tsx");
  const structured = readRepo("lib/seo/structured-data.ts");

  assert.match(sharePage, /robots: \{ index: false, follow: false \}/);
  assert.doesNotMatch(shareMeta, /customerIntent/);
  assert.doesNotMatch(sharePage, /ai_instructions|customerIntent/);

  const surfaces = [
    aboutPage,
    examplesPage,
    structured,
    JSON.stringify({ en: en.about, es: es.about, examplesEn: en.examples, examplesEs: es.examples }),
  ].join("\n");

  assert.doesNotMatch(surfaces, PII_PATTERN);
  assert.doesNotMatch(surfaces, /gmail\.com/);
});
