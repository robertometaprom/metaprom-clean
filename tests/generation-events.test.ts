/**
 * Phase 2 generation-event observability — no live generation.
 *
 * Run: npm run test:generation-events
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  GENERATION_EVENT_RECIPE_ID,
  GENERATION_EVENT_STEP,
  GENERATION_EVENT_VENDOR,
  estimateGenerationUsdMicros,
  observeVeoVisualGeneration,
  recordGenerationEvent,
  resolveObservedVeoDurationSeconds,
  toGenerationEventRow,
  type GenerationEventRow,
  type GenerationEventsStore,
} from "../lib/video/generation-events";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function fakeStore(options?: {
  errorMessage?: string | null;
  throwOnFrom?: boolean;
  throwOnInsert?: boolean;
}): { rows: GenerationEventRow[]; tables: string[]; store: GenerationEventsStore } {
  const rows: GenerationEventRow[] = [];
  const tables: string[] = [];

  return {
    rows,
    tables,
    store: {
      from(table: string) {
        tables.push(table);
        if (options?.throwOnFrom) {
          throw new Error("store from failed");
        }
        return {
          async insert(row: GenerationEventRow) {
            if (options?.throwOnInsert) {
              throw new Error("store insert failed");
            }
            rows.push(row);
            return {
              error: options?.errorMessage
                ? { message: options.errorMessage }
                : null,
            };
          },
        };
      },
    },
  };
}

const visualContext = {
  workflow: "preview" as const,
  tier: "teaser",
  model: "veo-3.1-lite-generate-001",
  durationSeconds: 4,
};

test("estimateGenerationUsdMicros() is always null", () => {
  assert.equal(estimateGenerationUsdMicros(), null);
  assert.equal(
    estimateGenerationUsdMicros({
      vendor: "vertex",
      model: "veo-3.1-fast-generate-001",
      durationSeconds: 8,
    }),
    null,
  );
});

test("resolveObservedVeoDurationSeconds() uses requested duration when present", () => {
  assert.equal(
    resolveObservedVeoDurationSeconds({ requestedDurationSeconds: 8 }),
    8,
  );
  assert.equal(
    resolveObservedVeoDurationSeconds({ requestedDurationSeconds: Number.NaN }),
    null,
  );
});

test("resolveObservedVeoDurationSeconds() mirrors Vertex preview env/default", () => {
  const previous = process.env.VEO_VERTEX_DURATION_SECONDS;
  delete process.env.VEO_VERTEX_DURATION_SECONDS;
  assert.equal(
    resolveObservedVeoDurationSeconds({ requestedDurationSeconds: undefined }),
    4,
  );

  process.env.VEO_VERTEX_DURATION_SECONDS = "6";
  assert.equal(
    resolveObservedVeoDurationSeconds({ requestedDurationSeconds: undefined }),
    6,
  );

  process.env.VEO_VERTEX_DURATION_SECONDS = "not-a-number";
  assert.equal(
    resolveObservedVeoDurationSeconds({ requestedDurationSeconds: undefined }),
    null,
  );

  if (previous === undefined) {
    delete process.env.VEO_VERTEX_DURATION_SECONDS;
  } else {
    process.env.VEO_VERTEX_DURATION_SECONDS = previous;
  }
});

test("toGenerationEventRow() leaves asset/run/provider/cost null when unknown", () => {
  const row = toGenerationEventRow({
    recipeId: GENERATION_EVENT_RECIPE_ID,
    step: GENERATION_EVENT_STEP,
    vendor: GENERATION_EVENT_VENDOR,
    model: "veo-3.1-lite-generate-001",
    status: "success",
  });

  assert.equal(row.asset_id, null);
  assert.equal(row.run_id, null);
  assert.equal(row.provider_request_id, null);
  assert.equal(row.estimated_usd_micros, null);
  assert.equal(row.recipe_id, "veo_native");
  assert.equal(row.vendor, "vertex");
  assert.equal(row.step, "visual");
});

test("observeVeoVisualGeneration() records success without changing the result", async () => {
  const fake = fakeStore();
  const result = await observeVeoVisualGeneration(
    visualContext,
    async () => Buffer.from("not-media"),
    fake.store,
  );

  assert.equal(result.toString(), "not-media");
  assert.deepEqual(fake.tables, ["generation_events"]);
  assert.equal(fake.rows.length, 1);
  assert.equal(fake.rows[0].recipe_id, "veo_native");
  assert.equal(fake.rows[0].vendor, "vertex");
  assert.equal(fake.rows[0].model, "veo-3.1-lite-generate-001");
  assert.equal(fake.rows[0].step, "visual");
  assert.equal(fake.rows[0].status, "success");
  assert.equal(fake.rows[0].tier, "teaser");
  assert.equal(fake.rows[0].duration_seconds, 4);
  assert.equal(fake.rows[0].estimated_usd_micros, null);
  assert.equal(fake.rows[0].asset_id, null);
  assert.equal(fake.rows[0].run_id, null);
  assert.equal(fake.rows[0].provider_request_id, null);
  assert.equal(fake.rows[0].metadata.workflow, "preview");
  assert.equal(typeof fake.rows[0].metadata.elapsed_ms, "number");
});

test("observeVeoVisualGeneration() records failure and rethrows the original error", async () => {
  const fake = fakeStore();
  const original = new Error("vertex mocked failure");

  await assert.rejects(
    () =>
      observeVeoVisualGeneration(
        visualContext,
        async () => {
          throw original;
        },
        fake.store,
      ),
    original,
  );

  assert.deepEqual(fake.tables, ["generation_events"]);
  assert.equal(fake.rows.length, 1);
  assert.equal(fake.rows[0].status, "failure");
  assert.equal(fake.rows[0].estimated_usd_micros, null);
  assert.equal(fake.rows[0].metadata.error, "vertex mocked failure");
});

test("logging insert errors do not fail a successful generation", async () => {
  const fake = fakeStore({ errorMessage: "insert rejected" });
  const result = await observeVeoVisualGeneration(
    visualContext,
    async () => "ok",
    fake.store,
  );
  assert.equal(result, "ok");
});

test("logging exceptions do not fail a successful generation", async () => {
  const fromThrow = fakeStore({ throwOnFrom: true });
  assert.equal(
    await observeVeoVisualGeneration(visualContext, async () => 1, fromThrow.store),
    1,
  );

  const insertThrow = fakeStore({ throwOnInsert: true });
  assert.equal(
    await observeVeoVisualGeneration(
      visualContext,
      async () => 2,
      insertThrow.store,
    ),
    2,
  );
});

test("logging exceptions still rethrow the original generation error", async () => {
  const fake = fakeStore({ throwOnInsert: true });
  const original = new Error("generation failed");

  await assert.rejects(
    () =>
      observeVeoVisualGeneration(
        visualContext,
        async () => {
          throw original;
        },
        fake.store,
      ),
    original,
  );
});

test("recordGenerationEvent() never writes entitlement tables", async () => {
  const fake = fakeStore();
  await recordGenerationEvent(
    {
      recipeId: GENERATION_EVENT_RECIPE_ID,
      step: GENERATION_EVENT_STEP,
      vendor: GENERATION_EVENT_VENDOR,
      model: "veo-3.1-lite-generate-001",
      status: "success",
    },
    fake.store,
  );

  assert.deepEqual(fake.tables, ["generation_events"]);
  assert.equal(
    fake.tables.some((table) =>
      /entitlement|purchase|stripe/i.test(table),
    ),
    false,
  );
});

test("generateCommercialVideo observes Vertex without rewriting it", () => {
  const src = readRepo("lib/video/generate-commercial-video.ts");

  assert.match(src, /observeVeoVisualGeneration\(/);
  assert.match(
    src,
    /generateVertexVideo\(\{\s*prompt: input\.prompt,\s*imageBuffer: input\.imageBuffer,\s*aspectRatio: input\.aspectRatio,\s*durationSeconds,\s*model: vertexModel,\s*\}\)/,
  );
  assert.match(
    src,
    /input\.workflow === "premium"\s*\? resolvePremiumVeoDurationSeconds\(\)\s*: undefined/,
  );
  assert.match(src, /processCommercialVideo\(/);
  assert.doesNotMatch(src, /fal|kling/i);
  assert.doesNotMatch(src, /entitlement/i);
  assert.doesNotMatch(src, /stripe/i);
  assert.doesNotMatch(src, /resolveProductionRecipe/);
  assert.doesNotMatch(src, /getCommercialRecipe/);
  assert.doesNotMatch(src, /lib\/creative-director/);
});

test("Phase 2 does not wire a new provider or customer-facing cost UI", () => {
  const events = readRepo("lib/video/generation-events.ts");
  const router = readRepo("lib/video/router.ts");
  const recipes = readRepo("lib/commercial/recipes.ts");
  const videoRoute = readRepo("app/api/video/route.ts");
  const premium = readRepo("lib/studio/premium-video-fulfillment.ts");
  const dashboard = readRepo("lib/admin/dashboard-data.ts");
  const vertex = readRepo("lib/video/vertex-provider.ts");

  assert.match(events, /estimated_usd_micros: input\.estimatedUsdMicros \?\? null/);
  assert.match(events, /return null;/);
  assert.doesNotMatch(events, /fal|kling/i);
  assert.doesNotMatch(events, /entitlement_balances|entitlement_ledger/);
  assert.match(router, /return \{ recipeId: VEO_NATIVE_RECIPE_ID \};/);
  assert.match(recipes, /return generateCommercialVideo\(input\);/);
  assert.doesNotMatch(videoRoute, /generation-events|observeVeoVisualGeneration/);
  assert.doesNotMatch(premium, /generation-events|observeVeoVisualGeneration/);
  assert.match(dashboard, /costsAvailable: false/);
  assert.match(vertex, /export async function generateVertexVideo/);
});
