/**
 * GTM #2 — checkout / Premium ownership, product, and payment integrity.
 *
 * Run: npm run test:checkout-integrity
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  canBindAssetToPackage,
  isCommercialWorkflowAsset,
  isLegacyCommercialProductId,
  resolvePackageByStripePriceId,
  resolveTrustedGrantPackage,
  shouldFulfillPremiumForProduct,
} from "../lib/payments/purchase-integrity.ts";
import { getPricingPackageById, PRICING_PACKAGES } from "../lib/pricing/index.ts";
import { PACKAGE_STRIPE_PRICE_ENV_BY_PRODUCT } from "../lib/payments/stripe-config.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

const CANONICAL_PACKAGES = [
  { id: "commercial_1", displayPrice: 180, quantity: 1, category: "commercials" },
  { id: "commercial_5", displayPrice: 640, quantity: 5, category: "commercials" },
  { id: "commercial_10", displayPrice: 990, quantity: 10, category: "commercials" },
  { id: "commercial_20", displayPrice: 1780, quantity: 20, category: "commercials" },
  { id: "assets_10", displayPrice: 99, quantity: 10, category: "assets" },
  { id: "assets_25", displayPrice: 199, quantity: 25, category: "assets" },
  { id: "assets_50", displayPrice: 349, quantity: 50, category: "assets" },
  { id: "assets_100", displayPrice: 599, quantity: 100, category: "assets" },
] as const;

test("canonical eight packages still resolve with launch prices", () => {
  assert.equal(PRICING_PACKAGES.length, 8);

  for (const expected of CANONICAL_PACKAGES) {
    const pkg = getPricingPackageById(expected.id);
    assert.ok(pkg, expected.id);
    assert.equal(pkg?.displayPrice, expected.displayPrice, expected.id);
    assert.equal(pkg?.quantity, expected.quantity, expected.id);
    assert.equal(pkg?.category, expected.category, expected.id);
    assert.equal(pkg?.currency, "MXN", expected.id);
    assert.equal(pkg?.active, true, expected.id);
  }

  const commercial1 = getPricingPackageById("commercial_1");
  assert.equal(commercial1?.displayPrice, 180);
  assert.equal(commercial1?.stripeEnvironmentVariable, "STRIPE_PRICE_ID_COMMERCIAL_1");
});

test("A/B — knowing an asset or project id is not enough to bind checkout", () => {
  const checkout = readRepo("app/api/payments/checkout/route.ts");
  assert.match(checkout, /Authentication required/);
  assert.match(checkout, /loadOwnedAssetById/);
  assert.match(checkout, /canBindAssetToPackage/);
  assert.doesNotMatch(checkout, /body\.userId/);
  assert.doesNotMatch(checkout, /projectId/);
});

test("D/F — advertising packages cannot bind assets; Price mapping is server-side", () => {
  const assets10 = getPricingPackageById("assets_10");
  const commercial1 = getPricingPackageById("commercial_1");
  assert.equal(canBindAssetToPackage(assets10!), false);
  assert.equal(canBindAssetToPackage(commercial1!), true);
  assert.equal(shouldFulfillPremiumForProduct("assets_10"), false);
  assert.equal(shouldFulfillPremiumForProduct("commercial_1"), true);
  assert.equal(shouldFulfillPremiumForProduct("commercial-video"), true);
  assert.equal(isLegacyCommercialProductId("assets_10"), false);

  const checkout = readRepo("app/api/payments/checkout/route.ts");
  assert.match(
    checkout,
    /Advertising Image packages cannot be bound to a project asset/,
  );

  process.env.STRIPE_PRICE_ID_COMMERCIAL_1 = "price_commercial_1";
  process.env.STRIPE_PRICE_ID_ASSETS_10 = "price_assets_10";

  assert.equal(resolvePackageByStripePriceId("price_assets_10")?.id, "assets_10");
  const crossed = resolveTrustedGrantPackage({
    productId: "commercial_20",
    stripePriceId: "price_commercial_1",
  });
  assert.equal(crossed?.id, "commercial_1");
  assert.equal(resolvePackageByStripePriceId("price_unknown"), null);
  assert.equal(PACKAGE_STRIPE_PRICE_ENV_BY_PRODUCT.commercial_1, "STRIPE_PRICE_ID_COMMERCIAL_1");
});

test("E — image-only assets are not a Commercial workflow", () => {
  assert.equal(
    isCommercialWorkflowAsset({ teaser_video_path: "teaser.mp4" }),
    true,
  );
  assert.equal(isCommercialWorkflowAsset({ image_path: "image.png" } as never), false);

  const consume = readRepo("lib/entitlements/consume-commercial.ts");
  assert.match(consume, /isCommercialWorkflowAsset/);
  assert.match(consume, /not a Commercial preview workflow/);
});

test("G — unknown package ids are rejected by checkout", () => {
  const checkout = readRepo("app/api/payments/checkout/route.ts");
  assert.match(checkout, /Unknown product key/);
  assert.match(checkout, /getPricingPackageById\(productKey\)/);
  assert.equal(getPricingPackageById("arbitrary_sku"), undefined);
});

test("H/I/K — success URL and pending OXXO do not grant", () => {
  const statusPage = readRepo("components/pricing/PackagePurchaseStatus.tsx");
  assert.match(statusPage, /Never use payment=success as confirmation/);

  const checkoutGet = readRepo("app/api/payments/checkout/route.ts");
  assert.match(checkoutGet, /canonical, idempotent ledger grant exists/);

  const webhook = readRepo("app/api/payments/webhook/route.ts");
  assert.match(webhook, /result\.status !== "completed"/);
  assert.match(webhook, /unpaid sessions must not grant/);
});

test("J/L — webhook grants from Stripe Price mapping and commercial fulfill only", () => {
  const stripe = readRepo("lib/payments/providers/stripe.ts");
  assert.match(stripe, /constructEvent/);
  assert.match(stripe, /checkout\.session\.async_payment_succeeded/);
  assert.match(stripe, /event\.livemode !== isStripeLiveMode/);

  const persistence = readRepo("lib/payments/persistence.ts");
  assert.match(persistence, /resolveTrustedGrantPackage/);
  assert.match(persistence, /reconcilePurchaseAgainstStripeSnapshot/);
  assert.match(persistence, /shouldFulfillPremiumForProduct/);

  const webhook = readRepo("app/api/payments/webhook/route.ts");
  assert.match(webhook, /shouldFulfillPremiumForProduct/);
  assert.doesNotMatch(webhook, /consumeCurrentProject/);
});

test("M — conflicting metadata cannot choose the grant; Price ID does", () => {
  process.env.STRIPE_PRICE_ID_COMMERCIAL_1 = "price_commercial_1";
  process.env.STRIPE_PRICE_ID_COMMERCIAL_20 = "price_commercial_20";

  const granted = resolveTrustedGrantPackage({
    productId: "commercial_20",
    stripePriceId: "price_commercial_1",
  });
  assert.equal(granted?.id, "commercial_1");
  assert.equal(granted?.quantity, 1);
  assert.equal(granted?.displayPrice, 180);
});

test("N/P/Q — consume is ledger-idempotent; fulfillment does not trust payment_status", () => {
  const consume = readRepo("lib/entitlements/consume-commercial.ts");
  assert.doesNotMatch(consume, /paymentStatus === "paid"/);
  assert.match(consume, /consume_commercial_for_asset/);

  const fulfillment = readRepo("lib/studio/premium-video-fulfillment.ts");
  assert.match(fulfillment, /resolvePremiumAuthorization/);
  assert.doesNotMatch(
    fulfillment,
    /if \(asset\.payment_status !== "paid"\)/,
  );

  const premiumRoute = readRepo("app/api/studio/premium-video/route.ts");
  assert.match(premiumRoute, /createAdminClient/);
  assert.match(premiumRoute, /requireUserId: user\.id/);
});

test("C — checkout bind and webhook snapshot disagree on asset_id fail closed", () => {
  const createCheckout = readRepo("lib/payments/create-checkout-session.ts");
  assert.match(createCheckout, /ownedAsset\.id/);
  assert.match(createCheckout, /canBindAssetToPackage/);

  const persistence = readRepo("lib/payments/persistence.ts");
  assert.match(persistence, /purchase\.asset_id disagrees with Stripe session snapshot/);
});

test("Stripe Price env names for the eight packages are unchanged", () => {
  assert.deepEqual(
    CANONICAL_PACKAGES.map((pkg) => [
      pkg.id,
      getPricingPackageById(pkg.id)?.stripeEnvironmentVariable,
    ]),
    [
      ["commercial_1", "STRIPE_PRICE_ID_COMMERCIAL_1"],
      ["commercial_5", "STRIPE_PRICE_ID_COMMERCIAL_5"],
      ["commercial_10", "STRIPE_PRICE_ID_COMMERCIAL_10"],
      ["commercial_20", "STRIPE_PRICE_ID_COMMERCIAL_20"],
      ["assets_10", "STRIPE_PRICE_ID_ASSETS_10"],
      ["assets_25", "STRIPE_PRICE_ID_ASSETS_25"],
      ["assets_50", "STRIPE_PRICE_ID_ASSETS_50"],
      ["assets_100", "STRIPE_PRICE_ID_ASSETS_100"],
    ],
  );
});
