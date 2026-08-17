/**
 * Phase 1 router/registry proof — no live generation.
 *
 * Run with the mock tsconfig so Veo is never loaded:
 *   npm run test:production-router
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { ProductionBrief } from "../lib/commercial/production-brief";
import {
  getCommercialRecipe,
  listCommercialRecipeIds,
  VEO_NATIVE_RECIPE_ID,
} from "../lib/commercial/recipes";
import { resolveProductionRecipe } from "../lib/video/router";
import { generateCommercialVideo } from "@/lib/video/generate-commercial-video";

type GenerateCommercialVideoSpy = typeof generateCommercialVideo & {
  mock: {
    callCount: () => number;
    resetCalls: () => void;
    calls: Array<{ arguments: unknown[] }>;
  };
};

const generateCommercialVideoSpy =
  generateCommercialVideo as GenerateCommercialVideoSpy;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const VERTEX_ENV_KEYS = [
  "VERTEX_SERVICE_ACCOUNT_JSON",
  "GOOGLE_APPLICATION_CREDENTIALS",
  "GOOGLE_CLOUD_PROJECT",
  "VERTEX_OUTPUT_GCS_URI",
] as const;

for (const key of VERTEX_ENV_KEYS) {
  delete process.env[key];
}

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function makeBrief(
  overrides: {
    speech?: ProductionBrief["speech"];
    durationIntent?: ProductionBrief["visual"]["durationIntent"];
  } = {},
): ProductionBrief {
  return {
    visual: {
      scene: "A baker plates a cake on a wooden counter.",
      hook: "First-frame product lock",
      heroMoment: "The cake is sliced and served.",
      tone: "warm",
      pacing: "steady",
      callToAction: "Order today",
      productLock: "exact_physical_product",
      destination: {
        platform: "tiktok",
        aspectRatio: "9:16",
      },
      durationIntent: overrides.durationIntent ?? "full",
    },
    references: {
      heroProductImage: { uri: "https://example.test/product.png" },
    },
    speech: overrides.speech ?? {
      mode: "none",
      copy: null,
      locale: null,
      voiceCharacter: null,
    },
    audio: {
      music: { mode: "none" },
      ambienceSfx: { mode: "none" },
      forbidUnauthorizedSpeech: true,
    },
    constraints: {
      noExtraBrands: true,
    },
  };
}

test("resolveProductionRecipe() always returns veo_native", () => {
  const exactCopyEs: ProductionBrief["speech"] = {
    mode: "exact_copy",
    copy: "Corta Chido es muy confiable",
    locale: "es-MX",
    voiceCharacter: "confident_clear",
  };
  const exactCopyZh: ProductionBrief["speech"] = {
    mode: "exact_copy",
    copy: "精确口播不得改写",
    locale: "zh-CN",
    voiceCharacter: "calm_premium",
  };

  const routes = [
    resolveProductionRecipe(),
    resolveProductionRecipe(undefined),
    resolveProductionRecipe({}),
    resolveProductionRecipe({ brief: makeBrief() }),
    resolveProductionRecipe({
      brief: makeBrief({ speech: exactCopyEs, durationIntent: "teaser" }),
    }),
    resolveProductionRecipe({
      brief: makeBrief({ speech: exactCopyZh, durationIntent: "full" }),
    }),
    resolveProductionRecipe({
      brief: makeBrief(),
      preferKling: true,
      costBudgetUsd: 0,
      quotaExhausted: true,
      locale: "ja-JP",
    } as never),
  ];

  for (const route of routes) {
    assert.deepEqual(route, { recipeId: "veo_native" });
    assert.equal(route.recipeId, VEO_NATIVE_RECIPE_ID);
  }
});

test("commercial recipe registry contains only veo_native", () => {
  const ids = listCommercialRecipeIds();
  assert.deepEqual(ids, ["veo_native"]);
  assert.equal(ids.length, 1);

  const recipe = getCommercialRecipe("veo_native");
  assert.equal(recipe.id, "veo_native");
  assert.equal(recipe.version, "1");
  assert.equal(typeof recipe.execute, "function");

  const recipesSrc = readRepo("lib/commercial/recipes.ts");
  assert.match(
    recipesSrc,
    /const RECIPE_REGISTRY: Record<CommercialRecipeId, CommercialRecipe> = \{\s*veo_native: veoNativeRecipe,\s*\}/,
  );
  assert.equal(recipesSrc.match(/kling/gi), null);
  assert.equal(recipesSrc.match(/fal/gi), null);
  assert.doesNotMatch(recipesSrc, /generateVertexVideo/);
});

test("veo_native.execute() delegates to generateCommercialVideo via spy, without Veo", async () => {
  generateCommercialVideoSpy.mock.resetCalls();

  const input = {
    workflow: "premium" as const,
    prompt: "phase-1-spy-only",
    imageBuffer: Buffer.from("not-a-real-image"),
  };

  const result = await getCommercialRecipe("veo_native").execute(input);

  assert.equal(generateCommercialVideoSpy.mock.callCount(), 1);
  assert.equal(generateCommercialVideoSpy.mock.calls[0].arguments[0], input);
  assert.equal(result.buffer.toString(), "phase1-mock-video");
  assert.equal(result.vertexModel, "phase1-mock-not-veo");
  assert.doesNotMatch(result.vertexModel, /^veo-/);
  assert.equal(result.workflow, "premium");

  for (const key of VERTEX_ENV_KEYS) {
    assert.equal(process.env[key], undefined);
  }

  const recipesSrc = readRepo("lib/commercial/recipes.ts");
  assert.match(
    recipesSrc,
    /from ["']@\/lib\/video\/generate-commercial-video["']/,
  );
  assert.match(recipesSrc, /return generateCommercialVideo\(input\)/);
});

test("/api/video and Premium fulfillment still do not import the router", () => {
  const videoRoute = readRepo("app/api/video/route.ts");
  const premium = readRepo("lib/studio/premium-video-fulfillment.ts");
  const videoBarrel = readRepo("lib/video/index.ts");

  for (const [label, src] of [
    ["/api/video", videoRoute],
    ["premium-video-fulfillment", premium],
    ["lib/video/index.ts", videoBarrel],
  ] as const) {
    assert.doesNotMatch(src, /lib\/video\/router/, `${label} imports router`);
    assert.doesNotMatch(src, /resolveProductionRecipe/, `${label} calls router`);
    assert.doesNotMatch(src, /getCommercialRecipe/, `${label} uses registry`);
    assert.doesNotMatch(src, /veo_native/, `${label} names veo_native`);
    assert.doesNotMatch(
      src,
      /lib\/commercial\/(recipes|production-brief)/,
      `${label} imports Phase 1 commercial modules`,
    );
  }

  assert.match(videoRoute, /generateCommercialVideo\(/);
  assert.match(premium, /generateCommercialVideo\(/);
});
