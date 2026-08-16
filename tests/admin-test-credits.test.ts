import assert from "node:assert/strict";
import test from "node:test";
import type { User } from "@supabase/supabase-js";
import { isMetapromAdminUser } from "../lib/admin/authorization-core.ts";
import {
  ADMIN_TEST_GRANT_CLASSIFICATION,
  ADMIN_TEST_GRANT_SOURCE,
  grantAdminTestCredits,
  parseAdminTestCreditGrantInput,
} from "../lib/admin/test-credit-grant.ts";

const ADMIN_ID = "11111111-1111-4111-8111-111111111111";
const REQUEST_ID = "22222222-2222-4222-8222-222222222222";

function user(input: Partial<User>): User {
  return { id: "user", app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: "", ...input } as User;
}

function fakeAdmin() {
  const balances = { commercials_remaining: 0, advertising_assets_remaining: 0 };
  const grants = new Map<string, { balance_after: number; kind: string }>();
  const ledger: Array<Record<string, unknown>> = [];

  return {
    balances,
    ledger,
    client: {
      async rpc(name: string, params: Record<string, unknown>) {
        if (name === "admin_grant_entitlement") {
          const id = params.p_request_id as string;
          const existing = grants.get(id);
          if (existing) return { data: [{ granted: false, balance_after: existing.balance_after }], error: null };
          const kind = params.p_entitlement_kind as string;
          const key = kind === "commercial" ? "commercials_remaining" : "advertising_assets_remaining";
          balances[key] += params.p_quantity as number;
          grants.set(id, { balance_after: balances[key], kind });
          ledger.push({
            admin_grant_id: id,
            entry_type: "adjust",
            entitlement_kind: kind,
            quantity: params.p_quantity,
            purchase_id: null,
            metadata: { ...(params.p_metadata as object), reason: params.p_reason },
          });
          return { data: [{ granted: true, balance_after: balances[key] }], error: null };
        }
        if (name === "consume_commercial_for_asset") {
          if (balances.commercials_remaining < 1) return { data: null, error: { message: "insufficient" } };
          balances.commercials_remaining -= 1;
          ledger.push({ entry_type: "consume", entitlement_kind: "commercial", quantity: -1 });
          return { data: [{ consumed: true, balance_after: balances.commercials_remaining }], error: null };
        }
        throw new Error(`Unexpected RPC ${name}`);
      },
      from(table: string) {
        assert.equal(table, "entitlement_balances");
        return {
          select() { return this; },
          eq() { return this; },
          async maybeSingle() { return { data: { user_id: ADMIN_ID, ...balances }, error: null }; },
        };
      },
    },
  };
}

test("server authorization rejects a normal authenticated user", () => {
  const previousIds = process.env.METAPROM_ADMIN_USER_IDS;
  const previousEmails = process.env.METAPROM_ADMIN_EMAILS;
  delete process.env.METAPROM_ADMIN_USER_IDS;
  delete process.env.METAPROM_ADMIN_EMAILS;
  assert.equal(isMetapromAdminUser(user({ id: "normal-user", email: "user@example.com" })), false);
  process.env.METAPROM_ADMIN_USER_IDS = previousIds;
  process.env.METAPROM_ADMIN_EMAILS = previousEmails;
});

test("server authorization accepts an admin claim", () => {
  assert.equal(isMetapromAdminUser(user({ id: ADMIN_ID, app_metadata: { role: "admin" } })), true);
});

test("invalid quantity and reason are rejected", () => {
  assert.throws(() => parseAdminTestCreditGrantInput({ requestId: REQUEST_ID, kind: "commercial", quantity: 0, reason: "QA" }), /entero positivo/i);
  assert.throws(() => parseAdminTestCreditGrantInput({ requestId: REQUEST_ID, kind: "commercial", quantity: 1, reason: "  " }), /motivo/i);
});

async function grant(kind: "commercial" | "advertising_asset", quantity: number, admin = fakeAdmin()) {
  const result = await grantAdminTestCredits(admin.client as never, {
    requestId: REQUEST_ID,
    userId: ADMIN_ID,
    grantedByUserId: ADMIN_ID,
    kind,
    quantity,
    reason: "QA Narrative Fidelity",
  });
  return { admin, result };
}

test("commercial grant enters the canonical balance", async () => {
  const { result } = await grant("commercial", 3);
  assert.equal(result.granted, true);
  assert.equal(result.balances.commercialsRemaining, 3);
});

test("advertising-image grant enters the canonical balance", async () => {
  const { result } = await grant("advertising_asset", 2);
  assert.equal(result.balances.advertisingAssetsRemaining, 2);
});

test("ledger classification is explicit non-revenue with no purchase", async () => {
  const { admin } = await grant("commercial", 1);
  assert.equal(admin.ledger[0].purchase_id, null);
  assert.equal((admin.ledger[0].metadata as Record<string, unknown>).classification, ADMIN_TEST_GRANT_CLASSIFICATION);
  assert.equal((admin.ledger[0].metadata as Record<string, unknown>).source, ADMIN_TEST_GRANT_SOURCE);
  assert.equal((admin.ledger[0].metadata as Record<string, unknown>).non_revenue, true);
});

test("idempotent retry does not double-grant", async () => {
  const admin = fakeAdmin();
  const first = await grant("commercial", 2, admin);
  const retry = await grant("commercial", 2, admin);
  assert.equal(first.result.granted, true);
  assert.equal(retry.result.granted, false);
  assert.equal(admin.balances.commercials_remaining, 2);
  assert.equal(admin.ledger.length, 1);
});

test("normal commercial consumption works after an admin grant", async () => {
  const { admin } = await grant("commercial", 1);
  const consumed = await admin.client.rpc("consume_commercial_for_asset", { p_user_id: ADMIN_ID });
  assert.equal(consumed.error, null);
  assert.equal(admin.balances.commercials_remaining, 0);
  assert.equal(admin.ledger.at(-1)?.entry_type, "consume");
});
