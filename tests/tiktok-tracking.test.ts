/**
 * TikTok Pixel + Events API — focused source contracts and helpers.
 *
 * Run: npm run test:tiktok
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { persistPaymentResult } from "../lib/payments/persistence.ts";
import type { PaymentWebhookResult } from "../lib/payments/types.ts";
import { isNewAuthUser } from "../lib/analytics/events.ts";
import { trackTikTokServerEvent } from "../lib/tiktok/events-api.ts";
import {
  shouldEmitTikTokOnFunnelInsert,
  tiktokCompleteRegistrationEventId,
  tiktokInitiateCheckoutEventId,
  tiktokLandingViewContentEventId,
  tiktokPurchaseEventId,
} from "../lib/tiktok/ids.ts";
import { resolveTikTokPurchaseMoney } from "../lib/tiktok/purchase-value.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const USER_ID = "11111111-1111-4111-8111-111111111111";

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

process.env.STRIPE_PRICE_ID_COMMERCIAL_1 = "price_test_commercial_1";
process.env.STRIPE_PRICE_ID_COMMERCIAL_5 = "price_test_commercial_5";
process.env.STRIPE_PRICE_ID_COMMERCIAL_10 = "price_test_commercial_10";
process.env.STRIPE_PRICE_ID_COMMERCIAL_20 = "price_test_commercial_20";
process.env.STRIPE_PRICE_ID_ASSETS_10 = "price_test_assets_10";
process.env.STRIPE_PRICE_ID_ASSETS_25 = "price_test_assets_25";
process.env.STRIPE_PRICE_ID_ASSETS_50 = "price_test_assets_50";
process.env.STRIPE_PRICE_ID_ASSETS_100 = "price_test_assets_100";

test("pixel loader exists once and does not identify or send identity fields", () => {
  const layout = readRepo("app/layout.tsx");
  const pixel = readRepo("components/analytics/TikTokPixel.tsx");
  const browser = readRepo("lib/tiktok/browser.ts");
  const eventsApi = readRepo("lib/tiktok/events-api.ts");
  const analyticsPage = readRepo("app/analytics/page.tsx");
  const analyticsUi = readRepo("components/analytics/InternalAnalyticsDashboard.tsx");

  assert.match(layout, /import TikTokPixel/);
  assert.match(layout, /<TikTokPixel \/>/);
  assert.equal((layout.match(/<TikTokPixel/g) ?? []).length, 1);
  assert.match(pixel, /id="tiktok-pixel"/);
  assert.match(pixel, /ttq\.load\(/);
  assert.match(pixel, /ttq\.page\(\)/);
  assert.equal((pixel.match(/ttq\.load\(/g) ?? []).length, 1);
  assert.doesNotMatch(pixel, /ttq\.identify\(/);
  assert.doesNotMatch(browser, /ttq\.identify\(/);
  assert.doesNotMatch(`${pixel}\n${browser}\n${eventsApi}`, /"email"\s*:|"phone"\s*:|"external_id"\s*:/);
  assert.match(pixel, /pathname === "\/analytics"/);
  assert.doesNotMatch(analyticsPage, /TikTokPixel|ttq\.|analytics\.tiktok/);
  assert.doesNotMatch(analyticsUi, /TikTokPixel|ttq\.|analytics\.tiktok/);
});

test("ViewContent is scoped to landing_visit, not preview or /planes", () => {
  const landing = readRepo("components/analytics/LandingVisitBeacon.tsx");
  const home = readRepo("app/page.tsx");
  const planes = readRepo("app/planes/page.tsx");
  const previewHook = readRepo("components/analytics/use-preview-viewed.ts");

  assert.match(home, /LandingVisitBeacon/);
  assert.match(landing, /ViewContent/);
  assert.match(landing, /tiktokLandingViewContentEventId/);
  assert.match(landing, /tiktokLandingViewContentEventId\(visitorId, sessionKey\)/);
  assert.doesNotMatch(planes, /ViewContent/);
  assert.doesNotMatch(previewHook, /ViewContent|trackTikTokPixelEvent/);
});

test("CompleteRegistration is new signup only and uses signup_completed event_id", () => {
  const callback = readRepo("app/auth/callback/route.ts");
  assert.match(callback, /recordSignupCompleted/);
  assert.match(callback, /shouldEmitTikTokOnFunnelInsert\(signupResult\)/);
  assert.match(callback, /CompleteRegistration/);
  assert.match(callback, /tiktokCompleteRegistrationEventId\(user\.id\)/);
  assert.doesNotMatch(callback, /ttq\.identify/);

  const now = Date.parse("2026-08-25T20:00:00.000Z");
  assert.equal(isNewAuthUser("2026-08-25T19:59:00.000Z", now), true);
  assert.equal(isNewAuthUser("2026-08-25T12:00:00.000Z", now), false);
  assert.equal(shouldEmitTikTokOnFunnelInsert("skipped"), false);
  assert.equal(shouldEmitTikTokOnFunnelInsert("inserted"), true);
  assert.equal(
    tiktokCompleteRegistrationEventId(USER_ID),
    `signup_completed:${USER_ID}`,
  );
});

test("InitiateCheckout browser and server share checkout_started event_id after successful checkout", () => {
  const createCheckout = readRepo("lib/payments/create-checkout-session.ts");
  const button = readRepo("components/pricing/PackagePurchaseButton.tsx");
  const studio = readRepo("lib/studio-creation.ts");

  assert.match(createCheckout, /from\("purchases"\)[\s\S]*insert[\s\S]*trackTikTokServerEvent/);
  assert.match(createCheckout, /InitiateCheckout/);
  assert.match(createCheckout, /tiktokInitiateCheckoutEventId\(purchase\.id\)/);
  assert.match(button, /if \(!response\.ok\)/);
  assert.match(button, /trackTikTokInitiateCheckoutPixel[\s\S]*redirectUrl/);
  assert.match(studio, /if \(!checkoutResponse\.ok\)/);
  assert.match(studio, /trackTikTokInitiateCheckoutPixel[\s\S]*redirectUrl/);
  assert.equal(tiktokInitiateCheckoutEventId("99"), "checkout_started:99");
  assert.equal(
    tiktokLandingViewContentEventId("vid", "sess"),
    "landing_visit:vid:sess",
  );
});

test("Purchase uses persistPaymentResult completed + inserted event_id, not success UI", () => {
  const persistence = readRepo("lib/payments/persistence.ts");
  const webhook = readRepo("app/api/payments/webhook/route.ts");
  const statusPage = readRepo("components/pricing/PackagePurchaseStatus.tsx");
  const stripe = readRepo("lib/payments/providers/stripe.ts");

  assert.match(persistence, /emitTikTokPurchaseIfNew/);
  assert.match(persistence, /shouldEmitTikTokOnFunnelInsert/);
  assert.match(persistence, /tiktokPurchaseEventId/);
  assert.match(persistence, /chargedAmountTotal/);
  assert.match(stripe, /amount_total/);
  assert.match(stripe, /chargedAmountTotal/);
  assert.doesNotMatch(webhook, /trackTikTokServerEvent/);
  assert.doesNotMatch(statusPage, /trackTikTok|ttq\.track/);
  assert.doesNotMatch(statusPage, /recordPurchaseCompleted/);
  assert.equal(tiktokPurchaseEventId("42"), "purchase_completed:42");
  assert.equal(shouldEmitTikTokOnFunnelInsert("duplicate"), false);
  assert.equal(shouldEmitTikTokOnFunnelInsert("inserted"), true);
});

test("OXXO awaiting_payment is not Purchase; async completed can be", () => {
  const persistence = readRepo("lib/payments/persistence.ts");
  const stripe = readRepo("lib/payments/providers/stripe.ts");
  assert.match(stripe, /async_payment_succeeded/);
  assert.match(persistence, /result\.status === "completed"/);
  assert.match(persistence, /emitTikTokPurchaseIfNew/);
  const oxxoBranch = persistence.slice(
    persistence.indexOf('status: result.status'),
  );
  assert.match(oxxoBranch, /if \(result\.status === "completed"\)/);
});

test("Stripe Purchase value uses charged amount_total, not catalog displayPrice", () => {
  const promoted = resolveTikTokPurchaseMoney({
    providerId: "stripe",
    chargedAmountTotal: 15000,
    chargedCurrency: "mxn",
    catalogAmountMajor: 180,
    catalogCurrency: "MXN",
  });
  assert.deepEqual(promoted, { value: 150, currency: "MXN" });

  const missingStripeAmount = resolveTikTokPurchaseMoney({
    providerId: "stripe",
    chargedAmountTotal: null,
    chargedCurrency: "mxn",
    catalogAmountMajor: 180,
    catalogCurrency: "MXN",
  });
  assert.equal(missingStripeAmount, null);

  const mockCharge = resolveTikTokPurchaseMoney({
    providerId: "mock",
    catalogAmountMajor: 180,
    catalogCurrency: "MXN",
  });
  assert.deepEqual(mockCharge, { value: 180, currency: "MXN" });
});

test("Events API is fail-open, server-only, and omits identity fields", async () => {
  const eventsApi = readRepo("lib/tiktok/events-api.ts");
  assert.match(eventsApi, /import "server-only"/);
  assert.match(eventsApi, /open_api\/v1\.3\/event\/track/);
  assert.doesNotMatch(eventsApi, /TIKTOK_EVENTS_API_ACCESS_TOKEN=sk/);
  assert.doesNotMatch(readRepo("lib/tiktok/browser.ts"), /TIKTOK_EVENTS_API_ACCESS_TOKEN/);
  assert.doesNotMatch(readRepo("components/analytics/TikTokPixel.tsx"), /TIKTOK_EVENTS_API_ACCESS_TOKEN/);

  const previousPixel = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
  const previousToken = process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN;
  process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID = "TESTPIXELID01";
  process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN = "test-access-token";

  let captured: { url: string; init: RequestInit } | null = null;
  try {
    const sent = await trackTikTokServerEvent({
      event: "Purchase",
      eventId: "purchase_completed:42",
      pageUrl: "/planes/compra",
      user: { ttclid: "E0TESTTTCLID001", ttp: "cookie-ttp" },
      properties: { value: 150, currency: "MXN", contentId: "commercial_1" },
      fetchImpl: async (url, init) => {
        captured = { url: String(url), init: init ?? {} };
        return new Response(JSON.stringify({ code: 0 }), { status: 200 });
      },
    });
    assert.equal(sent, "sent");
    assert.match(captured?.url ?? "", /open_api\/v1\.3\/event\/track/);
    const body = String(captured?.init.body ?? "");
    assert.match(body, /"event":"Purchase"/);
    assert.match(body, /"event_id":"purchase_completed:42"/);
    assert.match(body, /"ttclid":"E0TESTTTCLID001"/);
    assert.doesNotMatch(body, /"email"|"phone"|"external_id"/);
    assert.doesNotMatch(body, /test-access-token/);

    const failed = await trackTikTokServerEvent({
      event: "CompleteRegistration",
      eventId: "signup_completed:user",
      fetchImpl: async () => {
        throw new Error("network down");
      },
    });
    assert.equal(failed, "failed");

    const httpFail = await trackTikTokServerEvent({
      event: "InitiateCheckout",
      eventId: "checkout_started:1",
      fetchImpl: async () => new Response("nope", { status: 500 }),
    });
    assert.equal(httpFail, "failed");
  } finally {
    if (previousPixel === undefined) delete process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
    else process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID = previousPixel;
    if (previousToken === undefined) delete process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN;
    else process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN = previousToken;
  }
});

test("TikTok failure cannot break payment fulfillment", async () => {
  const previousPixel = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
  const previousToken = process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN;
  process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID = "TESTPIXELID01";
  process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN = "test-access-token";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error("tiktok down");
  }) as typeof fetch;

  type PurchaseRow = {
    id: number;
    user_id: string;
    asset_id: null;
    product_id: string;
    status: string;
    metadata: Record<string, unknown>;
    provider: string;
    provider_reference: string;
    completed_at: string | null;
  };

  const purchase: PurchaseRow = {
    id: 42,
    user_id: USER_ID,
    asset_id: null,
    product_id: "commercial_1",
    status: "pending",
    metadata: {},
    provider: "stripe",
    provider_reference: "cs_test_session_1",
    completed_at: null,
  };
  const grants: unknown[] = [];

  const supabase = {
    from(table: string) {
      if (table === "purchases") {
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      async maybeSingle() {
                        return { data: purchase, error: null };
                      },
                    };
                  },
                };
              },
            };
          },
          update(values: Partial<PurchaseRow>) {
            return {
              async eq() {
                Object.assign(purchase, values);
                return { error: null };
              },
            };
          },
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
    async rpc(name: string, args: Record<string, unknown>) {
      if (name === "grant_package_entitlement") {
        grants.push(args);
        return { data: true, error: null };
      }
      throw new Error(name);
    },
  };

  try {
    const result: PaymentWebhookResult = {
      sessionId: "cs_test_session_1",
      purchaseId: "42",
      status: "completed",
      stripePriceId: "price_test_commercial_1",
      stripeUserId: USER_ID,
      stripeAssetId: "",
      chargedAmountTotal: 18000,
      chargedCurrency: "mxn",
    };
    const persisted = await persistPaymentResult(
      supabase as never,
      "stripe",
      result,
    );
    assert.equal(persisted?.status, "completed");
    assert.equal(grants.length, 1);
    assert.equal(purchase.status, "completed");
  } finally {
    globalThis.fetch = originalFetch;
    if (previousPixel === undefined) delete process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
    else process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID = previousPixel;
    if (previousToken === undefined) delete process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN;
    else process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN = previousToken;
  }
});

test("env example names placeholders only and access token stays server-only", () => {
  const example = readRepo(".env.example");
  assert.match(example, /NEXT_PUBLIC_TIKTOK_PIXEL_ID=/);
  assert.match(example, /TIKTOK_EVENTS_API_ACCESS_TOKEN=/);
  assert.match(example, /TIKTOK_PIXEL_ID=/);
  assert.doesNotMatch(example, /DA75LSRC77U72JPLUMGG/);
  assert.doesNotMatch(example, /ACCESS_TOKEN=.+/);
});
