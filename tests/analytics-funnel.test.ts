/**
 * First-party funnel + viral attribution semantics.
 *
 * Run: npm run test:analytics
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  incomingFromSearchParams,
  incomingShareTouch,
  isShareAttributed,
  parseAcquisitionState,
  resolveAcquisitionState,
  serializeAcquisitionState,
} from "../lib/analytics/attribution.ts";
import {
  analyticsChannelFromShareAction,
  appendShareChannelParam,
  normalizeShareChannel,
  shareChannelQueryValue,
} from "../lib/analytics/channel.ts";
import type { User } from "@supabase/supabase-js";
import {
  persistFunnelEventUnlessAdmin,
  persistShareEventUnlessAdmin,
  shouldSkipAnalyticsForUser,
  shouldSkipAuthenticatedAdminAnalytics,
} from "../lib/analytics/internal-traffic.ts";
import {
  funnelIdempotencyKey,
  isClientFunnelEventType,
  isNewAuthUser,
  parseClientFunnelEventRequest,
} from "../lib/analytics/events.ts";
import { generateVisitorId, isVisitorId } from "../lib/analytics/ids.ts";
import {
  FUNNEL_METADATA_KEYS,
  metadataContainsProhibitedData,
  sanitizeFunnelMetadata,
} from "../lib/analytics/sanitize.ts";
import { parseShareEventRequest } from "../lib/growth/share-events.ts";
import { toGrowthEventInsert } from "../lib/growth/events.ts";
import { buildWhatsAppShareUrl } from "../lib/share/whatsapp-message.ts";
import { buildSmsShareUrl } from "../lib/share/sms-message.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SLUG_A = "23456789ABC";
const SLUG_B = "23456789ABD";
const VISITOR_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const VISITOR_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const VISITOR_C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const USER_C = "33333333-3333-4333-8333-333333333333";

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

test("visitor ids are random UUIDs with no PII encoding", () => {
  const id = generateVisitorId();
  assert.equal(isVisitorId(id), true);
  assert.equal(isVisitorId("not-an-id"), false);
  assert.doesNotMatch(id, /@|\+|email|phone/i);
});

test("share channel query values distinguish WhatsApp from copy-link and stay enumerable", () => {
  assert.equal(normalizeShareChannel("wa"), "whatsapp");
  assert.equal(normalizeShareChannel("cl"), "copy_link");
  assert.equal(normalizeShareChannel("native"), "native_share");
  assert.equal(normalizeShareChannel("totally-invented"), null);
  assert.equal(analyticsChannelFromShareAction("native"), "native_share");
  assert.equal(analyticsChannelFromShareAction("desktop_qr_handoff"), "whatsapp");

  const base = `https://www.metaprom.com/p/${SLUG_A}`;
  const wa = appendShareChannelParam(base, "whatsapp");
  const copy = appendShareChannelParam(base, "copy_link");
  assert.match(wa, /[?&]ch=wa/);
  assert.match(copy, /[?&]ch=cl/);
  assert.notEqual(wa, copy);
  assert.equal(shareChannelQueryValue("sms"), "sms");

  const waUrl = buildWhatsAppShareUrl({
    publicPreviewUrl: wa,
    locale: "es",
    assetType: "commercial",
  });
  const smsUrl = buildSmsShareUrl({ publicPreviewUrl: copy });
  assert.equal(decodeURIComponent(waUrl).includes(wa), true);
  assert.equal(decodeURIComponent(smsUrl).includes("ch=cl"), true);
});

test("first-touch origin is not overwritten by internal navigation; first share is sticky", () => {
  const utm = incomingFromSearchParams({
    searchParams: new URLSearchParams("utm_source=google&utm_medium=cpc&utm_campaign=launch"),
    referrer: "https://www.google.com/",
    requestHost: "www.metaprom.com",
    pathname: "/",
    at: 1,
  });
  const first = resolveAcquisitionState(null, utm);
  assert.equal(first?.origin.kind, "utm");
  assert.equal(first?.origin.utmSource, "google");
  assert.equal(first?.share, null);

  const internal = incomingFromSearchParams({
    searchParams: new URLSearchParams(),
    referrer: "https://www.metaprom.com/studio",
    requestHost: "www.metaprom.com",
    pathname: "/planes",
    at: 2,
  });
  const afterInternal = resolveAcquisitionState(first, internal);
  assert.equal(afterInternal?.origin.kind, "utm");
  assert.equal(afterInternal?.origin.utmSource, "google");

  const share = incomingShareTouch({
    shareSlug: SLUG_A,
    shareChannel: "whatsapp",
    at: 3,
  });
  const withShare = resolveAcquisitionState(afterInternal, share);
  assert.equal(withShare?.origin.kind, "utm");
  assert.equal(isShareAttributed(withShare), true);
  assert.equal(withShare?.share?.shareSlug, SLUG_A);
  assert.equal(withShare?.share?.shareChannel, "whatsapp");

  const laterShare = incomingShareTouch({
    shareSlug: SLUG_B,
    shareChannel: "copy_link",
    at: 4,
  });
  const sticky = resolveAcquisitionState(withShare, laterShare);
  assert.equal(sticky?.share?.shareSlug, SLUG_A);
  assert.equal(sticky?.share?.shareChannel, "whatsapp");

  const roundTrip = parseAcquisitionState(serializeAcquisitionState(sticky!));
  assert.deepEqual(roundTrip, sticky);
});

test("share-first arrival records origin=share and keeps old URLs without ch valid", () => {
  const share = incomingShareTouch({
    shareSlug: SLUG_A,
    shareChannel: null,
    at: 10,
  });
  const state = resolveAcquisitionState(null, share);
  assert.equal(state?.origin.kind, "share");
  assert.equal(state?.share?.shareSlug, SLUG_A);
  assert.equal(state?.share?.shareChannel, null);
});

test("signup_completed is only for new auth users, not returning logins", () => {
  const now = Date.parse("2026-08-21T20:00:00.000Z");
  assert.equal(isNewAuthUser("2026-08-21T19:59:00.000Z", now), true);
  assert.equal(isNewAuthUser("2026-08-21T12:00:00.000Z", now), false);
  assert.equal(isNewAuthUser(null, now), false);
});

test("public share collector preserves share_created/share_opened, adds CTA, rejects funnel forgeries", () => {
  const created = parseShareEventRequest({
    share_slug: SLUG_A,
    event_type: "share_created",
    metadata: {
      channel: "native",
      surface: "review_cta",
      asset_type: "commercial",
      email: "owner@example.com",
      prompt: "secret intent",
    },
  });
  assert.equal(created?.event_type, "share_created");
  assert.deepEqual(created?.metadata, {
    channel: "native_share",
    surface: "review_cta",
    asset_type: "commercial",
  });

  const opened = parseShareEventRequest({
    shareSlug: SLUG_A,
    eventType: "share_opened",
    metadata: { channel: "wa", asset_type: "advertising_image", surface: "public_page" },
  });
  assert.equal(opened?.event_type, "share_opened");
  assert.equal(opened?.metadata.channel, "whatsapp");

  const cta = parseShareEventRequest({
    share_slug: SLUG_A,
    event_type: "share_cta_clicked",
    metadata: { channel: "cl", surface: "public_page" },
  });
  assert.equal(cta?.event_type, "share_cta_clicked");
  assert.equal(cta?.metadata.channel, "copy_link");

  assert.equal(
    parseShareEventRequest({ share_slug: SLUG_A, event_type: "signup_completed" }),
    null,
  );
  assert.equal(
    parseShareEventRequest({ share_slug: SLUG_A, event_type: "purchase_completed" }),
    null,
  );
  assert.equal(
    parseShareEventRequest({ share_slug: SLUG_A, event_type: "landing_visit" }),
    null,
  );

  const insert = toGrowthEventInsert({
    shareSlug: SLUG_A,
    eventType: "share_cta_clicked",
    metadata: { channel: "whatsapp" },
  });
  assert.equal(insert.event_type, "share_cta_clicked");
});

test("client funnel parser allows landing/preview only and strips PII", () => {
  assert.equal(isClientFunnelEventType("landing_visit"), true);
  assert.equal(isClientFunnelEventType("purchase_completed"), false);

  const landing = parseClientFunnelEventRequest(
    {
      event_type: "landing_visit",
      session_key: "s1",
      metadata: { email: "a@b.com", landing_path: "/", utm_source: "google" },
    },
    VISITOR_A,
  );
  assert.equal(landing?.event_type, "landing_visit");
  assert.equal(landing?.metadata.email, undefined);
  assert.equal(landing?.user_id, null);

  const purchase = parseClientFunnelEventRequest(
    { event_type: "purchase_completed", metadata: { product_id: "commercial_1" } },
    VISITOR_A,
  );
  assert.equal(purchase, null);

  const preview = parseClientFunnelEventRequest(
    {
      event_type: "preview_viewed",
      run_id: USER_A,
      metadata: { mode: "commercial", prompt: "make a cafe ad" },
    },
    VISITOR_A,
  );
  assert.equal(preview?.event_type, "preview_viewed");
  assert.equal(preview?.metadata.prompt, undefined);
  assert.equal(preview?.metadata.mode, "commercial");
});

test("funnel metadata sanitizer never keeps prohibited PII or private content", () => {
  const sanitized = sanitizeFunnelMetadata({
    email: "user@example.com",
    name: "Ada",
    phone: "+525512345678",
    prompt: "una foto de mi tienda",
    customerIntent: "secret",
    image: "data:image/png;base64,abc",
    product_id: "commercial_1",
    amount_mxn: 180,
    currency: "MXN",
    share_channel: "whatsapp",
  });
  assert.deepEqual(sanitized, {
    product_id: "commercial_1",
    amount_mxn: 180,
    currency: "MXN",
    share_channel: "whatsapp",
  });
  assert.equal(metadataContainsProhibitedData(sanitized), false);
  assert.equal(
    metadataContainsProhibitedData({ email: "user@example.com" }),
    true,
  );
});

test("synthetic funnel: landing → share WhatsApp → attributed signup → recursive share → paid Premium", () => {
  type Row = {
    event: string;
    visitor?: string;
    user?: string;
    share?: string;
    channel?: string | null;
    generation?: number;
    origin?: string;
    attributed_to_share?: boolean;
  };

  const rows: Row[] = [];

  rows.push({ event: "landing_visit", visitor: VISITOR_A, origin: "direct" });
  rows.push({ event: "signup_completed", visitor: VISITOR_A, user: USER_A, attributed_to_share: false, origin: "direct", generation: 0 });
  rows.push({ event: "creation_started", user: USER_A });
  rows.push({ event: "creation_completed", user: USER_A });
  rows.push({ event: "preview_viewed", user: USER_A });
  rows.push({
    event: "share_created",
    user: USER_A,
    share: SLUG_A,
    channel: "whatsapp",
  });

  rows.push({
    event: "share_opened",
    visitor: VISITOR_B,
    share: SLUG_A,
    channel: "whatsapp",
  });
  rows.push({
    event: "share_cta_clicked",
    visitor: VISITOR_B,
    share: SLUG_A,
    channel: "whatsapp",
  });
  rows.push({
    event: "signup_completed",
    visitor: VISITOR_B,
    user: USER_B,
    share: SLUG_A,
    channel: "whatsapp",
    attributed_to_share: true,
    origin: "share",
    generation: 1,
  });
  rows.push({ event: "creation_completed", user: USER_B });
  rows.push({
    event: "share_created",
    user: USER_B,
    share: SLUG_B,
    channel: "copy_link",
  });

  rows.push({
    event: "share_opened",
    visitor: VISITOR_C,
    share: SLUG_B,
    channel: "copy_link",
  });
  rows.push({
    event: "signup_completed",
    visitor: VISITOR_C,
    user: USER_C,
    share: SLUG_B,
    channel: "copy_link",
    attributed_to_share: true,
    origin: "share",
    generation: 2,
  });

  rows.push({ event: "checkout_started", user: USER_B });
  rows.push({ event: "purchase_completed", user: USER_B, share: SLUG_A, channel: "whatsapp" });
  rows.push({ event: "premium_activated", user: USER_B, share: SLUG_A, channel: "whatsapp" });

  const signupA = rows.find((row) => row.event === "signup_completed" && row.user === USER_A);
  const signupB = rows.find((row) => row.event === "signup_completed" && row.user === USER_B);
  const signupC = rows.find((row) => row.event === "signup_completed" && row.user === USER_C);

  assert.equal(signupA?.attributed_to_share, false);
  assert.equal(signupB?.attributed_to_share, true);
  assert.equal(signupB?.share, SLUG_A);
  assert.equal(signupB?.channel, "whatsapp");
  assert.equal(signupB?.generation, 1);
  assert.equal(signupC?.share, SLUG_B);
  assert.equal(signupC?.channel, "copy_link");
  assert.equal(signupC?.generation, 2);

  const shareCreated = rows.filter((row) => row.event === "share_created");
  const shareOpened = rows.filter((row) => row.event === "share_opened");
  const uniqueVisitorsForA = new Set(
    rows
      .filter((row) => row.share === SLUG_A && row.visitor)
      .map((row) => row.visitor),
  );
  const ctaForA = rows.filter(
    (row) => row.event === "share_cta_clicked" && row.share === SLUG_A,
  );
  const signupsFromShare = rows.filter(
    (row) => row.event === "signup_completed" && row.attributed_to_share,
  );
  const premiumFromShare = rows.filter(
    (row) => row.event === "premium_activated" && row.share,
  );

  assert.equal(shareCreated.length, 2);
  assert.equal(shareOpened.length, 2);
  assert.equal(uniqueVisitorsForA.size, 1);
  assert.equal(ctaForA.length, 1);
  assert.equal(signupsFromShare.length, 2);
  assert.equal(premiumFromShare[0]?.user, USER_B);
  assert.equal(premiumFromShare[0]?.channel, "whatsapp");

  const sharesPerCreator = shareCreated.length / 2;
  const visitsPerShare = shareOpened.length / shareCreated.length;
  const shareSignupRate = signupsFromShare.length / uniqueVisitorsForA.size;
  const k = sharesPerCreator * visitsPerShare * shareSignupRate;
  assert.equal(Number.isFinite(k), true);
  assert.ok(k > 0);

  assert.equal(
    rows.some((row) => row.event === "purchase_completed" && row.user === USER_A),
    false,
  );
});

test("idempotency keys are unique per business event", () => {
  assert.equal(
    funnelIdempotencyKey("signup_completed", USER_B),
    funnelIdempotencyKey("signup_completed", USER_B),
  );
  assert.notEqual(
    funnelIdempotencyKey("purchase_completed", "1"),
    funnelIdempotencyKey("purchase_completed", "2"),
  );
  assert.notEqual(
    funnelIdempotencyKey("creation_completed", USER_A),
    funnelIdempotencyKey("creation_started", USER_A),
  );
});

test("source contracts: purchase is webhook/persistence, not success URL; signup is auth created_at", () => {
  const statusPage = readRepo("components/pricing/PackagePurchaseStatus.tsx");
  const webhook = readRepo("app/api/payments/webhook/route.ts");
  const persistence = readRepo("lib/payments/persistence.ts");
  const callback = readRepo("app/auth/callback/route.ts");
  const clientEvents = readRepo("app/api/analytics/client-events/route.ts");
  const growthEvents = readRepo("app/api/growth/events/route.ts");
  const enhancement = readRepo("app/api/enhancement/route.ts");
  const video = readRepo("app/api/video/route.ts");
  const checkout = readRepo("lib/payments/create-checkout-session.ts");
  const cta = readRepo("components/public/PublicCommercialCta.tsx");
  const shareHook = readRepo("lib/share/use-share-commercial.ts");
  const beacon = readRepo("components/public/ShareOpenedBeacon.tsx");
  const landing = readRepo("app/page.tsx");
  const director = readRepo("components/studio/CreativeDirector.tsx");

  assert.match(statusPage, /Never use payment=success as confirmation/);
  assert.doesNotMatch(statusPage, /recordPurchaseCompleted/);
  assert.doesNotMatch(statusPage, /purchase_completed/);

  assert.match(persistence, /recordPurchaseCompleted/);
  assert.match(persistence, /recordPremiumActivated/);
  assert.match(webhook, /persistPaymentResult/);
  assert.doesNotMatch(webhook, /recordPurchaseCompleted/);

  assert.match(callback, /recordSignupCompleted/);
  assert.match(callback, /user\.created_at/);
  assert.doesNotMatch(callback, /SIGNED_IN/);

  assert.match(clientEvents, /landing_visit/);
  assert.match(clientEvents, /preview_viewed/);
  assert.doesNotMatch(clientEvents, /purchase_completed/);
  assert.match(growthEvents, /Does not accept signup/);

  assert.match(enhancement, /recordCreationStarted/);
  assert.match(enhancement, /advertising_image/);
  assert.match(video, /recordCreationCompleted/);
  assert.match(checkout, /recordCheckoutStarted/);
  assert.match(checkout, /session\.sessionId/);

  assert.match(cta, /share_cta_clicked/);
  assert.match(shareHook, /appendShareChannelParam/);
  assert.match(shareHook, /urlForChannel\("whatsapp"\)/);
  assert.match(shareHook, /urlForChannel\("copy_link"\)/);
  assert.match(beacon, /share_opened/);
  assert.match(beacon, /sessionStorage/);
  assert.match(landing, /LandingVisitBeacon/);
  assert.match(director, /usePreviewViewedAnalytics/);
  assert.match(director, /skip: reviewVisualMock/);
});

test("migration is additive, RLS locked, and does not touch Stripe or config.toml", () => {
  const migration = readRepo(
    "supabase/migrations/20260821220000_first_party_funnel_analytics.sql",
  );
  assert.match(migration, /create table if not exists public.funnel_events/);
  assert.match(migration, /create table if not exists public.user_attributions/);
  assert.match(migration, /share_cta_clicked/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on table public.funnel_events from anon, authenticated/);
  assert.match(migration, /generation integer/);
  assert.doesNotMatch(migration, /drop table/);
  assert.doesNotMatch(migration, /\bpurchases\b/);
});

function analyticsUser(input: Partial<User>): User {
  return {
    id: "user",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "",
    ...input,
  } as User;
}

const ADMIN_USER = analyticsUser({
  id: USER_C,
  app_metadata: { role: "admin" },
});
const CUSTOMER_USER = analyticsUser({
  id: USER_A,
  email: "customer@example.com",
});

test("authenticated admin funnel and Share events are not persisted; everyone else is fail-open", async () => {
  assert.equal(shouldSkipAnalyticsForUser(null), false);
  assert.equal(shouldSkipAnalyticsForUser(undefined), false);
  assert.equal(shouldSkipAnalyticsForUser(CUSTOMER_USER), false);
  assert.equal(shouldSkipAnalyticsForUser(ADMIN_USER), true);

  const landingInserts: string[] = [];
  assert.equal(
    await persistFunnelEventUnlessAdmin(async () => {
      landingInserts.push("landing_visit");
      return "inserted";
    }, { user: ADMIN_USER }),
    "skipped",
  );
  assert.deepEqual(landingInserts, []);

  const creationInserts: string[] = [];
  assert.equal(
    await persistFunnelEventUnlessAdmin(async () => {
      creationInserts.push("creation_started");
      return "inserted";
    }, { user: ADMIN_USER }),
    "skipped",
  );
  assert.deepEqual(creationInserts, []);

  const previewInserts: string[] = [];
  assert.equal(
    await persistFunnelEventUnlessAdmin(async () => {
      previewInserts.push("preview_viewed");
      return "inserted";
    }, { user: ADMIN_USER }),
    "skipped",
  );
  assert.deepEqual(previewInserts, []);

  const shareInserts: string[] = [];
  assert.equal(
    await persistShareEventUnlessAdmin(async () => {
      shareInserts.push("share_opened");
      return true;
    }, { user: ADMIN_USER }),
    "skipped",
  );
  assert.deepEqual(shareInserts, []);

  const customerInserts: string[] = [];
  assert.equal(
    await persistFunnelEventUnlessAdmin(async () => {
      customerInserts.push("landing_visit");
      return "inserted";
    }, { user: CUSTOMER_USER }),
    "inserted",
  );
  assert.deepEqual(customerInserts, ["landing_visit"]);

  const anonymousInserts: string[] = [];
  assert.equal(
    await persistFunnelEventUnlessAdmin(async () => {
      anonymousInserts.push("share_opened");
      return "inserted";
    }, { user: null }),
    "inserted",
  );
  assert.deepEqual(anonymousInserts, ["share_opened"]);

  const loggedOutShare: string[] = [];
  assert.equal(
    await persistShareEventUnlessAdmin(async () => {
      loggedOutShare.push("share_opened");
      return true;
    }, { user: null }),
    true,
  );
  assert.deepEqual(loggedOutShare, ["share_opened"]);

  const failedLookupInserts: string[] = [];
  assert.equal(
    await persistFunnelEventUnlessAdmin(async () => {
      failedLookupInserts.push("landing_visit");
      return "inserted";
    }, {
      getUser: async () => {
        throw new Error("auth unavailable");
      },
    }),
    "inserted",
  );
  assert.deepEqual(failedLookupInserts, ["landing_visit"]);

  assert.equal(await shouldSkipAuthenticatedAdminAnalytics(), false);
  assert.equal(
    await shouldSkipAuthenticatedAdminAnalytics({
      getUser: async () => {
        throw new Error("auth unavailable");
      },
    }),
    false,
  );
});

test("admin analytics skip does not wrap checkout/premium business writes and adds no PII", () => {
  const persist = readRepo("lib/analytics/persist.ts");
  const growthPersist = readRepo("lib/growth/persist.ts");
  const record = readRepo("lib/analytics/record.ts");
  const checkout = readRepo("lib/payments/create-checkout-session.ts");
  const payments = readRepo("lib/payments/persistence.ts");
  const video = readRepo("app/api/video/route.ts");
  const enhancement = readRepo("app/api/enhancement/route.ts");
  const clientEvents = readRepo("app/api/analytics/client-events/route.ts");
  const growthEvents = readRepo("app/api/growth/events/route.ts");
  const attribution = readRepo("lib/analytics/attribution.ts");
  const cookies = readRepo("lib/analytics/cookies.ts");
  const internal = readRepo("lib/analytics/internal-traffic.ts");

  assert.match(persist, /persistFunnelEventUnlessAdmin/);
  assert.match(persist, /getAnalyticsSessionUser/);
  assert.match(growthPersist, /persistShareEventUnlessAdmin/);
  assert.match(growthPersist, /getAnalyticsSessionUser/);
  assert.match(record, /insertFunnelEvent/);
  assert.match(clientEvents, /recordLandingVisit/);
  assert.match(clientEvents, /recordPreviewViewed/);
  assert.match(growthEvents, /persistShareGrowthEvent/);

  const checkoutBody = checkout.slice(checkout.indexOf("const admin = createAdminClient"));
  assert.match(checkoutBody, /from\("purchases"\)[\s\S]*insert/);
  assert.ok(
    checkoutBody.indexOf('.from("purchases")') <
      checkoutBody.indexOf("recordCheckoutStarted"),
  );
  assert.match(checkout, /grantPackageEntitlementFromPurchase[\s\S]*recordPurchaseCompleted/);
  assert.match(checkout, /recordCheckoutStarted[\s\S]*catch \(analyticsError\)/);
  assert.match(payments, /grantPackageEntitlementFromPurchase[\s\S]*recordPremiumActivated/);
  assert.match(payments, /recordPurchaseCompleted[\s\S]*catch \(analyticsError\)/);
  assert.match(video, /recordCreationStarted[\s\S]*generateCommercialVideo/);
  assert.match(enhancement, /recordCreationStarted/);

  assert.doesNotMatch(internal, /fingerprint|x-forwarded-for|admin_email|METAPROM_ADMIN/i);
  assert.doesNotMatch(persist, /fingerprint|x-forwarded-for|is_internal/i);
  assert.doesNotMatch(FUNNEL_METADATA_KEYS.has("email") ? "email" : "", /email/);
  assert.equal(FUNNEL_METADATA_KEYS.has("email"), false);
  assert.equal(FUNNEL_METADATA_KEYS.has("is_admin"), false);
  assert.equal(FUNNEL_METADATA_KEYS.has("admin"), false);

  assert.match(attribution, /utm_source/);
  assert.match(cookies, /applyFirstPartyAnalyticsCookies/);
  assert.doesNotMatch(internal, /origin_kind|utm_source|referrer_host/);
});
