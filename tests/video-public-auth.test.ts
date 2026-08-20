/**
 * P0-2 public /api/video authorization — no live Vertex generation.
 *
 * Run: npm run test:video-public-auth
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import type { SupabaseClient } from "@supabase/supabase-js";

import { GET, POST } from "../app/api/video/route.ts";
import { fulfillPremiumVideoAfterPayment } from "../lib/studio/premium-video-fulfillment.ts";
import {
  createMemoryCostControlStore,
  installCostControlStoreForTests,
} from "../lib/security/cost-control.ts";
import {
  isPublicTeaserWorkflow,
  PUBLIC_VIDEO_PREMIUM_FORBIDDEN,
  resolveVideoWorkflowFromRequest,
  resolveWorkflow,
} from "../lib/video/workflows.ts";
import {
  generateCommercialVideoCalls,
  PUBLIC_AUTH_MOCK_BUFFER,
  resetGenerateCommercialVideoCalls,
} from "./shims/video-generation-spy.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function jpegFile() {
  return new File([Buffer.from("fake-jpeg")], "photo.jpg", {
    type: "image/jpeg",
  });
}

async function postVideo(fields: Record<string, string> = {}) {
  const form = new FormData();
  form.append("image", jpegFile());
  form.append("prompt", fields.prompt ?? "Cafe artesanal en CDMX");
  for (const [key, value] of Object.entries(fields)) {
    if (key === "prompt") {
      form.set("prompt", value);
      continue;
    }
    form.append(key, value);
  }

  return POST(
    new Request("http://localhost/api/video", {
      method: "POST",
      body: form,
    }),
  );
}

function createFakeSupabase(options: {
  asset: Record<string, unknown> | null;
  project: Record<string, unknown> | null;
  commercialConsume?: boolean;
  paidPurchase?: {
    id: string | number;
    user_id: string;
    asset_id: string;
    product_id: string;
    status: string;
  } | null;
}) {
  function filterable(rows: Record<string, unknown>[]) {
    const filters: Array<{ column: string; value: unknown }> = [];
    const api = {
      eq(column: string, value: unknown) {
        filters.push({ column, value });
        return api;
      },
      async maybeSingle() {
        const match = rows.find((row) =>
          filters.every((filter) => String(row[filter.column]) === String(filter.value)),
        );
        return { data: match ?? null, error: null };
      },
    };
    return api;
  }

  return {
    from(table: string) {
      if (table === "assets") {
        return {
          select() {
            return {
              eq() {
                return {
                  async maybeSingle() {
                    return { data: options.asset, error: null };
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
                  async maybeSingle() {
                    return { data: options.project, error: null };
                  },
                  eq() {
                    return {
                      async maybeSingle() {
                        return { data: options.project, error: null };
                      },
                    };
                  },
                };
              },
            };
          },
        };
      }

      if (table === "entitlement_ledger") {
        const rows = options.commercialConsume
          ? [
              {
                id: 1,
                user_id: "user-owner",
                asset_id: "asset-1",
                entry_type: "consume",
                entitlement_kind: "commercial",
              },
            ]
          : [];
        return {
          select() {
            return filterable(rows);
          },
        };
      }

      if (table === "purchases") {
        const rows = options.paidPurchase ? [options.paidPurchase] : [];
        return {
          select() {
            return filterable(rows);
          },
        };
      }

      throw new Error(`unexpected table ${table}`);
    },
    storage: {
      from() {
        return {
          async download() {
            return { data: new Blob([Buffer.from("img")]), error: null };
          },
          async upload() {
            return { error: null };
          },
        };
      },
    },
  } as unknown as SupabaseClient;
}

const ownerProject = {
  id: "project-1",
  user_id: "user-owner",
  destination: null,
};

function paidAsset(overrides: Record<string, unknown> = {}) {
  return {
    id: "asset-1",
    project_id: "project-1",
    image_url: "data:image/jpeg;base64,AAAA",
    image_path: null,
    ai_instructions: "Cafe artesanal",
    payment_status: "paid",
    premium_video_path: null,
    teaser_video_path: "user-owner/project-1/asset-1/teaser.mp4",
    creative_recipe: null,
    ...overrides,
  };
}

beforeEach(() => {
  resetGenerateCommercialVideoCalls();
  installCostControlStoreForTests(createMemoryCostControlStore());
});

afterEach(() => {
  installCostControlStoreForTests(null);
});

test("client tier=premium and workflow=premium/enterprise resolve to paid workflows", () => {
  assert.equal(resolveVideoWorkflowFromRequest({ tier: "teaser" }), "preview");
  assert.equal(resolveVideoWorkflowFromRequest({ tier: "premium" }), "premium");
  assert.equal(
    resolveVideoWorkflowFromRequest({ workflow: "premium", tier: "teaser" }),
    "premium",
  );
  assert.equal(
    resolveVideoWorkflowFromRequest({ workflow: "enterprise" }),
    "enterprise",
  );
  assert.equal(isPublicTeaserWorkflow("preview"), true);
  assert.equal(isPublicTeaserWorkflow("premium"), false);
  assert.equal(isPublicTeaserWorkflow("enterprise"), false);
  assert.equal(resolveWorkflow("premium").requiresAuth, true);
  assert.equal(resolveWorkflow("premium").requiresPayment, true);
  assert.equal(resolveWorkflow("enterprise").requiresAuth, true);
  assert.equal(resolveWorkflow("enterprise").requiresPayment, true);
});

test("anonymous teaser request is allowed and stays on preview", async () => {
  const response = await postVideo({ tier: "teaser" });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("X-Metaprom-Workflow"), "preview");
  assert.equal(response.headers.get("X-Metaprom-Tier"), "teaser");
  const body = Buffer.from(await response.arrayBuffer());
  assert.deepEqual(body, PUBLIC_AUTH_MOCK_BUFFER);
  assert.equal(generateCommercialVideoCalls.length, 1);
  assert.equal(generateCommercialVideoCalls[0]?.workflow, "preview");
  assert.equal(generateCommercialVideoCalls[0]?.model, undefined);
});

test("anonymous premium request is rejected before provider execution", async () => {
  const response = await postVideo({ tier: "premium" });
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), {
    error: PUBLIC_VIDEO_PREMIUM_FORBIDDEN,
  });
  assert.equal(generateCommercialVideoCalls.length, 0);
});

test("anonymous enterprise request is rejected before provider execution", async () => {
  const response = await postVideo({ workflow: "enterprise" });
  assert.equal(response.status, 403);
  assert.equal(generateCommercialVideoCalls.length, 0);
});

test("manipulated tier cannot upgrade a public request to Premium", async () => {
  const response = await postVideo({
    tier: "premium",
    workflow: "premium",
    model: "veo-3.1-fast-generate-001",
    durationSeconds: "8",
  });
  assert.equal(response.status, 403);
  assert.equal(generateCommercialVideoCalls.length, 0);
});

test("manipulated workflow cannot upgrade a public request to Premium", async () => {
  const response = await postVideo({
    tier: "teaser",
    workflow: "premium",
  });
  assert.equal(response.status, 403);
  assert.equal(generateCommercialVideoCalls.length, 0);
});

test("explicit preview workflow cannot be converted to Premium by extra fields", async () => {
  const response = await postVideo({
    workflow: "preview",
    tier: "premium",
    model: "veo-3.1-fast-generate-001",
    durationSeconds: "8",
  });
  assert.equal(response.status, 200);
  assert.equal(generateCommercialVideoCalls.length, 1);
  assert.equal(generateCommercialVideoCalls[0]?.workflow, "preview");
});

test("GET /api/video returns only harmless readiness and no projectId", async () => {
  const response = await GET();
  assert.equal(response.status, 200);
  const body = (await response.json()) as Record<string, unknown>;
  assert.deepEqual(Object.keys(body).sort(), ["ready"]);
  assert.equal(typeof body.ready, "boolean");
  const serialized = JSON.stringify(body);
  assert.equal("projectId" in body, false);
  assert.doesNotMatch(serialized, /projectId|test-must-not-leak|us-central1/i);
});

test("authenticated unpaid Premium fulfillment is skipped without generation", async () => {
  const result = await fulfillPremiumVideoAfterPayment(
    createFakeSupabase({
      asset: paidAsset({ payment_status: "pending" }),
      project: ownerProject,
    }),
    "asset-1",
    { requireUserId: "user-owner" },
  );

  assert.deepEqual(result, {
    status: "skipped",
    reason: "Premium video requires completed payment.",
    assetId: "asset-1",
  });
  assert.equal(generateCommercialVideoCalls.length, 0);
});

test("payment_status paid without commercial authorization is skipped", async () => {
  const result = await fulfillPremiumVideoAfterPayment(
    createFakeSupabase({
      asset: paidAsset(),
      project: ownerProject,
    }),
    "asset-1",
    { requireUserId: "user-owner" },
  );

  assert.deepEqual(result, {
    status: "skipped",
    reason: "Premium video requires completed payment.",
    assetId: "asset-1",
  });
  assert.equal(generateCommercialVideoCalls.length, 0);
});

test("authenticated wrong-owner Premium fulfillment is rejected without generation", async () => {
  const result = await fulfillPremiumVideoAfterPayment(
    createFakeSupabase({
      asset: paidAsset(),
      project: ownerProject,
    }),
    "asset-1",
    { requireUserId: "user-other" },
  );

  assert.deepEqual(result, {
    status: "failed",
    reason: "Asset not found.",
    assetId: "asset-1",
  });
  assert.equal(generateCommercialVideoCalls.length, 0);
});

test("webhook paid-purchase authorization can fulfill without a prior ledger consume", async () => {
  const result = await fulfillPremiumVideoAfterPayment(
    createFakeSupabase({
      asset: paidAsset({ payment_status: "pending" }),
      project: ownerProject,
      paidPurchase: {
        id: 44,
        user_id: "user-owner",
        asset_id: "asset-1",
        product_id: "commercial_1",
        status: "completed",
      },
    }),
    "asset-1",
    { requireUserId: "user-owner", paidPurchaseId: 44 },
  );

  assert.equal(result.status, "ready");
  assert.equal(generateCommercialVideoCalls.length, 1);
});

test("advertising purchase cannot authorize Premium fulfillment", async () => {
  const result = await fulfillPremiumVideoAfterPayment(
    createFakeSupabase({
      asset: paidAsset(),
      project: ownerProject,
      paidPurchase: {
        id: 45,
        user_id: "user-owner",
        asset_id: "asset-1",
        product_id: "assets_10",
        status: "completed",
      },
    }),
    "asset-1",
    { requireUserId: "user-owner", paidPurchaseId: 45 },
  );

  assert.equal(result.status, "skipped");
  assert.equal(generateCommercialVideoCalls.length, 0);
});

test("legitimate paid Premium fulfillment still generates on the existing path", async () => {
  const result = await fulfillPremiumVideoAfterPayment(
    createFakeSupabase({
      asset: paidAsset(),
      project: ownerProject,
      commercialConsume: true,
    }),
    "asset-1",
    { requireUserId: "user-owner" },
  );

  assert.equal(result.status, "ready");
  assert.equal(result.assetId, "asset-1");
  assert.equal(generateCommercialVideoCalls.length, 1);
  assert.equal(generateCommercialVideoCalls[0]?.workflow, "premium");
});

test("already-ready paid Premium fulfillment does not generate again", async () => {
  const result = await fulfillPremiumVideoAfterPayment(
    createFakeSupabase({
      asset: paidAsset({
        premium_video_path: "user-owner/project-1/asset-1/premium.mp4",
      }),
      project: ownerProject,
    }),
    "asset-1",
    { requireUserId: "user-owner" },
  );

  assert.deepEqual(result, {
    status: "ready",
    assetId: "asset-1",
    alreadyReady: true,
  });
  assert.equal(generateCommercialVideoCalls.length, 0);
});

test("Studio teaser generation still posts teaser to /api/video", () => {
  const studioCreation = readRepo("lib/studio-creation.ts");
  assert.match(studioCreation, /videoForm\.append\("tier", "teaser"\)/);
  assert.match(studioCreation, /fetch\("\/api\/video"/);
  assert.doesNotMatch(studioCreation, /append\("workflow", "premium"\)/);
  assert.doesNotMatch(studioCreation, /append\("tier", "premium"\)/);
});

test("webhook Premium fulfillment path remains the authoritative paid path", () => {
  const webhook = readRepo("app/api/payments/webhook/route.ts");
  const premiumRoute = readRepo("app/api/studio/premium-video/route.ts");
  const videoRoute = readRepo("app/api/video/route.ts");

  assert.match(webhook, /fulfillPremiumVideoAfterPayment/);
  assert.doesNotMatch(webhook, /\/api\/video/);
  assert.match(premiumRoute, /Authentication required/);
  assert.match(premiumRoute, /requireUserId: user\.id/);
  assert.match(webhook, /requireUserId: purchase\.user_id/);
  assert.match(webhook, /paidPurchaseId: purchase\.id/);
  assert.match(premiumRoute, /createAdminClient/);
  assert.match(premiumRoute, /fulfillPremiumVideoAfterPayment/);
  assert.doesNotMatch(videoRoute, /fulfillPremiumVideoAfterPayment/);
  assert.doesNotMatch(videoRoute, /getVertexVideoStatus/);
  assert.doesNotMatch(videoRoute, /projectId/);
  assert.match(videoRoute, /isPublicTeaserWorkflow\(requestedWorkflow\)/);
  assert.match(videoRoute, /const workflow = "preview" as const/);
  assert.match(videoRoute, /ready: isVertexVideoConfigured\(\)/);
});
