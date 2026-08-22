/**
 * Internal analytics dashboard: access, aggregation, PII.
 *
 * Run: npm run test:analytics
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import type { User } from "@supabase/supabase-js";

import {
  ANALYTICS_DENIED_PATH,
  ANALYTICS_LOGIN_PATH,
  analyticsAuthRedirect,
  resolveAnalyticsAccess,
} from "../lib/analytics/dashboard-access.ts";
import {
  acquisitionChannelFromFields,
  aggregateAnalyticsDashboard,
  analyticsRangeStart,
  computeKFactor,
  dashboardPayloadContainsPii,
  dropOffFromConversion,
  parseAnalyticsPeriod,
  pickBiggestOpportunity,
  ratio,
  uniqueOrUnknown,
} from "../lib/analytics/dashboard-aggregate.ts";
import {
  LOW_SAMPLE_THRESHOLD,
  UNATTRIBUTED_CHANNEL,
  UNATTRIBUTED_CHANNEL_LABEL,
} from "../lib/analytics/dashboard-types.ts";
import type {
  AttributionRow,
  FunnelEventRow,
  FunnelStep,
  GrowthEventRow,
} from "../lib/analytics/dashboard-types.ts";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import InternalAnalyticsDashboard from "../components/analytics/InternalAnalyticsDashboard.tsx";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SLUG_A = "23456789ABC";
const SLUG_B = "23456789ABD";
const VISITOR_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const VISITOR_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const VISITOR_C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const USER_C = "33333333-3333-4333-8333-333333333333";
const USER_D = "44444444-4444-4444-8444-444444444444";
const ADMIN_ID = "55555555-5555-4555-8555-555555555555";

const NOW = new Date("2026-08-22T18:00:00.000Z");
const IN_RANGE = "2026-08-20T12:00:00.000Z";
const OUT_OF_RANGE = "2026-07-01T12:00:00.000Z";

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function user(input: Partial<User>): User {
  return {
    id: "user",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "",
    ...input,
  } as User;
}

function funnel(
  event_type: string,
  extras: Partial<FunnelEventRow> & { metadata?: Record<string, unknown> } = {},
): FunnelEventRow {
  return {
    event_type,
    visitor_id: extras.visitor_id ?? null,
    user_id: extras.user_id ?? null,
    share_slug: extras.share_slug ?? null,
    metadata: extras.metadata ?? {},
    created_at: extras.created_at ?? IN_RANGE,
  };
}

function growth(
  event_type: string,
  extras: Partial<GrowthEventRow> & { metadata?: Record<string, unknown> } = {},
): GrowthEventRow {
  return {
    event_type,
    visitor_id: extras.visitor_id ?? null,
    share_slug: extras.share_slug ?? null,
    metadata: extras.metadata ?? {},
    created_at: extras.created_at ?? IN_RANGE,
  };
}

function attr(
  user_id: string,
  extras: Partial<AttributionRow> = {},
): AttributionRow {
  return {
    user_id,
    origin_kind: extras.origin_kind ?? "direct",
    share_channel: extras.share_channel ?? null,
    referrer_host: extras.referrer_host ?? null,
    utm_source: extras.utm_source ?? null,
    generation: extras.generation ?? 0,
    attributed_at: extras.attributed_at ?? IN_RANGE,
  };
}

function viralFixture() {
  return aggregateAnalyticsDashboard({
    period: "7d",
    periodStart: analyticsRangeStart("7d", NOW),
    now: NOW,
    funnelEvents: [
      funnel("landing_visit", {
        visitor_id: VISITOR_A,
        metadata: { origin_kind: "direct" },
      }),
      funnel("signup_completed", {
        visitor_id: VISITOR_A,
        user_id: USER_A,
        metadata: { origin_kind: "direct", attributed_to_share: false, generation: 0 },
      }),
      funnel("creation_started", { user_id: USER_A, metadata: { origin_kind: "direct" } }),
      funnel("creation_completed", { user_id: USER_A, metadata: { origin_kind: "direct" } }),
      funnel("preview_viewed", { user_id: USER_A, metadata: { origin_kind: "direct" } }),
      funnel("signup_completed", {
        visitor_id: VISITOR_B,
        user_id: USER_B,
        share_slug: SLUG_A,
        metadata: {
          origin_kind: "share",
          share_channel: "whatsapp",
          attributed_to_share: true,
          generation: 1,
        },
      }),
      funnel("creation_completed", {
        user_id: USER_B,
        metadata: { origin_kind: "share", share_channel: "whatsapp", attributed_to_share: true },
      }),
      funnel("signup_completed", {
        visitor_id: VISITOR_C,
        user_id: USER_C,
        share_slug: SLUG_B,
        metadata: {
          origin_kind: "share",
          share_channel: "copy_link",
          attributed_to_share: true,
          generation: 2,
        },
      }),
      funnel("premium_activated", {
        user_id: USER_B,
        share_slug: SLUG_A,
        metadata: {
          origin_kind: "share",
          share_channel: "whatsapp",
          attributed_to_share: true,
        },
      }),
    ],
    growthEvents: [
      growth("share_created", {
        share_slug: SLUG_A,
        metadata: { channel: "whatsapp", creator_user_id: USER_A },
      }),
      growth("share_opened", {
        visitor_id: VISITOR_B,
        share_slug: SLUG_A,
        metadata: { channel: "whatsapp" },
      }),
      growth("share_cta_clicked", {
        visitor_id: VISITOR_B,
        share_slug: SLUG_A,
        metadata: { channel: "whatsapp" },
      }),
      growth("share_created", {
        share_slug: SLUG_B,
        metadata: { channel: "copy_link", creator_user_id: USER_B },
      }),
      growth("share_opened", {
        visitor_id: VISITOR_C,
        share_slug: SLUG_B,
        metadata: { channel: "copy_link" },
      }),
    ],
    attributions: [
      attr(USER_A, { origin_kind: "direct", generation: 0 }),
      attr(USER_B, {
        origin_kind: "share",
        share_channel: "whatsapp",
        generation: 1,
      }),
      attr(USER_C, {
        origin_kind: "share",
        share_channel: "copy_link",
        generation: 2,
      }),
    ],
    shareOwners: [
      { share_slug: SLUG_A, creator_user_id: USER_A },
      { share_slug: SLUG_B, creator_user_id: USER_B },
    ],
    purchases: [
      {
        amount_mxn: 180,
        currency: "MXN",
        status: "completed",
        provider: "stripe",
        created_at: IN_RANGE,
        completed_at: IN_RANGE,
      },
    ],
  });
}

test("anonymous users are sent to login and ordinary users are denied", () => {
  const previousIds = process.env.METAPROM_ADMIN_USER_IDS;
  const previousEmails = process.env.METAPROM_ADMIN_EMAILS;
  delete process.env.METAPROM_ADMIN_USER_IDS;
  delete process.env.METAPROM_ADMIN_EMAILS;

  assert.equal(resolveAnalyticsAccess(null), "anonymous");
  assert.equal(analyticsAuthRedirect(null), ANALYTICS_LOGIN_PATH);
  assert.equal(analyticsAuthRedirect(undefined), ANALYTICS_LOGIN_PATH);

  const customer = user({ id: USER_A, email: "customer@example.com" });
  assert.equal(resolveAnalyticsAccess(customer), "denied");
  assert.equal(analyticsAuthRedirect(customer), ANALYTICS_DENIED_PATH);

  const admin = user({ id: ADMIN_ID, app_metadata: { role: "admin" } });
  assert.equal(resolveAnalyticsAccess(admin), "allowed");
  assert.equal(analyticsAuthRedirect(admin), null);

  process.env.METAPROM_ADMIN_USER_IDS = previousIds;
  process.env.METAPROM_ADMIN_EMAILS = previousEmails;
});

test("analytics route uses the existing admin gate and does not expose service role", () => {
  const page = readRepo("app/analytics/page.tsx");
  const data = readRepo("lib/analytics/dashboard-data.ts");
  const ui = readRepo("components/analytics/InternalAnalyticsDashboard.tsx");
  const nav = readRepo("components/Navbar.tsx");
  const footer = readRepo("components/landing/Footer.tsx");

  assert.match(page, /analyticsAuthRedirect/);
  assert.match(page, /getAnalyticsDashboard/);
  assert.match(page, /robots: \{ index: false, follow: false \}/);
  assert.match(page, /force-dynamic/);
  assert.match(data, /import "server-only"/);
  assert.match(data, /createAdminClient/);
  assert.match(data, /gte\("created_at"/);
  assert.match(data, /\.range\(/);
  assert.doesNotMatch(ui, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(ui, /createAdminClient/);
  assert.doesNotMatch(nav, /\/analytics/);
  assert.doesNotMatch(footer, /\/analytics/);
  assert.doesNotMatch(page, /gtag|GTM-|facebook\.net|pixel|tiktok/i);
});

test("period parser defaults to last 7 days and range filter excludes older rows", () => {
  assert.equal(parseAnalyticsPeriod(undefined), "7d");
  assert.equal(parseAnalyticsPeriod("today"), "today");
  assert.equal(parseAnalyticsPeriod("30d"), "30d");
  assert.equal(parseAnalyticsPeriod("all"), "all");
  assert.equal(parseAnalyticsPeriod("nope"), "7d");

  const start7 = analyticsRangeStart("7d", NOW);
  assert.equal(start7, "2026-08-15T18:00:00.000Z");
  const today = analyticsRangeStart("today", NOW);
  assert.equal(today, "2026-08-22T00:00:00.000Z");
  assert.equal(analyticsRangeStart("all", NOW), null);

  const dashboard = aggregateAnalyticsDashboard({
    period: "7d",
    periodStart: start7,
    now: NOW,
    funnelEvents: [
      funnel("landing_visit", {
        visitor_id: VISITOR_A,
        created_at: IN_RANGE,
        metadata: { origin_kind: "direct" },
      }),
      funnel("landing_visit", {
        visitor_id: VISITOR_B,
        created_at: OUT_OF_RANGE,
        metadata: { origin_kind: "direct" },
      }),
      funnel("signup_completed", {
        user_id: USER_A,
        created_at: OUT_OF_RANGE,
        metadata: { origin_kind: "direct" },
      }),
    ],
    growthEvents: [
      growth("share_created", {
        share_slug: SLUG_A,
        created_at: OUT_OF_RANGE,
        metadata: { channel: "whatsapp" },
      }),
    ],
    attributions: [],
    shareOwners: [],
    purchases: [],
  });

  assert.equal(dashboard.kpis.visitors, 1);
  assert.equal(dashboard.kpis.signups, 0);
  assert.equal(dashboard.kpis.sharesCreated, 0);
});

test("ratio and unique helpers never invent a rate from a zero or missing denominator", () => {
  assert.equal(ratio(8, 100), 0.08);
  assert.equal(ratio(0, 10), 0);
  assert.equal(ratio(4, 0), null);
  assert.equal(ratio(4, -1), null);
  assert.equal(dropOffFromConversion(0.082), 0.918);
  assert.equal(dropOffFromConversion(null), null);
  assert.equal(dropOffFromConversion(1.5), 0);
  assert.equal(uniqueOrUnknown([VISITOR_A, VISITOR_A, VISITOR_B], 3), 2);
  assert.equal(uniqueOrUnknown([null, null], 2), null);
  assert.equal(uniqueOrUnknown([], 0), 0);
});

test("K-factor is the product of the three published components", () => {
  const k = computeKFactor({
    sharesCreated: 21,
    creators: 50,
    shareVisits: 72,
    attributedSignups: 8,
  });
  assert.equal(k.sharesPerCreator, 21 / 50);
  assert.equal(k.visitsPerShare, 72 / 21);
  assert.equal(k.shareSignupRate, 8 / 72);
  assert.equal(k.k, (21 / 50) * (72 / 21) * (8 / 72));
  assert.ok(k.k !== null && Math.abs(k.k - 0.16) < 0.0001);
});

test("K-factor is INSUFFICIENT DATA when any component cannot be calculated", () => {
  assert.equal(
    computeKFactor({
      sharesCreated: 0,
      creators: 4,
      shareVisits: 0,
      attributedSignups: 0,
    }).k,
    null,
  );
  assert.equal(
    computeKFactor({
      sharesCreated: 3,
      creators: 0,
      shareVisits: 9,
      attributedSignups: 1,
    }).k,
    null,
  );
  assert.equal(
    computeKFactor({
      sharesCreated: 3,
      creators: 2,
      shareVisits: null,
      attributedSignups: 1,
    }).k,
    null,
  );
  const zeroSignup = computeKFactor({
    sharesCreated: 2,
    creators: 2,
    shareVisits: 4,
    attributedSignups: 0,
  });
  assert.equal(zeroSignup.k, 0);
});

test("zero-data dashboard uses 0 for observed counts and INSUFFICIENT DATA for rates", () => {
  const dashboard = aggregateAnalyticsDashboard({
    period: "7d",
    periodStart: analyticsRangeStart("7d", NOW),
    now: NOW,
    funnelEvents: [],
    growthEvents: [],
    attributions: [],
    shareOwners: [],
    purchases: [],
  });

  assert.equal(dashboard.kpis.visitors, 0);
  assert.equal(dashboard.kpis.signups, 0);
  assert.equal(dashboard.kpis.kFactor, null);
  assert.equal(dashboard.kpis.signupFromVisit, null);
  assert.equal(dashboard.biggestOpportunity.status, "insufficient");
  assert.equal(dashboard.shareEngine.visitsPerShare, null);
  assert.equal(dashboard.shareEngine.creatorOwnerMapComplete, true);
  assert.equal(dashboard.shareEngine.creatorsWhoShared, 0);
  assert.equal(dashboard.kFactor.k, null);
  assert.equal(dashboard.channels.length, 0);
  assert.equal(dashboard.shareChannels.length, 0);
  assert.equal(dashboard.premium.revenueAvailable, true);
  assert.equal(dashboard.premium.revenueMxn, 0);
  assert.equal(dashboard.recent.length, 0);
});

test("funnel conversion, drop-off, and biggest opportunity use the weakest calculable step", () => {
  const dashboard = aggregateAnalyticsDashboard({
    period: "7d",
    periodStart: analyticsRangeStart("7d", NOW),
    now: NOW,
    funnelEvents: [
      funnel("landing_visit", { visitor_id: VISITOR_A, metadata: { origin_kind: "direct" } }),
      funnel("landing_visit", { visitor_id: VISITOR_B, metadata: { origin_kind: "direct" } }),
      funnel("landing_visit", { visitor_id: VISITOR_C, metadata: { origin_kind: "direct" } }),
      funnel("signup_completed", {
        user_id: USER_A,
        visitor_id: VISITOR_A,
        metadata: { origin_kind: "direct" },
      }),
      funnel("creation_started", { user_id: USER_A, metadata: { origin_kind: "direct" } }),
      funnel("creation_completed", { user_id: USER_A, metadata: { origin_kind: "direct" } }),
      funnel("preview_viewed", { user_id: USER_A, metadata: { origin_kind: "direct" } }),
    ],
    growthEvents: [
      growth("share_created", {
        share_slug: SLUG_A,
        metadata: { channel: "whatsapp", creator_user_id: USER_A },
      }),
      growth("share_opened", {
        visitor_id: VISITOR_B,
        share_slug: SLUG_A,
        metadata: { channel: "whatsapp" },
      }),
      growth("share_opened", {
        visitor_id: VISITOR_C,
        share_slug: SLUG_A,
        metadata: { channel: "whatsapp" },
      }),
    ],
    attributions: [attr(USER_A)],
    shareOwners: [{ share_slug: SLUG_A, creator_user_id: USER_A }],
  });

  const visit = dashboard.funnel.find((step) => step.id === "visitors");
  const signup = dashboard.funnel.find((step) => step.id === "signups");
  assert.equal(visit?.count, 3);
  assert.equal(signup?.count, 1);
  assert.equal(signup?.conversionFromPrevious, 1 / 3);
  assert.ok(signup?.dropOffFromPrevious !== null && Math.abs(signup.dropOffFromPrevious - 2 / 3) < 1e-9);

  assert.equal(dashboard.biggestOpportunity.status, "ok");
  if (dashboard.biggestOpportunity.status === "ok") {
    assert.equal(dashboard.biggestOpportunity.label, "SHARE OPEN → CTA");
    assert.equal(dashboard.biggestOpportunity.conversion, 0);
    assert.equal(dashboard.biggestOpportunity.denominator, 2);
    assert.equal(dashboard.biggestOpportunity.lowSample, true);
  }
});

test("viral fixture: share engine, channels, generations, premium attribution, K", () => {
  const dashboard = viralFixture();

  assert.equal(dashboard.kpis.visitors, 1);
  assert.equal(dashboard.kpis.signups, 3);
  assert.equal(dashboard.kpis.creators, 2);
  assert.equal(dashboard.kpis.sharesCreated, 2);
  assert.equal(dashboard.kpis.shareOpens, 2);
  assert.equal(dashboard.kpis.shareCtaClicks, 1);
  assert.equal(dashboard.kpis.premiumCustomers, 1);

  assert.equal(dashboard.shareEngine.creatorsWhoShared, 2);
  assert.equal(dashboard.shareEngine.creatorOwnerMapComplete, true);
  assert.equal(dashboard.shareEngine.attributedSignups, 2);
  assert.equal(dashboard.shareEngine.premiumFromShare, 1);
  assert.equal(dashboard.shareEngine.uniqueVisitorsFromShares, 2);
  assert.equal(dashboard.kFactor.sharesPerCreator, 1);
  assert.equal(dashboard.kFactor.visitsPerShare, 1);
  assert.equal(dashboard.kFactor.shareSignupRate, 1);
  assert.equal(dashboard.kFactor.k, 1);

  const whatsapp = dashboard.shareChannels.find((row) => row.channel === "whatsapp");
  const copy = dashboard.shareChannels.find((row) => row.channel === "copy_link");
  assert.equal(whatsapp?.shares, 1);
  assert.equal(whatsapp?.opens, 1);
  assert.equal(whatsapp?.ctaClicks, 1);
  assert.equal(whatsapp?.attributedSignups, 1);
  assert.equal(whatsapp?.premium, 1);
  assert.equal(copy?.opens, 1);
  assert.equal(copy?.ctaClicks, 0);
  assert.equal(copy?.premium, 0);

  assert.equal(dashboard.generations[0]?.attributedUsers, 1);
  assert.equal(dashboard.generations[1]?.attributedUsers, 1);
  assert.equal(dashboard.generations[2]?.attributedUsers, 1);
  assert.equal(dashboard.generations[3]?.attributedUsers, 0);
  assert.equal(dashboard.generations[0]?.creators, 1);
  assert.equal(dashboard.generations[1]?.creators, 1);
  assert.equal(dashboard.generations[2]?.creators, 0);
  assert.equal(dashboard.generations[1]?.premium, 1);
  assert.equal(dashboard.generations[0]?.shares, 1);
  assert.equal(dashboard.generations[1]?.shares, 1);

  assert.equal(dashboard.premium.fromShare, 1);
  assert.equal(dashboard.premium.fromNonShare, 0);
  assert.equal(dashboard.premium.revenueMxn, 180);

  const direct = dashboard.channels.find((row) => row.channel === "direct");
  const wa = dashboard.channels.find((row) => row.channel === "whatsapp");
  assert.equal(direct?.visitors, 1);
  assert.equal(direct?.signups, 1);
  assert.equal(wa?.signups, 1);
  assert.equal(wa?.shareOpens, 1);
});

test("generation 3+ rolls up recursive share ancestry without identities", () => {
  const dashboard = aggregateAnalyticsDashboard({
    period: "all",
    periodStart: null,
    now: NOW,
    funnelEvents: [
      funnel("creation_completed", { user_id: USER_D, metadata: { origin_kind: "share" } }),
      funnel("premium_activated", {
        user_id: USER_D,
        metadata: { origin_kind: "share", attributed_to_share: true },
      }),
    ],
    growthEvents: [
      growth("share_created", {
        share_slug: SLUG_A,
        metadata: { channel: "whatsapp", creator_user_id: USER_D },
      }),
    ],
    attributions: [attr(USER_D, { origin_kind: "share", generation: 4 })],
    shareOwners: [{ share_slug: SLUG_A, creator_user_id: USER_D }],
  });

  assert.equal(dashboard.generations[3]?.bucket, "3+");
  assert.equal(dashboard.generations[3]?.attributedUsers, 1);
  assert.equal(dashboard.generations[3]?.creators, 1);
  assert.equal(dashboard.generations[3]?.shares, 1);
  assert.equal(dashboard.generations[3]?.premium, 1);
});

test("acquisition channels only appear from stored fields; facebook is not invented", () => {
  assert.equal(acquisitionChannelFromFields({ origin_kind: "direct" }), "direct");
  assert.equal(
    acquisitionChannelFromFields({ origin_kind: "share", share_channel: "wa" }),
    "whatsapp",
  );
  assert.equal(
    acquisitionChannelFromFields({
      origin_kind: "utm",
      utm_source: "facebook",
    }),
    "facebook",
  );
  assert.equal(
    acquisitionChannelFromFields({
      origin_kind: "organic",
      referrer_host: "www.linkedin.com",
    }),
    "linkedin",
  );
  assert.equal(
    acquisitionChannelFromFields({ origin_kind: "organic", referrer_host: "news.ycombinator.com" }),
    "organic",
  );

  const dashboard = aggregateAnalyticsDashboard({
    period: "7d",
    periodStart: analyticsRangeStart("7d", NOW),
    now: NOW,
    funnelEvents: [
      funnel("landing_visit", {
        visitor_id: VISITOR_A,
        metadata: { origin_kind: "direct" },
      }),
    ],
    growthEvents: [],
    attributions: [],
    shareOwners: [],
  });

  assert.deepEqual(
    dashboard.channels.map((row) => row.channel),
    ["direct"],
  );
  assert.equal(
    dashboard.channels.some((row) => row.channel === "facebook"),
    false,
  );

  const facebook = aggregateAnalyticsDashboard({
    period: "7d",
    periodStart: analyticsRangeStart("7d", NOW),
    now: NOW,
    funnelEvents: [
      funnel("landing_visit", {
        visitor_id: VISITOR_A,
        metadata: { origin_kind: "organic", referrer_host: "facebook.com" },
      }),
    ],
    growthEvents: [],
    attributions: [],
    shareOwners: [],
  });
  assert.equal(facebook.channels.find((row) => row.channel === "facebook")?.visitors, 1);
});

test("client payload never includes PII or identifiers from source events", () => {
  const dashboard = aggregateAnalyticsDashboard({
    period: "7d",
    periodStart: analyticsRangeStart("7d", NOW),
    now: NOW,
    funnelEvents: [
      funnel("landing_visit", {
        visitor_id: VISITOR_A,
        metadata: {
          origin_kind: "direct",
          email: "hidden@example.com",
          prompt: "secret shop photo",
        },
      }),
      funnel("signup_completed", {
        user_id: USER_A,
        visitor_id: VISITOR_A,
        metadata: { origin_kind: "direct", name: "Ada", phone: "+525512345678" },
      }),
    ],
    growthEvents: [
      growth("share_created", {
        share_slug: SLUG_A,
        metadata: { channel: "whatsapp", creator_user_id: USER_A, email: "owner@example.com" },
      }),
    ],
    attributions: [attr(USER_A)],
    shareOwners: [{ share_slug: SLUG_A, creator_user_id: USER_A }],
  });

  const json = JSON.stringify(dashboard);
  assert.equal(dashboardPayloadContainsPii(dashboard), false);
  assert.doesNotMatch(json, /hidden@example.com/);
  assert.doesNotMatch(json, /owner@example.com/);
  assert.doesNotMatch(json, /secret shop photo/);
  assert.doesNotMatch(json, /\+525512345678/);
  assert.doesNotMatch(json, /visitor_id/);
  assert.doesNotMatch(json, /user_id/);
  assert.doesNotMatch(json, /parent_user/);
  assert.doesNotMatch(json, /23456789ABC/);
  assert.ok(dashboard.recent.every((item) => !item.eventType.includes("@")));
  assert.equal(
    dashboard.recent.every((item) => ["at", "eventType", "channel"].every((key) => key in item)),
    true,
  );
});

test("biggest-opportunity helper skips transitions that cannot be calculated", () => {
  const funnel: FunnelStep[] = [
    {
      id: "visitors",
      label: "Visitors",
      count: 0,
      conversionFromPrevious: null,
      dropOffFromPrevious: null,
    },
    {
      id: "signups",
      label: "Signups",
      count: 0,
      conversionFromPrevious: null,
      dropOffFromPrevious: null,
    },
  ];
  assert.equal(pickBiggestOpportunity(funnel).status, "insufficient");
});

test("revenue is omitted when purchase records are unavailable", () => {
  const dashboard = aggregateAnalyticsDashboard({
    period: "7d",
    periodStart: analyticsRangeStart("7d", NOW),
    now: NOW,
    funnelEvents: [],
    growthEvents: [],
    attributions: [],
    shareOwners: [],
    purchases: null,
  });
  assert.equal(dashboard.premium.revenueAvailable, false);
  assert.equal(dashboard.premium.revenueMxn, null);
});

function reviewLikeDashboard() {
  return aggregateAnalyticsDashboard({
    period: "7d",
    periodStart: analyticsRangeStart("7d", NOW),
    now: NOW,
    funnelEvents: [
      funnel("landing_visit", {
        visitor_id: VISITOR_A,
        metadata: { origin_kind: "direct" },
      }),
      funnel("landing_visit", {
        visitor_id: VISITOR_B,
        metadata: { origin_kind: "direct" },
      }),
      funnel("landing_visit", {
        visitor_id: VISITOR_C,
        metadata: { origin_kind: "direct" },
      }),
      funnel("landing_visit", {
        visitor_id: USER_D,
        metadata: { origin_kind: "organic", referrer_host: "facebook.com" },
      }),
    ],
    growthEvents: [
      growth("share_created", {
        share_slug: SLUG_A,
        metadata: { channel: "copy_link", creator_user_id: USER_A },
      }),
      growth("share_opened", {
        share_slug: SLUG_A,
        metadata: {},
      }),
    ],
    attributions: [],
    shareOwners: [],
    purchases: [
      {
        amount_mxn: 180,
        currency: "MXN",
        status: "completed",
        provider: "stripe",
        created_at: IN_RANGE,
        completed_at: IN_RANGE,
      },
    ],
  });
}

test("KPI unavailable text is not semantically truncated", () => {
  const ui = readRepo("components/analytics/InternalAnalyticsDashboard.tsx");
  const kpi = ui.slice(ui.indexOf("function Kpi"), ui.indexOf("function FunnelView"));
  assert.match(kpi, /whitespace-normal break-words/);
  assert.match(kpi, /flex min-w-0 flex-col/);
  assert.doesNotMatch(kpi, /truncate text-xs/);
  assert.doesNotMatch(kpi, /INSUFFICI…/);

  const html = renderToStaticMarkup(
    createElement(InternalAnalyticsDashboard, { data: reviewLikeDashboard() }),
  );
  assert.match(html, /INSUFFICIENT DATA/);
  assert.doesNotMatch(html, /INSUFFICI…/);
  assert.doesNotMatch(html, /INSUFFICI&hellip;/);
  assert.doesNotMatch(html, /from signup INSUFFICI/);
});

test("low-sample state qualifies Biggest Opportunity without hiding the rate", () => {
  assert.ok(LOW_SAMPLE_THRESHOLD >= 5 && LOW_SAMPLE_THRESHOLD <= 20);

  const dashboard = reviewLikeDashboard();
  assert.equal(dashboard.kpis.visitors, 4);
  assert.equal(dashboard.biggestOpportunity.status, "ok");
  if (dashboard.biggestOpportunity.status === "ok") {
    assert.equal(dashboard.biggestOpportunity.label, "VISIT → SIGNUP");
    assert.equal(dashboard.biggestOpportunity.conversion, 0);
    assert.equal(dashboard.biggestOpportunity.denominator, 4);
    assert.equal(dashboard.biggestOpportunity.lowSample, true);
    assert.ok(dashboard.biggestOpportunity.denominator < LOW_SAMPLE_THRESHOLD);
  }

  const html = renderToStaticMarkup(
    createElement(InternalAnalyticsDashboard, { data: dashboard }),
  );
  assert.match(html, /VISIT → SIGNUP/);
  assert.match(html, /0\.0%/);
  assert.match(html, /Low sample/);
  assert.match(html, /4 visitors/);

  const plenty: FunnelStep[] = [
    {
      id: "visitors",
      label: "Visitors",
      count: LOW_SAMPLE_THRESHOLD,
      conversionFromPrevious: null,
      dropOffFromPrevious: null,
    },
    {
      id: "signups",
      label: "Signups",
      count: 1,
      conversionFromPrevious: 1 / LOW_SAMPLE_THRESHOLD,
      dropOffFromPrevious: 1 - 1 / LOW_SAMPLE_THRESHOLD,
    },
  ];
  const enough = pickBiggestOpportunity(plenty);
  assert.equal(enough.status, "ok");
  if (enough.status === "ok") {
    assert.equal(enough.lowSample, false);
    assert.equal(enough.denominator, LOW_SAMPLE_THRESHOLD);
  }
});

test("incomplete creator owner map does not imply sharing creators sit in a 0-creator population", () => {
  const dashboard = reviewLikeDashboard();
  assert.equal(dashboard.shareEngine.creators, 0);
  assert.equal(dashboard.shareEngine.sharesCreated, 1);
  assert.equal(dashboard.shareEngine.creatorOwnerMapComplete, false);
  assert.equal(dashboard.shareEngine.creatorsWhoShared, null);
  assert.equal(dashboard.shareEngine.shareRate, null);
  assert.equal(dashboard.shareEngine.sharesPerSharingCreator, null);

  const html = renderToStaticMarkup(
    createElement(InternalAnalyticsDashboard, { data: dashboard }),
  );
  assert.match(html, /Creators \(creation completed\)/);
  assert.match(html, /Creator owner map incomplete/);
  assert.doesNotMatch(html, /Creators who shared<\/p>\s*<p[^>]*>1</);
});

test("unattributed channel bucket appears only for Share events with no stored channel", () => {
  const dashboard = reviewLikeDashboard();
  const copy = dashboard.shareChannels.find((row) => row.channel === "copy_link");
  const unknown = dashboard.shareChannels.find((row) => row.channel === UNATTRIBUTED_CHANNEL);
  assert.equal(copy?.shares, 1);
  assert.equal(copy?.opens, 0);
  assert.equal(unknown?.shares, 0);
  assert.equal(unknown?.opens, 1);

  const acquisitionUnknown = dashboard.channels.find(
    (row) => row.channel === UNATTRIBUTED_CHANNEL,
  );
  assert.equal(acquisitionUnknown?.shareOpens, 1);
  assert.equal(acquisitionUnknown?.shares, 0);

  const viral = viralFixture();
  assert.equal(
    viral.shareChannels.some((row) => row.channel === UNATTRIBUTED_CHANNEL),
    false,
  );

  const html = renderToStaticMarkup(
    createElement(InternalAnalyticsDashboard, { data: dashboard }),
  );
  assert.match(html, new RegExp(UNATTRIBUTED_CHANNEL_LABEL));
});

test("channel totals reconcile to Share Engine observed counts", () => {
  const dashboard = reviewLikeDashboard();
  const shareOpens = dashboard.shareChannels.reduce((sum, row) => sum + row.opens, 0);
  const shares = dashboard.shareChannels.reduce((sum, row) => sum + row.shares, 0);
  const ctas = dashboard.shareChannels.reduce((sum, row) => sum + row.ctaClicks, 0);
  const acquisitionOpens = dashboard.channels.reduce((sum, row) => sum + row.shareOpens, 0);
  const acquisitionShares = dashboard.channels.reduce((sum, row) => sum + row.shares, 0);

  assert.equal(shareOpens, dashboard.shareEngine.shareOpens);
  assert.equal(shares, dashboard.shareEngine.sharesCreated);
  assert.equal(ctas, dashboard.shareEngine.shareCtaClicks);
  assert.equal(acquisitionOpens, dashboard.shareEngine.shareOpens);
  assert.equal(acquisitionShares, dashboard.shareEngine.sharesCreated);
  assert.equal(dashboard.shareEngine.shareOpens, 1);
  assert.equal(dashboard.shareEngine.sharesCreated, 1);
});

test("zero-denominator funnel keeps counts and does not fabricate rates", () => {
  const dashboard = reviewLikeDashboard();
  const signups = dashboard.funnel.find((step) => step.id === "signups");
  const started = dashboard.funnel.find((step) => step.id === "creation_started");
  const preview = dashboard.funnel.find((step) => step.id === "preview_viewed");
  const shares = dashboard.funnel.find((step) => step.id === "shares_created");
  const opens = dashboard.funnel.find((step) => step.id === "share_opens");

  assert.equal(signups?.count, 0);
  assert.equal(signups?.conversionFromPrevious, 0);
  assert.equal(started?.count, 0);
  assert.equal(started?.conversionFromPrevious, null);
  assert.equal(preview?.count, 0);
  assert.equal(shares?.count, 1);
  assert.equal(shares?.conversionFromPrevious, null);
  assert.equal(opens?.count, 1);
  assert.equal(opens?.conversionFromPrevious, 1);

  const html = renderToStaticMarkup(
    createElement(InternalAnalyticsDashboard, { data: dashboard }),
  );
  assert.match(html, />—</);
  assert.doesNotMatch(
    html,
    /Creation Started[\s\S]{0,200}INSUFFICIENT DATA conversion/,
  );
});

test("human-cleanup dashboard payload still contains no PII", () => {
  const dashboard = reviewLikeDashboard();
  const html = renderToStaticMarkup(
    createElement(InternalAnalyticsDashboard, { data: dashboard }),
  );
  assert.equal(dashboardPayloadContainsPii(dashboard), false);
  assert.doesNotMatch(JSON.stringify(dashboard), /visitor_id|user_id|@|facebook\.net/i);
  assert.doesNotMatch(html, /@gmail|visitor_id|user_id|prompt/i);
  assert.match(html, /Swipe horizontally →/);
  assert.match(html, /md:hidden/);
  assert.match(html, /Analytics \/ entitlement signal/);
  assert.match(html, /Authoritative Stripe completed purchases/);
  assert.match(html, /facebook/i);
});
