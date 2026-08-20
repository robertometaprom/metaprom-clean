/**
 * GTM #3 — antiabuse / cost control. No live OpenAI or Vertex calls.
 *
 * Run: npm run test:antiabuse
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

import { POST as postEnhancement } from "../app/api/enhancement/route.ts";
import { POST as postVideo } from "../app/api/video/route.ts";
import {
  COST_CONTROL_UNAVAILABLE_CODE,
  COST_CONTROL_UNAVAILABLE_MESSAGE,
  GENERATION_IN_PROGRESS_CODE,
  RATE_LIMITED_CODE,
  RATE_LIMITED_GENERATION_MESSAGE,
} from "../lib/security/cost-control-messages.ts";
import {
  createMemoryCostControlStore,
  installCostControlStoreForTests,
  type CostControlStore,
} from "../lib/security/cost-control.ts";
import { ENHANCEMENT_PREVIEW_RATE_LIMIT, VIDEO_TEASER_RATE_LIMIT } from "../lib/security/limits.ts";
import { fulfillPremiumVideoAfterPayment } from "../lib/studio/premium-video-fulfillment.ts";
import {
  enhancementCalls,
  resetEnhancementCalls,
} from "./shims/enhancement-spy.ts";
import {
  generateCommercialVideoCalls,
  resetGenerateCommercialVideoCalls,
} from "./shims/video-generation-spy.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

async function jpegFile() {
  const buffer = await sharp({
    create: {
      width: 8,
      height: 8,
      channels: 3,
      background: { r: 180, g: 40, b: 40 },
    },
  })
    .jpeg()
    .toBuffer();

  return new File([buffer], "photo.jpg", { type: "image/jpeg" });
}

function throwingStore(secret: string): CostControlStore {
  return {
    async consume() {
      throw new Error(secret);
    },
    async tryClaim() {
      throw new Error(secret);
    },
    async release() {},
  };
}

async function postTeaser(options: {
  ip?: string;
  prompt?: string;
  includeImage?: boolean;
  fields?: Record<string, string>;
  contentLength?: string;
}) {
  const form = new FormData();
  if (options.includeImage !== false) {
    form.append("image", await jpegFile());
  }
  if (options.prompt !== undefined) {
    form.append("prompt", options.prompt);
  } else {
    form.append("prompt", "Cafe artesanal en CDMX");
  }
  for (const [key, value] of Object.entries(options.fields ?? {})) {
    form.append(key, value);
  }

  const headers = new Headers();
  if (options.ip) headers.set("x-forwarded-for", options.ip);
  if (options.contentLength) headers.set("content-length", options.contentLength);

  return postVideo(
    new Request("http://localhost/api/video", {
      method: "POST",
      headers,
      body: form,
    }),
  );
}

async function postPreviewEnhancement(options: {
  ip?: string;
  instructions?: string;
  includeImage?: boolean;
  advertising?: boolean;
}) {
  const form = new FormData();
  if (options.includeImage !== false) {
    form.append("image", await jpegFile());
  }
  form.append("mode", "custom");
  form.append("aiInstructions", options.instructions ?? "Cafe artesanal en CDMX");
  if (options.advertising) {
    form.append("purpose", "advertising_image");
  }

  const headers = new Headers();
  if (options.ip) headers.set("x-forwarded-for", options.ip);

  return postEnhancement(
    new Request("http://localhost/api/enhancement", {
      method: "POST",
      headers,
      body: form,
    }),
  );
}

function createFakeSupabase(options: {
  asset: Record<string, unknown> | null;
  project: Record<string, unknown> | null;
  commercialConsume?: boolean;
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
                if (options.asset) {
                  options.asset.premium_video_path =
                    options.asset.premium_video_path ??
                    "user-owner/project-1/asset-1/premium.mp4";
                }
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
        return {
          select() {
            return filterable([]);
          },
        };
      }

      return {
        select() {
          return filterable([]);
        },
      };
    },
    storage: {
      from() {
        return {
          async download() {
            return { data: null, error: { message: "unused" } };
          },
          async upload() {
            return { error: null };
          },
        };
      },
    },
  };
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
  resetEnhancementCalls();
  installCostControlStoreForTests(createMemoryCostControlStore());
});

afterEach(() => {
  installCostControlStoreForTests(null);
});

test("A — Director still rate-limits only after the anonymous guard, with durable cost-control", () => {
  const director = readRepo("app/api/creative-director/route.ts");
  const guardIndex = director.lastIndexOf("evaluateAnonymousDirectorGuard(");
  const limitIndex = director.lastIndexOf("enforceSoftCostControl(");
  const providerIndex = director.lastIndexOf("createCreativeProposal(");

  assert.ok(guardIndex > 0);
  assert.ok(limitIndex > guardIndex);
  assert.ok(providerIndex > limitIndex);
  assert.match(director, /ANON_DIRECTOR_RATE_LIMIT/);
  assert.match(director, /AUTH_DIRECTOR_RATE_LIMIT/);
  assert.doesNotMatch(director, /checkRateLimit\(/);
});

test("B — anonymous Commercial enhancement remains available and is provider-gated by rate limit", async () => {
  const response = await postPreviewEnhancement({ ip: "203.0.113.10" });
  assert.equal(response.status, 200);
  const body = (await response.json()) as { image?: string };
  assert.ok(body.image?.startsWith("data:image/png;base64,"));
  assert.equal(enhancementCalls.length, 1);
});

test("C — anonymous enhancement loop 429s before OpenAI", async () => {
  const ip = "203.0.113.11";
  for (let i = 0; i < ENHANCEMENT_PREVIEW_RATE_LIMIT; i += 1) {
    const allowed = await postPreviewEnhancement({ ip });
    assert.equal(allowed.status, 200, `allowed generation ${i + 1}`);
  }

  const blocked = await postPreviewEnhancement({ ip });
  assert.equal(blocked.status, 429);
  const body = (await blocked.json()) as { error?: string; code?: string };
  assert.equal(body.error, RATE_LIMITED_GENERATION_MESSAGE);
  assert.equal(body.code, RATE_LIMITED_CODE);
  assert.equal(enhancementCalls.length, ENHANCEMENT_PREVIEW_RATE_LIMIT);
});

test("D — anonymous teaser loop 429s before Vertex", async () => {
  const ip = "203.0.113.12";
  for (let i = 0; i < VIDEO_TEASER_RATE_LIMIT; i += 1) {
    const allowed = await postTeaser({ ip });
    assert.equal(allowed.status, 200, `allowed teaser ${i + 1}`);
  }

  const blocked = await postTeaser({ ip });
  assert.equal(blocked.status, 429);
  const body = (await blocked.json()) as { error?: string; code?: string };
  assert.equal(body.error, RATE_LIMITED_GENERATION_MESSAGE);
  assert.equal(body.code, RATE_LIMITED_CODE);
  assert.equal(generateCommercialVideoCalls.length, VIDEO_TEASER_RATE_LIMIT);
});

test("E — malformed video request never reaches the provider", async () => {
  const missingImage = await postTeaser({ includeImage: false, prompt: "Cafe" });
  assert.equal(missingImage.status, 400);

  const missingPrompt = await postTeaser({ prompt: "" });
  assert.equal(missingPrompt.status, 400);

  const premium = await postTeaser({ fields: { tier: "premium" } });
  assert.equal(premium.status, 403);

  assert.equal(generateCommercialVideoCalls.length, 0);
});

test("F — oversized prompt and body are rejected before the provider", async () => {
  const oversizedPrompt = await postTeaser({
    prompt: "x".repeat(12_001),
  });
  assert.equal(oversizedPrompt.status, 413);
  assert.equal(generateCommercialVideoCalls.length, 0);

  const oversizedBody = await postVideo(
    new Request("http://localhost/api/video", {
      method: "POST",
      headers: {
        "content-type": "multipart/form-data; boundary=antiabuse",
        "content-length": String(30 * 1024 * 1024),
      },
      body: "--antiabuse--",
    }),
  );
  assert.equal(oversizedBody.status, 413);
  assert.equal(generateCommercialVideoCalls.length, 0);
});

test("G/H/I — Advertising Image still requires auth/entitlement before OpenAI", () => {
  const enhancement = readRepo("app/api/enhancement/route.ts");
  const gate = readRepo("lib/entitlements/assert-advertising-generation.ts");

  const purposeIndex = enhancement.lastIndexOf("isAdvertisingImagePurpose(");
  const gateIndex = enhancement.lastIndexOf("assertAdvertisingImageGenerationAllowed(");
  const limitIndex = enhancement.lastIndexOf("enforcePaidProviderCostControl(");
  const providerIndex = enhancement.lastIndexOf("generateEnhancedImage(");

  assert.ok(purposeIndex > 0);
  assert.ok(gateIndex > purposeIndex);
  assert.ok(limitIndex > gateIndex);
  assert.ok(providerIndex > limitIndex);
  assert.match(gate, /ADVERTISING_IMAGE_AUTH_REQUIRED_CODE/);
  assert.match(gate, /status: 401/);
  assert.match(gate, /advertisingAssetsRemaining < 1/);
  assert.match(gate, /status: 402/);
  assert.match(enhancement, /ENHANCEMENT_ADVERTISING_RATE_LIMIT/);
});

test("J/K — Premium remains blocked on public video and unpaid fulfillment", async () => {
  const publicPremium = await postTeaser({ fields: { workflow: "premium" } });
  assert.equal(publicPremium.status, 403);
  assert.equal(generateCommercialVideoCalls.length, 0);

  const unpaid = await fulfillPremiumVideoAfterPayment(
    createFakeSupabase({
      asset: paidAsset({ payment_status: "pending" }),
      project: ownerProject,
    }) as never,
    "asset-1",
    { requireUserId: "user-owner" },
  );
  assert.equal(unpaid.status, "skipped");
  assert.equal(generateCommercialVideoCalls.length, 0);
});

test("L — paid Premium legitimate flow still generates once", async () => {
  const result = await fulfillPremiumVideoAfterPayment(
    createFakeSupabase({
      asset: paidAsset(),
      project: ownerProject,
      commercialConsume: true,
    }) as never,
    "asset-1",
    { requireUserId: "user-owner" },
  );

  assert.equal(result.status, "ready");
  assert.equal(generateCommercialVideoCalls.length, 1);
  assert.equal(generateCommercialVideoCalls[0]?.workflow, "premium");
});

test("M — already-ready Premium does not generate again", async () => {
  const result = await fulfillPremiumVideoAfterPayment(
    createFakeSupabase({
      asset: paidAsset({
        premium_video_path: "user-owner/project-1/asset-1/premium.mp4",
      }),
      project: ownerProject,
      commercialConsume: true,
    }) as never,
    "asset-1",
    { requireUserId: "user-owner" },
  );

  assert.equal(result.status, "ready");
  assert.equal("alreadyReady" in result && result.alreadyReady, true);
  assert.equal(generateCommercialVideoCalls.length, 0);
});

test("N — concurrent Premium requests for the same asset cannot double-generate", async () => {
  const supabase = createFakeSupabase({
    asset: paidAsset(),
    project: ownerProject,
    commercialConsume: true,
  });

  const [first, second] = await Promise.all([
    fulfillPremiumVideoAfterPayment(supabase as never, "asset-1", {
      requireUserId: "user-owner",
    }),
    fulfillPremiumVideoAfterPayment(supabase as never, "asset-1", {
      requireUserId: "user-owner",
    }),
  ]);

  const statuses = [first.status, second.status].sort();
  assert.deepEqual(statuses, ["failed", "ready"]);
  const failed = first.status === "failed" ? first : second;
  assert.equal(failed.status, "failed");
  if (failed.status === "failed") {
    assert.match(failed.reason, /produciendo|límite|generaciones/i);
  }
  assert.equal(generateCommercialVideoCalls.length, 1);
});

test("O — production cost-control is durable Postgres, not the in-memory Map", () => {
  const costControl = readRepo("lib/security/cost-control.ts");
  const rateLimit = readRepo("lib/security/rate-limit.ts");
  const migration = readRepo(
    "supabase/migrations/20260820010000_gtm3_provider_cost_control.sql",
  );
  const video = readRepo("app/api/video/route.ts");
  const enhancement = readRepo("app/api/enhancement/route.ts");

  assert.match(costControl, /NODE_ENV === "production"/);
  assert.match(costControl, /consume_provider_cost_window/);
  assert.match(costControl, /claim_provider_cost_lock/);
  assert.match(migration, /provider_cost_windows/);
  assert.match(migration, /primary key \(endpoint_class, bucket_key, window_started_at\)/);
  assert.match(video, /enforcePaidProviderCostControl/);
  assert.match(enhancement, /enforcePaidProviderCostControl/);
  assert.doesNotMatch(video, /checkRateLimit\(/);
  assert.doesNotMatch(enhancement, /checkRateLimit\(/);
  assert.match(rateLimit, /NOT durable across Vercel/);
});

test("P — storage failure is fail-closed for paid providers and does not leak secrets", async () => {
  const secret = "SUPER_SECRET_SERVICE_ROLE_do_not_leak";
  installCostControlStoreForTests(throwingStore(secret));

  const response = await postTeaser({ ip: "203.0.113.99" });
  assert.equal(response.status, 503);
  const body = await response.text();
  assert.match(body, new RegExp(COST_CONTROL_UNAVAILABLE_CODE));
  assert.match(body, new RegExp(COST_CONTROL_UNAVAILABLE_MESSAGE));
  assert.doesNotMatch(body, /SUPER_SECRET/);
  assert.doesNotMatch(body, /service_role/i);
  assert.doesNotMatch(body, /openai/i);
  assert.doesNotMatch(body, /vertex/i);
  assert.equal(generateCommercialVideoCalls.length, 0);
});

test("provider invocation is after validation and after the durable limit", () => {
  const video = readRepo("app/api/video/route.ts");
  const assertPrompt = video.lastIndexOf("assertPromptLength(");
  const rateLimit = video.lastIndexOf("enforcePaidProviderCostControl(");
  const generate = video.lastIndexOf("generateCommercialVideo(");

  assert.ok(assertPrompt > 0);
  assert.ok(rateLimit > assertPrompt);
  assert.ok(generate > rateLimit);
});

test("Premium API maps lock contention and rate limits without changing Stripe", () => {
  const premiumRoute = readRepo("app/api/studio/premium-video/route.ts");
  const checkout = readRepo("app/api/payments/checkout/route.ts");
  const stripeConfig = readRepo("lib/payments/stripe-config.ts");

  assert.match(premiumRoute, /applyUserRateLimit: true/);
  assert.match(premiumRoute, /RATE_LIMITED_GENERATION_MESSAGE/);
  assert.match(premiumRoute, /GENERATION_IN_PROGRESS_MESSAGE/);
  assert.doesNotMatch(checkout, /consume_provider_cost_window/);
  assert.match(stripeConfig, /stripeEnvironmentVariable/);
  assert.doesNotMatch(stripeConfig, /price_1[A-Za-z0-9]+/);
});

test("in-progress lock response uses 409, not a provider error", () => {
  assert.equal(GENERATION_IN_PROGRESS_CODE, "generation_in_progress");
  const fulfillment = readRepo("lib/studio/premium-video-fulfillment.ts");
  const generate = fulfillment.indexOf("generatePremiumVideoBuffer");
  const claim = fulfillment.indexOf("claimPremiumGenerationLock");
  assert.ok(claim > 0);
  assert.ok(generate > claim);
  assert.match(fulfillment, /releasePremiumGenerationLock/);
});
