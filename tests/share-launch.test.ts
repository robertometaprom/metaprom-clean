/**
 * P1-4 Share Launch Hardening — no live generation, no paid assets.
 *
 * Run: npm run test:share-launch
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { toGrowthEventInsert } from "../lib/growth/events.ts";
import { parseShareEventRequest } from "../lib/growth/share-events.ts";
import {
  canDeliverBibliotecaMedia,
  type BibliotecaMediaAsset,
} from "../lib/biblioteca-media-gateway.ts";
import { sanitizePublicPreview } from "../lib/preview/sanitize-public-preview.ts";
import {
  buildPublicPreviewImagePath,
  buildPublicPreviewImageUrl,
  buildPublicPreviewPath,
  buildPublicPreviewStreamPath,
  buildPublicPreviewUrl,
  canonicalizeAppBaseUrl,
  extractShareSlugFromPublicUrl,
  getAppBaseUrl,
  isMetapromPublicSharePath,
} from "../lib/preview/share-url.ts";
import { getPublicCommercialContent } from "../lib/public-commercial/content.ts";
import { getEnabledShareProviders } from "../lib/share/providers.ts";
import { buildSmsShareMessage, buildSmsShareUrl } from "../lib/share/sms-message.ts";
import { buildWhatsAppShareMessage, buildWhatsAppShareUrl } from "../lib/share/whatsapp-message.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SLUG = "23456789ABC";

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function withAppUrl<T>(url: string | undefined, run: () => T): T {
  const previous = process.env.NEXT_PUBLIC_APP_URL;
  const previousVercel = process.env.VERCEL_URL;

  if (url === undefined) {
    delete process.env.NEXT_PUBLIC_APP_URL;
  } else {
    process.env.NEXT_PUBLIC_APP_URL = url;
  }
  delete process.env.VERCEL_URL;

  try {
    return run();
  } finally {
    if (previous === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = previous;
    }
    if (previousVercel === undefined) {
      delete process.env.VERCEL_URL;
    } else {
      process.env.VERCEL_URL = previousVercel;
    }
  }
}

test("canonical generated share URLs use https://www.metaprom.com, not apex", () => {
  assert.equal(
    canonicalizeAppBaseUrl("https://metaprom.com"),
    "https://www.metaprom.com",
  );
  assert.equal(
    canonicalizeAppBaseUrl("https://metaprom.com/"),
    "https://www.metaprom.com",
  );
  assert.equal(
    canonicalizeAppBaseUrl("https://www.metaprom.com"),
    "https://www.metaprom.com",
  );

  const productionShare = withAppUrl("https://metaprom.com", () =>
    buildPublicPreviewUrl(SLUG),
  );
  assert.equal(productionShare, `https://www.metaprom.com/p/${SLUG}`);
  assert.equal(extractShareSlugFromPublicUrl(productionShare), SLUG);
  assert.ok(isMetapromPublicSharePath(buildPublicPreviewPath(SLUG)));
});

test("local and preview hosts are not rewritten to www", () => {
  assert.equal(
    canonicalizeAppBaseUrl("http://localhost:3000"),
    "http://localhost:3000",
  );
  assert.equal(
    canonicalizeAppBaseUrl("https://metaprom-ai.vercel.app"),
    "https://metaprom-ai.vercel.app",
  );

  const localShare = withAppUrl("http://localhost:3000", () =>
    buildPublicPreviewUrl(SLUG),
  );
  assert.equal(localShare, `http://localhost:3000/p/${SLUG}`);
  assert.equal(withAppUrl("http://localhost:3000", () => getAppBaseUrl()), "http://localhost:3000");
});

test("public preview payload never exposes original, Premium HD, or storage share destinations", () => {
  const commercial = sanitizePublicPreview({
    shareSlug: SLUG,
    kind: "commercial",
    publicUrl: `https://www.metaprom.com/p/${SLUG}`,
    title: "Cafe · Comercial con Metaprom",
    description: "Watch this",
    hasPoster: true,
    industry: "food",
    visibility: "unlisted",
    createdAt: "2026-08-19T00:00:00.000Z",
    updatedAt: "2026-08-19T00:00:00.000Z",
  });

  assert.equal(commercial.publicUrl, `https://www.metaprom.com/p/${SLUG}`);
  assert.equal(commercial.originalPhotoUrl, null);
  assert.equal(commercial.posterUrl, buildPublicPreviewImagePath(SLUG));
  assert.equal(commercial.streamPath, buildPublicPreviewStreamPath(SLUG));
  assert.equal(commercial.posterUrl?.includes("supabase"), false);
  assert.equal(commercial.posterUrl?.includes("token="), false);
  assert.ok(!("premium_video_path" in commercial));
  assert.ok(!("user_id" in commercial));
  assert.ok(!("email" in commercial));

  const image = sanitizePublicPreview({
    shareSlug: SLUG,
    kind: "advertising_image",
    publicUrl: `https://www.metaprom.com/p/${SLUG}`,
    title: "Cafe · Imagen con Metaprom",
    description: "See this",
    hasPoster: true,
    industry: null,
    visibility: "public",
    createdAt: "2026-08-19T00:00:00.000Z",
    updatedAt: "2026-08-19T00:00:00.000Z",
  });

  assert.equal(image.streamPath, null);
  assert.equal(image.originalPhotoUrl, null);
  assert.equal(image.posterUrl, `/api/public/${SLUG}/image`);
});

test("WhatsApp and copy destinations are the Metaprom public page", () => {
  const publicPreviewUrl = `https://www.metaprom.com/p/${SLUG}`;

  const esCommercial = buildWhatsAppShareMessage({
    publicPreviewUrl,
    locale: "es",
    assetType: "commercial",
  });
  const enImage = buildWhatsAppShareMessage({
    publicPreviewUrl,
    locale: "en",
    assetType: "advertising_image",
  });

  assert.match(esCommercial, /Mira el comercial que hice con Metaprom/);
  assert.match(esCommercial, new RegExp(`/p/${SLUG}`));
  assert.doesNotMatch(esCommercial, /supabase|token=/i);

  assert.match(enImage, /Check out this image I made with Metaprom/);
  assert.match(enImage, new RegExp(`/p/${SLUG}`));

  const waUrl = buildWhatsAppShareUrl({
    publicPreviewUrl,
    locale: "es",
    assetType: "commercial",
  });
  assert.equal(waUrl.startsWith("https://wa.me/?text="), true);
  assert.equal(decodeURIComponent(waUrl).includes(publicPreviewUrl), true);
});

test("SMS is a self-contained sms: link for English and stays off Spanish menus", () => {
  const publicPreviewUrl = `https://www.metaprom.com/p/${SLUG}`;
  const smsUrl = buildSmsShareUrl({
    publicPreviewUrl,
    assetType: "commercial",
  });

  assert.equal(smsUrl.startsWith("sms:?&body="), true);
  assert.match(
    buildSmsShareMessage({ publicPreviewUrl, assetType: "commercial" }),
    /Check out my Metaprom commercial/,
  );
  assert.equal(decodeURIComponent(smsUrl).includes(publicPreviewUrl), true);
  assert.doesNotMatch(smsUrl, /supabase|token=/i);

  const spanish = getEnabledShareProviders("es").map((provider) => provider.id);
  const english = getEnabledShareProviders("en").map((provider) => provider.id);

  assert.deepEqual(spanish, ["whatsapp", "copy_link"]);
  assert.deepEqual(english, ["whatsapp", "copy_link", "sms"]);
});

test("public CTAs stay free and route to /studio", () => {
  const es = getPublicCommercialContent("es");
  const en = getPublicCommercialContent("en");

  assert.equal(es.ctaLabel, "Crea el tuyo gratis");
  assert.equal(en.ctaLabel, "Create yours free");
  assert.equal(es.ctaHref, "/studio");
  assert.equal(en.ctaHref, "/studio");
  assert.doesNotMatch(es.ctaLabel, /\$|MXN|180|99/);
  assert.doesNotMatch(en.ctaLabel, /\$|MXN|180|99/);
});

test("share_created and share_opened parse; share_to_signup is rejected", () => {
  const created = parseShareEventRequest({
    share_slug: SLUG,
    event_type: "share_created",
    metadata: {
      channel: "whatsapp",
      surface: "menu",
      asset_type: "commercial",
      email: "owner@example.com",
      user_id: "secret",
    },
  });

  assert.ok(created);
  assert.equal(created?.event_type, "share_created");
  assert.deepEqual(created?.metadata, {
    channel: "whatsapp",
    surface: "menu",
    asset_type: "commercial",
  });
  assert.equal(created?.visitor_id, null);

  const opened = parseShareEventRequest({
    shareSlug: SLUG,
    eventType: "share_opened",
    metadata: { asset_type: "advertising_image", surface: "public_page" },
  });
  assert.equal(opened?.event_type, "share_opened");

  assert.equal(
    parseShareEventRequest({
      share_slug: SLUG,
      event_type: "share_to_signup",
    }),
    null,
  );
  assert.equal(
    parseShareEventRequest({
      share_slug: SLUG,
      event_type: "share_whatsapp",
    }),
    null,
  );

  const insert = toGrowthEventInsert({
    shareSlug: SLUG,
    eventType: "share_created",
    metadata: { channel: "copy_link" },
  });
  assert.equal(insert.event_type, "share_created");
  assert.equal(insert.share_slug, SLUG);
});

test("share slug does not unlock Biblioteca original or Premium media", () => {
  const asset: BibliotecaMediaAsset = {
    id: "asset-1",
    project_id: "project-1",
    original_path: "user/original.jpg",
    teaser_video_path: "user/teaser.mp4",
    premium_video_path: "user/premium.mp4",
    payment_status: "paid",
  };

  assert.equal(canDeliverBibliotecaMedia(asset, "teaser", "public_share"), true);
  assert.equal(canDeliverBibliotecaMedia(asset, "original", "public_share"), false);
  assert.equal(canDeliverBibliotecaMedia(asset, "premium", "public_share"), false);
});

test("Share P1 source contracts: public resolver, events, image proxy, CTA", () => {
  const publicPreview = readRepo("lib/preview/public-preview.ts");
  const imageRoute = readRepo("app/api/public/[slug]/image/route.ts");
  const streamRoute = readRepo("app/api/public/[slug]/stream/route.ts");
  const bibliotecaMedia = readRepo("app/api/biblioteca/media/route.ts");
  const publicPage = readRepo("components/public/PublicCommercialPage.tsx");
  const events = readRepo("lib/growth/events.ts");
  const persist = readRepo("lib/growth/persist.ts");
  const shareHook = readRepo("lib/share/use-share-commercial.ts");
  const beacon = readRepo("components/public/ShareOpenedBeacon.tsx");

  assert.doesNotMatch(publicPreview, /premium_video_path/);
  assert.doesNotMatch(publicPreview, /original_path/);
  assert.doesNotMatch(publicPreview, /user_id/);
  assert.doesNotMatch(publicPreview, /\bemail\b/);
  assert.match(publicPreview, /originalPhotoPath: null/);
  assert.match(publicPreview, /createPublicPreviewImageUrl/);
  assert.match(publicPreview, /teaserVideoPath/);
  assert.match(publicPreview, /posterImagePath/);

  assert.match(imageRoute, /createPublicPreviewImageUrl/);
  assert.match(streamRoute, /createPublicPreviewStreamUrl/);
  assert.match(bibliotecaMedia, /Authentication required/);
  assert.match(bibliotecaMedia, /eq\("user_id", user\.id\)/);

  assert.doesNotMatch(publicPage, /PublicOriginalPhoto/);
  assert.match(publicPage, /ShareOpenedBeacon/);
  assert.match(publicPage, /PublicCommercialCta/);

  assert.match(events, /share_created/);
  assert.match(events, /share_opened/);
  assert.match(events, /share_cta_clicked/);
  assert.match(events, /\/api\/growth\/events/);
  assert.doesNotMatch(events, /no-op until analytics PR/);

  assert.match(persist, /growth_events/);
  assert.match(persist, /isPersistedShareEventType/);
  assert.doesNotMatch(persist, /share_to_signup/);

  assert.match(shareHook, /eventType: "share_created"/);
  assert.match(shareHook, /appendShareChannelParam/);
  assert.match(shareHook, /buildSmsShareUrl/);
  assert.match(beacon, /eventType: "share_opened"/);
  assert.match(beacon, /sessionStorage/);
  assert.match(readRepo("components/public/PublicCommercialCta.tsx"), /share_cta_clicked/);

  const ogImage = withAppUrl("https://metaprom.com", () =>
    buildPublicPreviewImageUrl(SLUG),
  );
  assert.equal(ogImage, `https://www.metaprom.com/api/public/${SLUG}/image`);
});
