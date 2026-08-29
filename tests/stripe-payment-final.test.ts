/**
 * Block #8 — focused Stripe payment / entitlement verification.
 *
 * Exercises persistPaymentResult against an in-memory store that mirrors
 * entitlement_ledger_purchase_grant_uidx + grant_package_entitlement
 * unique-violation rollback. No live Stripe, no production mutation.
 *
 * Run via: npm run test:checkout-integrity
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { persistPaymentResult } from "../lib/payments/persistence.ts";
import {
  resolveTrustedGrantPackage,
} from "../lib/payments/purchase-integrity.ts";
import { getPricingPackageById, PRICING_PACKAGES } from "../lib/pricing/index.ts";
import type { PaymentWebhookResult } from "../lib/payments/types.ts";

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

type PurchaseRow = {
  id: number;
  user_id: string;
  asset_id: string | number | null;
  product_id: string;
  status: string;
  metadata: Record<string, unknown>;
  provider: string;
  provider_reference: string;
  completed_at: string | null;
  amount_mxn?: number;
};

type GrantRow = {
  purchaseId: number;
  kind: string;
  quantity: number;
  productId: string;
};

function createPaymentStore(purchase: PurchaseRow) {
  const purchases = new Map<number, PurchaseRow>([[purchase.id, { ...purchase }]]);
  const grants: GrantRow[] = [];
  const consumeByAsset = new Set<number>();
  let commercialsRemaining = 0;
  let advertisingRemaining = 0;
  let grantRpcCalls = 0;
  let purchaseUpdates = 0;

  const supabase = {
    from(table: string) {
      if (table === "purchases") {
        return {
          select() {
            const filters: Record<string, unknown> = {};
            const chain = {
              eq(column: string, value: unknown) {
                filters[column] = value;
                return chain;
              },
              async maybeSingle() {
                const rows = [...purchases.values()].filter((row) => {
                  if (
                    filters.provider != null &&
                    row.provider !== filters.provider
                  ) {
                    return false;
                  }
                  if (
                    filters.provider_reference != null &&
                    row.provider_reference !== filters.provider_reference
                  ) {
                    return false;
                  }
                  if (filters.id != null && row.id !== filters.id) {
                    return false;
                  }
                  return true;
                });
                return { data: rows[0] ?? null, error: null };
              },
            };
            return chain;
          },
          update(values: Partial<PurchaseRow>) {
            return {
              async eq(column: string, value: unknown) {
                purchaseUpdates += 1;
                const row = [...purchases.values()].find((item) => {
                  return (item as Record<string, unknown>)[column] === value;
                });
                if (!row) {
                  return { error: { message: "purchase not found" } };
                }
                Object.assign(row, values);
                return { error: null };
              },
            };
          },
        };
      }

      if (table === "assets") {
        return {
          select() {
            return {
              eq() {
                return {
                  async maybeSingle() {
                    return {
                      data: purchase.asset_id
                        ? {
                            id: purchase.asset_id,
                            project_id: 1,
                            payment_status: "pending",
                            teaser_video_path: "teaser.mp4",
                            teaser_video_url: null,
                            video_url: null,
                            premium_video_path: null,
                          }
                        : null,
                      error: null,
                    };
                  },
                };
              },
            };
          },
          update() {
            return {
              async eq() {
                return { error: null };
              },
            };
          },
        };
      }

      if (table === "projects") {
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      async maybeSingle() {
                        return { data: { id: 1 }, error: null };
                      },
                    };
                  },
                };
              },
            };
          },
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },

    async rpc(name: string, args: Record<string, unknown>) {
      if (name === "grant_package_entitlement") {
        grantRpcCalls += 1;
        const purchaseId = Number(args.p_purchase_id);
        const quantity = Number(args.p_quantity);
        const kind = String(args.p_entitlement_kind);
        if (grants.some((grant) => grant.purchaseId === purchaseId)) {
          return { data: false, error: null };
        }
        grants.push({
          purchaseId,
          kind,
          quantity,
          productId: String(args.p_product_id),
        });
        if (kind === "commercial") commercialsRemaining += quantity;
        else advertisingRemaining += quantity;
        return { data: true, error: null };
      }

      if (name === "consume_commercial_for_asset") {
        const assetId = Number(args.p_asset_id);
        if (consumeByAsset.has(assetId)) {
          return { data: false, error: null };
        }
        if (commercialsRemaining < 1) {
          return {
            data: null,
            error: { message: "insufficient commercial entitlement balance", code: "P0001" },
          };
        }
        consumeByAsset.add(assetId);
        commercialsRemaining -= 1;
        return { data: true, error: null };
      }

      throw new Error(`Unexpected rpc ${name}`);
    },
  };

  return {
    supabase: supabase as never,
    grants,
    get commercialsRemaining() {
      return commercialsRemaining;
    },
    get advertisingRemaining() {
      return advertisingRemaining;
    },
    get grantRpcCalls() {
      return grantRpcCalls;
    },
    get purchaseUpdates() {
      return purchaseUpdates;
    },
    getPurchase() {
      return purchases.get(purchase.id)!;
    },
  };
}

function pendingPurchase(overrides: Partial<PurchaseRow> = {}): PurchaseRow {
  return {
    id: 42,
    user_id: USER_ID,
    asset_id: null,
    product_id: "commercial_1",
    status: "pending",
    metadata: {},
    provider: "stripe",
    provider_reference: "cs_test_session_1",
    completed_at: null,
    ...overrides,
  };
}

function completedResult(
  overrides: Partial<PaymentWebhookResult> = {},
): PaymentWebhookResult {
  return {
    sessionId: "cs_test_session_1",
    purchaseId: "42",
    status: "completed",
    providerReference: "pi_test_1",
    stripePriceId: "price_test_commercial_1",
    stripeUserId: USER_ID,
    stripeAssetId: "",
    ...overrides,
  };
}

test("card completion grants catalog quantity exactly once", async () => {
  const store = createPaymentStore(pendingPurchase());
  const purchase = await persistPaymentResult(
    store.supabase,
    "stripe",
    completedResult(),
  );

  assert.equal(purchase?.status, "completed");
  assert.equal(store.grants.length, 1);
  assert.equal(store.grants[0]?.quantity, 1);
  assert.equal(store.grants[0]?.kind, "commercial");
  assert.equal(store.grants[0]?.productId, "commercial_1");
  assert.equal(store.commercialsRemaining, 1);
  assert.equal(store.getPurchase().status, "completed");
});

test("OXXO pending / voucher created does not grant", async () => {
  const store = createPaymentStore(
    pendingPurchase({ status: "awaiting_payment" }),
  );

  const purchase = await persistPaymentResult(store.supabase, "stripe", {
    sessionId: "cs_test_session_1",
    purchaseId: "42",
    status: "awaiting_payment",
    stripePriceId: "price_test_commercial_1",
    stripeUserId: USER_ID,
    stripeAssetId: "",
  });

  assert.equal(purchase?.status, "awaiting_payment");
  assert.equal(store.grants.length, 0);
  assert.equal(store.commercialsRemaining, 0);
  assert.equal(store.grantRpcCalls, 0);
});

test("OXXO async success grants after pending voucher", async () => {
  const store = createPaymentStore(
    pendingPurchase({ status: "awaiting_payment" }),
  );

  await persistPaymentResult(store.supabase, "stripe", {
    sessionId: "cs_test_session_1",
    purchaseId: "42",
    status: "awaiting_payment",
    stripePriceId: "price_test_commercial_1",
    stripeUserId: USER_ID,
    stripeAssetId: "",
  });
  const completed = await persistPaymentResult(
    store.supabase,
    "stripe",
    completedResult(),
  );

  assert.equal(completed?.status, "completed");
  assert.equal(store.grants.length, 1);
  assert.equal(store.commercialsRemaining, 1);
});

test("failed and expired OXXO do not grant", async () => {
  for (const status of ["failed", "cancelled"] as const) {
    const store = createPaymentStore(
      pendingPurchase({ status: "awaiting_payment" }),
    );
    const purchase = await persistPaymentResult(store.supabase, "stripe", {
      sessionId: "cs_test_session_1",
      purchaseId: "42",
      status,
      stripePriceId: "price_test_commercial_1",
      stripeUserId: USER_ID,
      stripeAssetId: "",
    });

    assert.equal(purchase?.status, status);
    assert.equal(store.grants.length, 0);
    assert.equal(store.commercialsRemaining, 0);
    assert.equal(store.grantRpcCalls, 0);
  }
});

test("duplicate webhook / same session persist twice grants once", async () => {
  const store = createPaymentStore(pendingPurchase());
  const first = await persistPaymentResult(
    store.supabase,
    "stripe",
    completedResult(),
  );
  const second = await persistPaymentResult(
    store.supabase,
    "stripe",
    completedResult(),
  );

  assert.equal(first?.status, "completed");
  assert.equal(second?.status, "completed");
  assert.equal(store.grants.length, 1);
  assert.equal(store.commercialsRemaining, 1);
  assert.equal(store.grantRpcCalls, 2);
});

test("webhook + polling race grants once", async () => {
  const store = createPaymentStore(pendingPurchase());
  const result = completedResult();

  const [a, b] = await Promise.all([
    persistPaymentResult(store.supabase, "stripe", result),
    persistPaymentResult(store.supabase, "stripe", result),
  ]);

  assert.equal(a?.status, "completed");
  assert.equal(b?.status, "completed");
  assert.equal(store.grants.length, 1);
  assert.equal(store.commercialsRemaining, 1);
});

test("repeated confirmation refresh does not increase balance", async () => {
  const store = createPaymentStore(pendingPurchase());
  await persistPaymentResult(store.supabase, "stripe", completedResult());
  await persistPaymentResult(store.supabase, "stripe", completedResult());
  await persistPaymentResult(store.supabase, "stripe", completedResult());

  assert.equal(store.grants.length, 1);
  assert.equal(store.commercialsRemaining, 1);
});

test("cancelled or failed payment never grants later refresh", async () => {
  const store = createPaymentStore(pendingPurchase());
  await persistPaymentResult(store.supabase, "stripe", {
    sessionId: "cs_test_session_1",
    purchaseId: "42",
    status: "cancelled",
    stripeUserId: USER_ID,
    stripeAssetId: "",
  });
  await persistPaymentResult(store.supabase, "stripe", {
    sessionId: "cs_test_session_1",
    purchaseId: "42",
    status: "failed",
    stripeUserId: USER_ID,
    stripeAssetId: "",
  });

  assert.equal(store.grants.length, 0);
  assert.equal(store.commercialsRemaining, 0);
  assert.notEqual(store.getPurchase().status, "completed");
});

test("completed purchase is not downgraded by expired/failed webhook", async () => {
  const store = createPaymentStore(pendingPurchase());
  await persistPaymentResult(store.supabase, "stripe", completedResult());
  const afterExpired = await persistPaymentResult(store.supabase, "stripe", {
    sessionId: "cs_test_session_1",
    purchaseId: "42",
    status: "cancelled",
    stripeUserId: USER_ID,
    stripeAssetId: "",
  });

  assert.equal(afterExpired?.status, "completed");
  assert.equal(store.getPurchase().status, "completed");
  assert.equal(store.commercialsRemaining, 1);
});

test("each catalog package maps to the promised entitlement quantity", async () => {
  for (const pkg of PRICING_PACKAGES) {
    const priceId = process.env[pkg.stripeEnvironmentVariable];
    const store = createPaymentStore(
      pendingPurchase({
        id: pkg.sortOrder,
        product_id: pkg.id,
        provider_reference: `cs_${pkg.id}`,
      }),
    );

    await persistPaymentResult(
      store.supabase,
      "stripe",
      completedResult({
        sessionId: `cs_${pkg.id}`,
        purchaseId: String(pkg.sortOrder),
        stripePriceId: priceId,
      }),
    );

    assert.equal(store.grants.length, 1, pkg.id);
    assert.equal(store.grants[0]?.productId, pkg.id);
    assert.equal(store.grants[0]?.quantity, pkg.quantity);
    assert.equal(
      store.grants[0]?.kind,
      pkg.category === "commercials" ? "commercial" : "advertising_asset",
    );
    if (pkg.category === "commercials") {
      assert.equal(store.commercialsRemaining, pkg.quantity, pkg.id);
      assert.equal(store.advertisingRemaining, 0, pkg.id);
    } else {
      assert.equal(store.advertisingRemaining, pkg.quantity, pkg.id);
      assert.equal(store.commercialsRemaining, 0, pkg.id);
    }
    assert.equal(pkg.currency, "MXN");
    assert.equal(getPricingPackageById(pkg.id)?.displayPrice, pkg.displayPrice);
  }
});

test("charged Stripe Price, not purchase.product_id, chooses the grant", async () => {
  const store = createPaymentStore(
    pendingPurchase({ product_id: "commercial_20" }),
  );

  await persistPaymentResult(
    store.supabase,
    "stripe",
    completedResult({ stripePriceId: "price_test_commercial_1" }),
  );

  assert.equal(store.grants[0]?.productId, "commercial_1");
  assert.equal(store.grants[0]?.quantity, 1);
  assert.equal(store.commercialsRemaining, 1);
  assert.equal(store.getPurchase().product_id, "commercial_1");
  assert.equal(
    resolveTrustedGrantPackage({
      productId: "commercial_20",
      stripePriceId: "price_test_commercial_1",
    })?.id,
    "commercial_1",
  );
});

test("bound commercial consume is once per asset after grant", async () => {
  const store = createPaymentStore(
    pendingPurchase({ asset_id: 77, product_id: "commercial_5" }),
  );

  await persistPaymentResult(
    store.supabase,
    "stripe",
    completedResult({
      stripePriceId: "price_test_commercial_5",
      stripeAssetId: "77",
    }),
  );
  await persistPaymentResult(
    store.supabase,
    "stripe",
    completedResult({
      stripePriceId: "price_test_commercial_5",
      stripeAssetId: "77",
    }),
  );

  assert.equal(store.grants.length, 1);
  assert.equal(store.grants[0]?.quantity, 5);
  assert.equal(store.commercialsRemaining, 4);
});

test("analytics failure cannot prevent grant", async () => {
  const store = createPaymentStore(pendingPurchase());
  const purchase = await persistPaymentResult(
    store.supabase,
    "stripe",
    completedResult(),
  );

  assert.equal(purchase?.status, "completed");
  assert.equal(store.grants.length, 1);
  assert.equal(store.commercialsRemaining, 1);
});

test("source contracts: Stripe authority, webhook events, OXXO expiry, ledger uniqueness", () => {
  const stripe = readRepo("lib/payments/providers/stripe.ts");
  const webhook = readRepo("app/api/payments/webhook/route.ts");
  const checkoutGet = readRepo("app/api/payments/checkout/route.ts");
  const persistence = readRepo("lib/payments/persistence.ts");
  const grantSql = readRepo("supabase/migrations/20260806010000_package_entitlements.sql");
  const purchasesSql = readRepo(
    "supabase/migrations/20260713192000_recover_purchases_live_schema.sql",
  );
  const consumeSql = readRepo(
    "supabase/migrations/20260807120000_commercial_consume_idempotent.sql",
  );
  const createCheckout = readRepo("lib/payments/create-checkout-session.ts");
  const analyticsPersist = readRepo("lib/analytics/persist.ts");
  const analyticsInternal = readRepo("lib/analytics/internal-traffic.ts");
  const statusPage = readRepo("components/pricing/PackagePurchaseStatus.tsx");

  assert.match(stripe, /isSubscription \? "subscription" : "payment"/);
  assert.match(stripe, /One-off packages stay mode: "payment"/);
  assert.match(stripe, /constructEvent/);
  assert.match(stripe, /expires_after_days:\s*3/);
  assert.match(stripe, /checkout\.session\.completed/);
  assert.match(stripe, /checkout\.session\.async_payment_succeeded/);
  assert.match(stripe, /checkout\.session\.async_payment_failed/);
  assert.match(stripe, /checkout\.session\.expired/);
  assert.match(stripe, /payment_status === "paid"/);
  assert.match(stripe, /awaiting_payment/);
  assert.match(stripe, /unpaid sessions must not grant|Never treat unpaid/);

  assert.match(webhook, /await req\.text\(\)/);
  assert.match(webhook, /result\.status !== "completed"/);
  assert.match(webhook, /unpaid sessions must not grant/);
  assert.doesNotMatch(webhook, /recordPurchaseCompleted/);

  assert.match(checkoutGet, /canonical, idempotent ledger grant exists/);
  assert.match(checkoutGet, /A Stripe redirect is not proof of fulfillment/);
  assert.match(statusPage, /Never use payment=success as confirmation/);

  assert.match(persistence, /Never downgrade a completed/);
  assert.match(createCheckout, /recordCheckoutStarted[\s\S]*catch \(analyticsError\)/);
  assert.match(persistence, /recordPurchaseCompleted[\s\S]*catch \(analyticsError\)/);
  assert.match(analyticsPersist, /persistFunnelEventUnlessAdmin/);
  assert.match(analyticsInternal, /Skip ONLY when the current authenticated session is a proven Metaprom admin/);

  assert.match(grantSql, /entitlement_ledger_purchase_grant_uidx/);
  assert.match(grantSql, /when unique_violation then/);
  assert.match(purchasesSql, /purchases_provider_reference_uidx/);
  assert.match(consumeSql, /entitlement_ledger_commercial_asset_consume_uidx/);
});
