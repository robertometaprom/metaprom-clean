/**
 * Membership Phase 1 — recurring checkout, invoice-authoritative grants,
 * additive renewals, and $180 one-off isolation.
 *
 * Run: npm run test:membership-phase1
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { persistMembershipInvoice } from "../lib/payments/membership-persistence.ts";
import { persistPaymentResult } from "../lib/payments/persistence.ts";
import { resolveTrustedGrantPackage } from "../lib/payments/purchase-integrity.ts";
import {
  getMembershipProductById,
  getMembershipProductForSelector,
  getMembershipPurchasability,
  MEMBERSHIP_PRODUCTS,
  resolveMembershipByStripePriceId,
} from "../lib/pricing/memberships.ts";
import { getPlanesOfferCopy, getPricingPackageById } from "../lib/pricing/index.ts";
import type { PaymentWebhookResult } from "../lib/payments/types.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const USER_ID = "11111111-1111-4111-8111-111111111111";

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

process.env.STRIPE_PRICE_ID_COMMERCIAL_1 = "price_test_commercial_1";
process.env.STRIPE_PRICE_ID_GOLDEN_MONTHLY = "price_test_golden_monthly";
process.env.STRIPE_PRICE_ID_GOLDEN_ANNUAL = "price_test_golden_annual";
process.env.STRIPE_PRICE_ID_PREMIUM_MONTHLY = "price_test_premium_monthly";
process.env.STRIPE_PRICE_ID_PREMIUM_ANNUAL = "price_test_premium_annual";

const EXPECTED_MEMBERSHIPS = [
  { id: "golden_monthly", displayPrice: 350, commercials: 8, interval: "month" },
  { id: "golden_annual", displayPrice: 2990, commercials: 100, interval: "year" },
  { id: "premium_monthly", displayPrice: 600, commercials: 15, interval: "month" },
  { id: "premium_annual", displayPrice: 4990, commercials: 200, interval: "year" },
] as const;

type PurchaseRow = {
  id: number;
  user_id: string;
  product_id: string;
  status: string;
  metadata: Record<string, unknown>;
  provider: string;
  provider_reference: string;
  amount_mxn?: number;
  completed_at?: string | null;
};

type MembershipRow = {
  user_id: string;
  membership_key: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  status: string;
  last_invoice_id: string | null;
};

function createMembershipStore(seedPurchases: PurchaseRow[] = []) {
  let nextPurchaseId = 100;
  const purchases = new Map<number, PurchaseRow>();
  for (const row of seedPurchases) {
    purchases.set(row.id, { ...row });
    nextPurchaseId = Math.max(nextPurchaseId, row.id + 1);
  }
  const memberships = new Map<string, MembershipRow>();
  const grants: Array<{ purchaseId: number; productId: string; quantity: number }> =
    [];
  let commercialsRemaining = 0;
  let grantRpcCalls = 0;

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
              order() {
                return chain;
              },
              limit() {
                return chain;
              },
              async maybeSingle() {
                const rows = [...purchases.values()].filter((row) => {
                  for (const [column, value] of Object.entries(filters)) {
                    if ((row as Record<string, unknown>)[column] !== value) {
                      return false;
                    }
                  }
                  return true;
                });
                return { data: rows[0] ?? null, error: null };
              },
              then(
                resolve: (value: { data: PurchaseRow[]; error: null }) => unknown,
              ) {
                const rows = [...purchases.values()].filter((row) => {
                  for (const [column, value] of Object.entries(filters)) {
                    if ((row as Record<string, unknown>)[column] !== value) {
                      return false;
                    }
                  }
                  return true;
                });
                return Promise.resolve({ data: rows, error: null }).then(resolve);
              },
            };
            return chain;
          },
          insert(values: Partial<PurchaseRow>) {
            return {
              select() {
                return {
                  async single() {
                    const row: PurchaseRow = {
                      id: nextPurchaseId,
                      user_id: String(values.user_id),
                      product_id: String(values.product_id),
                      status: String(values.status ?? "pending"),
                      metadata: (values.metadata as Record<string, unknown>) ?? {},
                      provider: String(values.provider ?? "stripe"),
                      provider_reference: String(values.provider_reference),
                      amount_mxn: values.amount_mxn,
                      completed_at: values.completed_at ?? null,
                    };
                    const duplicate = [...purchases.values()].find(
                      (item) =>
                        item.provider === row.provider &&
                        item.provider_reference === row.provider_reference,
                    );
                    if (duplicate) {
                      return {
                        data: null,
                        error: { message: "duplicate", code: "23505" },
                      };
                    }
                    nextPurchaseId += 1;
                    purchases.set(row.id, row);
                    return { data: row, error: null };
                  },
                };
              },
            };
          },
          update(values: Partial<PurchaseRow>) {
            return {
              async eq(column: string, value: unknown) {
                const row = [...purchases.values()].find(
                  (item) => (item as Record<string, unknown>)[column] === value,
                );
                if (!row) return { error: { message: "purchase not found" } };
                Object.assign(row, values);
                return { error: null };
              },
            };
          },
        };
      }

      if (table === "memberships") {
        return {
          select() {
            const filters: Record<string, unknown> = {};
            const chain = {
              eq(column: string, value: unknown) {
                filters[column] = value;
                return chain;
              },
              async maybeSingle() {
                const rows = [...memberships.values()].filter((row) => {
                  for (const [column, value] of Object.entries(filters)) {
                    if ((row as Record<string, unknown>)[column] !== value) {
                      return false;
                    }
                  }
                  return true;
                });
                return { data: rows[0] ?? null, error: null };
              },
            };
            return chain;
          },
          async upsert(values: MembershipRow) {
            memberships.set(values.stripe_subscription_id, { ...values });
            return { error: null };
          },
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },

    async rpc(name: string, args: Record<string, unknown>) {
      if (name !== "grant_package_entitlement") {
        throw new Error(`Unexpected rpc ${name}`);
      }
      grantRpcCalls += 1;
      const purchaseId = Number(args.p_purchase_id);
      const quantity = Number(args.p_quantity);
      if (grants.some((grant) => grant.purchaseId === purchaseId)) {
        return { data: false, error: null };
      }
      grants.push({
        purchaseId,
        productId: String(args.p_product_id),
        quantity,
      });
      commercialsRemaining += quantity;
      return { data: true, error: null };
    },
  };

  return {
    supabase: supabase as never,
    grants,
    get commercialsRemaining() {
      return commercialsRemaining;
    },
    set commercialsRemaining(value: number) {
      commercialsRemaining = value;
    },
    get grantRpcCalls() {
      return grantRpcCalls;
    },
    memberships,
    purchases,
  };
}

function paidInvoice(
  overrides: Partial<PaymentWebhookResult> = {},
): PaymentWebhookResult {
  return {
    sessionId: "in_test_1",
    purchaseId: "in_test_1",
    status: "completed",
    fulfillment: "membership",
    membershipEvent: "invoice_paid",
    stripeInvoiceId: "in_test_1",
    stripeSubscriptionId: "sub_test_1",
    stripeCustomerId: "cus_test_1",
    stripePriceId: "price_test_premium_annual",
    stripeUserId: USER_ID,
    checkoutSessionId: "cs_test_membership_1",
    subscriptionStatus: "active",
    billingReason: "subscription_create",
    amountPaid: 499000,
    chargedAmountTotal: 499000,
    chargedCurrency: "mxn",
    ...overrides,
  };
}

function seedCheckout(productId = "premium_annual"): PurchaseRow {
  return {
    id: 10,
    user_id: USER_ID,
    product_id: productId,
    status: "pending",
    metadata: { checkoutKind: "membership", membershipKey: productId },
    provider: "stripe",
    provider_reference: "cs_test_membership_1",
  };
}

test("membership catalog maps each selector state to price and credits", () => {
  assert.equal(MEMBERSHIP_PRODUCTS.length, 4);

  for (const expected of EXPECTED_MEMBERSHIPS) {
    const product = getMembershipProductById(expected.id);
    assert.ok(product, expected.id);
    assert.equal(product?.displayPrice, expected.displayPrice, expected.id);
    assert.equal(product?.commercials, expected.commercials, expected.id);
    assert.equal(product?.interval, expected.interval, expected.id);
    assert.equal(product?.currency, "MXN", expected.id);
  }

  assert.equal(getMembershipProductForSelector("golden", "monthly").id, "golden_monthly");
  assert.equal(getMembershipProductForSelector("golden", "annual").id, "golden_annual");
  assert.equal(getMembershipProductForSelector("premium", "monthly").id, "premium_monthly");
  assert.equal(getMembershipProductForSelector("premium", "annual").id, "premium_annual");
});

test("ES/EN plan selector maps to the same backend product", () => {
  const es = getPlanesOfferCopy("es");
  const en = getPlanesOfferCopy("en");

  assert.equal(es.memberships.golden.id, en.memberships.golden.id);
  assert.equal(es.memberships.premium.id, en.memberships.premium.id);
  assert.equal(es.memberships.golden.monthly.cycle, en.memberships.golden.monthly.cycle);
  assert.equal(es.memberships.premium.annual.cycle, en.memberships.premium.annual.cycle);

  for (const locale of [es, en]) {
    assert.equal(
      getMembershipProductForSelector(locale.memberships.golden.id, "monthly").commercials,
      8,
    );
    assert.equal(
      getMembershipProductForSelector(locale.memberships.golden.id, "annual").commercials,
      100,
    );
    assert.equal(
      getMembershipProductForSelector(locale.memberships.premium.id, "monthly").commercials,
      15,
    );
    assert.equal(
      getMembershipProductForSelector(locale.memberships.premium.id, "annual").commercials,
      200,
    );
  }
});

test("membership checkout uses Stripe subscription semantics and card only", () => {
  const stripe = readRepo("lib/payments/providers/stripe.ts");
  const createMembership = readRepo("lib/payments/create-membership-checkout.ts");
  const createPackage = readRepo("lib/payments/create-checkout-session.ts");

  assert.match(createMembership, /mode: "subscription"/);
  assert.match(createMembership, /paymentMethodTypes: \["card"\]/);
  assert.match(createMembership, /OXXO remains available for one-off/);
  assert.match(stripe, /mode === "subscription"/);
  assert.match(stripe, /subscription_data/);
  assert.match(stripe, /invoice\.paid/);
  assert.match(stripe, /customer\.subscription\.updated/);

  assert.match(createPackage, /paymentMethodTypes: \["card", "oxxo"\]/);
  assert.doesNotMatch(createPackage, /mode: "subscription"/);
});

test("successful initial invoice grants once; duplicate delivery does not", async () => {
  const store = createMembershipStore([seedCheckout()]);
  const first = await persistMembershipInvoice(store.supabase, paidInvoice());
  const duplicate = await persistMembershipInvoice(store.supabase, paidInvoice());

  assert.equal(first?.granted, true);
  assert.equal(first?.quantity, 200);
  assert.equal(first?.productId, "premium_annual");
  assert.equal(store.commercialsRemaining, 200);
  assert.equal(duplicate?.granted, false);
  assert.equal(store.grants.length, 1);
  assert.equal(store.grantRpcCalls, 2);
});

test("successful renewal grants again and ADDS to the existing balance", async () => {
  const store = createMembershipStore([seedCheckout("premium_monthly")]);
  await persistMembershipInvoice(
    store.supabase,
    paidInvoice({
      stripePriceId: "price_test_premium_monthly",
      amountPaid: 60000,
    }),
  );
  assert.equal(store.commercialsRemaining, 15);
  store.commercialsRemaining = 4;

  const renewal = await persistMembershipInvoice(
    store.supabase,
    paidInvoice({
      sessionId: "in_test_renewal",
      purchaseId: "in_test_renewal",
      stripeInvoiceId: "in_test_renewal",
      stripePriceId: "price_test_premium_monthly",
      amountPaid: 60000,
      billingReason: "subscription_cycle",
    }),
  );

  assert.equal(renewal?.granted, true);
  assert.equal(renewal?.quantity, 15);
  assert.equal(store.grants.length, 2);
  assert.equal(store.commercialsRemaining, 19);
});

test("Premium Monthly renewal adds 15; Golden Annual renewal adds 100", async () => {
  const monthly = createMembershipStore([seedCheckout("premium_monthly")]);
  monthly.commercialsRemaining = 4;
  const monthGrant = await persistMembershipInvoice(
    monthly.supabase,
    paidInvoice({
      stripePriceId: "price_test_premium_monthly",
      stripeUserId: USER_ID,
      amountPaid: 60000,
      checkoutSessionId: "cs_test_membership_1",
    }),
  );
  assert.equal(monthGrant?.quantity, 15);
  assert.equal(monthly.commercialsRemaining, 19);

  const annual = createMembershipStore([seedCheckout("golden_annual")]);
  annual.commercialsRemaining = 37;
  const yearGrant = await persistMembershipInvoice(
    annual.supabase,
    paidInvoice({
      stripePriceId: "price_test_golden_annual",
      amountPaid: 299000,
      checkoutSessionId: "cs_test_membership_1",
    }),
  );
  assert.equal(yearGrant?.quantity, 100);
  assert.equal(annual.commercialsRemaining, 137);
});

test("Golden Monthly $350 → +8 and Premium Annual $4,990 → +200", async () => {
  const golden = createMembershipStore([seedCheckout("golden_monthly")]);
  const goldenGrant = await persistMembershipInvoice(
    golden.supabase,
    paidInvoice({
      stripePriceId: "price_test_golden_monthly",
      amountPaid: 35000,
    }),
  );
  assert.equal(goldenGrant?.quantity, 8);
  assert.equal(golden.commercialsRemaining, 8);

  const premium = createMembershipStore([seedCheckout("premium_annual")]);
  const premiumGrant = await persistMembershipInvoice(
    premium.supabase,
    paidInvoice({
      stripePriceId: "price_test_premium_annual",
      amountPaid: 499000,
    }),
  );
  assert.equal(premiumGrant?.quantity, 200);
  assert.equal(premium.commercialsRemaining, 200);
});

test("failed renewal and canceled checkout grant zero", async () => {
  const failed = createMembershipStore([seedCheckout()]);
  failed.commercialsRemaining = 12;
  const failedResult = await persistMembershipInvoice(
    failed.supabase,
    paidInvoice({
      status: "failed",
      membershipEvent: "invoice_failed",
      amountPaid: 0,
    }),
  );
  assert.equal(failedResult?.granted, false);
  assert.equal(failed.grants.length, 0);
  assert.equal(failed.commercialsRemaining, 12);

  const cancelled = createMembershipStore([seedCheckout()]);
  const cancelledResult = await persistMembershipInvoice(
    cancelled.supabase,
    paidInvoice({
      status: "cancelled",
      membershipEvent: "checkout_cancelled",
      amountPaid: 0,
      stripeInvoiceId: "in_cancelled",
    }),
  );
  assert.equal(cancelledResult?.granted, false);
  assert.equal(cancelled.grants.length, 0);
  assert.equal(cancelled.commercialsRemaining, 0);
});

test("existing $180 commercial purchase remains a one-off catalog package", () => {
  const commercial1 = getPricingPackageById("commercial_1");
  assert.equal(commercial1?.displayPrice, 180);
  assert.equal(commercial1?.quantity, 1);
  assert.equal(commercial1?.stripeEnvironmentVariable, "STRIPE_PRICE_ID_COMMERCIAL_1");
  assert.equal(getMembershipProductById("commercial_1"), undefined);
  assert.equal(resolveMembershipByStripePriceId("price_test_commercial_1"), null);

  process.env.STRIPE_PRICE_ID_COMMERCIAL_1 = "price_test_commercial_1";
  const granted = resolveTrustedGrantPackage({
    productId: "golden_monthly",
    stripePriceId: "price_test_commercial_1",
  });
  assert.equal(granted?.id, "commercial_1");
  assert.equal(granted?.quantity, 1);
});

test("package persistPaymentResult does not grant membership prices and does not throw", async () => {
  const purchase = {
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
          update(values: Record<string, unknown>) {
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
    async rpc() {
      grants.push("called");
      return { data: true, error: null };
    },
  };

  const result = await persistPaymentResult(supabase as never, "stripe", {
    sessionId: "cs_test_session_1",
    purchaseId: "42",
    status: "completed",
    stripePriceId: "price_test_golden_monthly",
    stripeUserId: USER_ID,
    stripeAssetId: "",
  });

  assert.equal(result?.status, "completed");
  assert.equal(grants.length, 0);
});

test("membership purchasability stays off without a real price_ mapping", () => {
  const previous = process.env.STRIPE_PRICE_ID_GOLDEN_MONTHLY;
  delete process.env.STRIPE_PRICE_ID_GOLDEN_MONTHLY;
  const product = getMembershipProductById("golden_monthly")!;
  assert.equal(getMembershipPurchasability(product).purchasable, false);
  process.env.STRIPE_PRICE_ID_GOLDEN_MONTHLY = previous;
});

test("webhook and checkout isolate membership fulfillment from OXXO package grants", () => {
  const webhook = readRepo("app/api/payments/webhook/route.ts");
  const checkout = readRepo("app/api/payments/checkout/route.ts");
  const createPackage = readRepo("lib/payments/create-checkout-session.ts");

  assert.match(webhook, /fulfillment === "membership"/);
  assert.match(webhook, /persistMembershipWebhook/);
  assert.match(webhook, /unpaid sessions must not grant/);
  assert.match(checkout, /createMembershipCheckoutSession/);
  assert.match(checkout, /Memberships cannot be bound to a project asset/);
  assert.match(createPackage, /paymentMethodTypes: \["card", "oxxo"\]/);
});
