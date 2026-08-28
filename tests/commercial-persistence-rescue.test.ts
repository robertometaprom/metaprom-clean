import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  approximateSerializedBytes,
  FINAL_ASSET_UPDATE_ATTEMPTS,
  FinalAssetUpdateTimeoutError,
  isTransientPersistenceError,
  omitAlreadyPersistedImageUrl,
  retryFinalAssetUpdate,
  truncatePersistenceDiagnosticText,
} from "../lib/studio-persistence-retry.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const readRepo = (path: string) => readFileSync(join(ROOT, path), "utf8");

test("only structured persistence timeouts are explicitly retryable", () => {
  assert.equal(isTransientPersistenceError({
    code: "PERSISTENCE_TIMEOUT",
    status: 408,
    message: "Final asset update timed out.",
  }), true);
  assert.equal(isTransientPersistenceError({
    code: "PERSISTENCE_REJECTED",
    status: 400,
    message: "Permanent validation failure.",
  }), false);
});

test("successful final commercial persistence returns on the first update", async () => {
  let updates = 0;
  const result = await retryFinalAssetUpdate({
    update: async () => {
      updates += 1;
      return { id: "asset-1", share_slug: "share-1" };
    },
    wait: async () => undefined,
  });

  assert.equal(updates, 1);
  assert.equal(result.id, "asset-1");
  assert.equal(result.share_slug, "share-1");
});

test("transient final-update failure retries and then succeeds", async () => {
  let updates = 0;
  const retries: number[] = [];
  const result = await retryFinalAssetUpdate({
    update: async () => {
      updates += 1;
      if (updates === 1) throw { code: "PGRST000", message: "connection unavailable" };
      return "saved";
    },
    wait: async () => undefined,
    onRetry: (_error, attempt) => retries.push(attempt),
  });

  assert.equal(result, "saved");
  assert.equal(updates, 2);
  assert.deepEqual(retries, [1]);
});

test("permanent final-update failure is explicit and bounded", async () => {
  let updates = 0;
  await assert.rejects(
    retryFinalAssetUpdate({
      attempts: 3,
      update: async () => {
        updates += 1;
        throw { code: "PGRST000", message: "temporary connection failure" };
      },
      wait: async () => undefined,
    }),
    (error: unknown) =>
      typeof error === "object" && error !== null &&
      (error as { code?: string }).code === "PGRST000",
  );
  assert.equal(updates, 3);
});

test("timeout aborts and settles an attempt before retrying without overlap", async () => {
  const timeouts: Array<{ code: string; attempt: number }> = [];
  const events: string[] = [];
  let active = 0;
  let maxActive = 0;
  let attempts = 0;
  const result = await retryFinalAssetUpdate({
    attempts: 2,
    timeoutMs: 5,
    wait: async () => undefined,
    update: async (signal) => {
      attempts += 1;
      active += 1;
      maxActive = Math.max(maxActive, active);
      events.push(`start:${attempts}`);
      if (attempts === 1) {
        await new Promise<void>((resolve) => signal.addEventListener("abort", () => {
          events.push("abort:1");
          active -= 1;
          resolve();
        }, { once: true }));
        throw new DOMException("aborted", "AbortError");
      }
      active -= 1;
      events.push("settled:2");
      return "saved";
    },
    onTimeout: (error, attempt) => timeouts.push({ code: error.code, attempt }),
  });

  assert.equal(result, "saved");
  assert.equal(maxActive, 1);
  assert.deepEqual(events, ["start:1", "abort:1", "start:2", "settled:2"]);
  assert.deepEqual(timeouts, [{ code: "PERSISTENCE_TIMEOUT", attempt: 1 }]);
});

test("minimal final payload omits only image_url and retains final metadata", () => {
  const finalPayload = omitAlreadyPersistedImageUrl({
    image_url: `data:image/png;base64,${"x".repeat(2_700_000)}`,
    image_prompt: "image prompt",
    video_prompt: "video prompt",
    ai_instructions: "customer intent",
    original_path: "user/project/asset/original.png",
    image_path: "user/project/asset/enhanced.png",
    teaser_video_path: "user/project/asset/teaser.mp4",
    share_slug: "share-106",
    visibility: "public",
    creative_recipe: { version: 1 },
  });

  assert.equal("image_url" in finalPayload, false);
  assert.equal(finalPayload.image_prompt, "image prompt");
  assert.equal(finalPayload.video_prompt, "video prompt");
  assert.equal(finalPayload.ai_instructions, "customer intent");
  assert.equal(finalPayload.teaser_video_path, "user/project/asset/teaser.mp4");
  assert.equal(finalPayload.share_slug, "share-106");
  assert.equal(finalPayload.visibility, "public");
  assert.deepEqual(finalPayload.creative_recipe, { version: 1 });
  assert.ok((approximateSerializedBytes(finalPayload) ?? Infinity) < 1_000);
});

test("finalization logs size, dispatch, response and timeout without payload contents", () => {
  const persistence = readRepo("lib/studio-persistence.ts");

  assert.match(persistence, /asset update:finalization started/);
  assert.match(persistence, /asset update:patch dispatched/);
  assert.match(persistence, /asset update:patch response/);
  assert.match(persistence, /asset update:timeout/);
  assert.match(persistence, /payloadBytes/);
  assert.doesNotMatch(persistence, /onStage\?\.\([^\n]*enhancedDataUrl/);
});

test("final payload construction omits image_url without nullifying it", () => {
  const persistence = readRepo("lib/studio-persistence.ts");
  const payloadConstruction = persistence.slice(
    persistence.indexOf("if (!recovery.uploadedPaths.original)"),
    persistence.indexOf("let existingShareSlug"),
  );

  assert.match(payloadConstruction, /omitAlreadyPersistedImageUrl/);
  assert.match(payloadConstruction, /image_url: input\.enhancedDataUrl/);
  assert.doesNotMatch(payloadConstruction, /image_url:\s*null/);
  assert.match(payloadConstruction, /original_path/);
  assert.match(payloadConstruction, /image_path/);
  assert.match(payloadConstruction, /image_prompt/);
  assert.match(payloadConstruction, /video_prompt/);
  assert.match(payloadConstruction, /ai_instructions/);
});

test("diagnostic text is behaviorally bounded and payload contents are absent", () => {
  const persistence = readRepo("lib/studio-persistence.ts");
  const bounded = truncatePersistenceDiagnosticText("x".repeat(5_000));
  assert.equal(typeof bounded, "string");
  assert.equal((bounded as string).length, 501);
  assert.match(persistence, /truncatePersistenceDiagnosticText\(candidate\.message\)/);
  assert.match(persistence, /truncatePersistenceDiagnosticText\(candidate\.details\)/);
  assert.match(persistence, /truncatePersistenceDiagnosticText\(candidate\.hint\)/);
  assert.doesNotMatch(persistence, /console\.error\([^)]*recovery\.updates/);
  assert.match(persistence, /status: "aborted"/);
  assert.match(persistence, /aborted: true/);
});

test("collision replacement share slug is checkpointed in pending recovery updates", () => {
  const persistence = readRepo("lib/studio-persistence.ts");
  assert.match(persistence, /onShareSlugChanged\?\.\(replacementShareSlug\)/);
  assert.match(
    persistence,
    /recovery\.updates = omitAlreadyPersistedImageUrl\(\{[\s\S]*?share_slug: shareSlug/,
  );
  assert.match(persistence, /throw new StudioPersistenceError\(recovery, error\)/);
});

test("project and asset identities are checkpointed immediately after creation", () => {
  const persistence = readRepo("lib/studio-persistence.ts");

  assert.match(persistence, /recovery\.projectId = project\.id;[\s\S]*?project insert:success/);
  assert.match(persistence, /recovery\.assetId = asset\.id;[\s\S]*?asset insert:success/);
});

test("structured failures retain partial ids, paths, pending updates and safe error fields", () => {
  const persistence = readRepo("lib/studio-persistence.ts");

  assert.match(persistence, /projectId: string \| null/);
  assert.match(persistence, /assetId: string \| null/);
  assert.match(persistence, /uploadedPaths:[\s\S]*?original: string \| null[\s\S]*?enhanced: string \| null[\s\S]*?teaser: string \| null/);
  assert.match(persistence, /updates: Partial<BibliotecaAsset>/);
  assert.match(persistence, /error: Record<string, unknown> \| null/);
  assert.match(persistence, /recovery\.error = safePersistenceError\(cause\)/);
});

test("reconciliation resumes from recovery instead of restarting from zero", () => {
  const persistence = readRepo("lib/studio-persistence.ts");
  const reconciliation = persistence.slice(
    persistence.indexOf("export async function reconcileStudioCreation"),
    persistence.indexOf("export async function persistStudioCreation"),
  );

  assert.match(reconciliation, /runStudioPersistence\(recovery\.input, recovery, true/);
});

test("retry with a project id cannot insert a second project", () => {
  const persistence = readRepo("lib/studio-persistence.ts");
  assert.match(persistence, /if \(!recovery\.projectId\) \{[\s\S]*?createBibliotecaProject/);
  assert.match(persistence, /else if \(!reconciling\) \{[\s\S]*?updateBibliotecaProject/);
});

test("retry with an asset id cannot insert a second asset", () => {
  const persistence = readRepo("lib/studio-persistence.ts");
  assert.match(persistence, /if \(!recovery\.assetId\) \{[\s\S]*?saveBibliotecaAssets/);
});

test("completed uploads are reused and never uploaded again", () => {
  const persistence = readRepo("lib/studio-persistence.ts");

  assert.match(persistence, /if \(!recovery\.uploadedPaths\.original\) \{[\s\S]*?uploadLibraryObject/);
  assert.match(persistence, /if \(!recovery\.uploadedPaths\.enhanced\) \{[\s\S]*?uploadLibraryObject/);
  assert.match(persistence, /if \(!recovery\.uploadedPaths\.teaser\) \{[\s\S]*?uploadLibraryObject/);
});

test("one authenticated mutation context is shared by project, asset, update and storage operations", () => {
  const persistence = readRepo("lib/studio-persistence.ts");
  const biblioteca = readRepo("lib/biblioteca.ts");

  assert.match(persistence, /const context = await createBibliotecaMutationContext\(input\.userId\)/);
  assert.match(persistence, /createBibliotecaProject\([\s\S]*?context,/);
  assert.match(persistence, /saveBibliotecaAssets\([\s\S]*?\], context\)/);
  assert.match(persistence, /finalizeStudioAsset\(recovery, onStage, context\)/);
  assert.match(persistence, /uploadLibraryObject\([\s\S]*?context\.client\)/);
  assert.match(biblioteca, /if \(expectedUserId && user\.id !== expectedUserId\)/);
});

test("Reintentar guardado invokes reconciliation only and retains partial ids", () => {
  const creation = readRepo("lib/studio-creation.ts");
  const director = readRepo("components/studio/CreativeDirector.tsx");

  const retry = creation.slice(
    creation.indexOf("export async function retryCreationPersistence"),
    creation.indexOf("/**\n * Server-first Commercial authorization"),
  );
  assert.match(retry, /reconcileStudioCreation\(recovery/);
  assert.doesNotMatch(retry, /persistStudioCreation/);
  assert.match(director, /result\.status === "persistence-error"[\s\S]*?savedProjectIdRef\.current = result\.projectId[\s\S]*?savedAssetIdRef\.current = result\.assetId/);
});

test("persistence retry contains no media generation calls", () => {
  const creation = readRepo("lib/studio-creation.ts");
  const retry = creation.slice(
    creation.indexOf("export async function retryCreationPersistence"),
    creation.indexOf("/**\n * Server-first Commercial authorization"),
  );

  assert.doesNotMatch(retry, /createCommercialAssets|createAdvertisingImage|\/api\/video|Veo|generate/);
});

test("Studio blocks Preview and checkout until persistence is verified", () => {
  const director = readRepo("components/studio/CreativeDirector.tsx");

  assert.match(
    director,
    /if \(persistResult\.status !== "saved" \|\| !persistResult\.assetId\)[\s\S]*?return;[\s\S]*?setPhase\("preview"\)/,
  );
  assert.match(
    director,
    /if \(!savedAssetIdRef\.current\)[\s\S]*?Termina de guardar tu comercial antes de desbloquearlo\.[\s\S]*?return;/,
  );
  assert.match(director, /Reintentar guardado/);
  assert.match(director, /retryCreationPersistence\(recovery\)/);
});

test("successful persistence preserves Preview, share and unlock wiring", () => {
  const director = readRepo("components/studio/CreativeDirector.tsx");

  assert.match(director, /<CinematicReveal/);
  assert.match(director, /shareSlug=\{shareSlug\}/);
  assert.match(director, /onUnlock=\{handleUnlock\}/);
  assert.match(director, /setCheckoutAssetId\(result\.assetId\)/);
  assert.match(director, /setPhase\("preview"\)/);
});

const ASSET_106_STORED_IMAGE_URL = "https://library.example/106-inserted.png";
const ASSET_107_STORED_IMAGE_URL = "https://library.example/107-inserted.png";

function fixtureAsset106PartialState() {
  const insertedImageUrl = `data:image/png;base64,${"A".repeat(2_700_000)}`;
  return {
    userId: "user-106",
    projectId: "project-106",
    assetId: "106",
    storedImageUrl: ASSET_106_STORED_IMAGE_URL,
    insertedImageUrl,
    existingShareSlug: null,
    uploadedPaths: {
      original: "user-106/project-106/106/original.jpg",
      enhanced: "user-106/project-106/106/enhanced.png",
      teaser: "user-106/project-106/106/teaser.mp4",
    },
    pendingMetadata: omitAlreadyPersistedImageUrl({
      image_url: insertedImageUrl,
      original_path: "user-106/project-106/106/original.jpg",
      image_path: "user-106/project-106/106/enhanced.png",
      teaser_video_path: "user-106/project-106/106/teaser.mp4",
      image_prompt: "106 image prompt",
      video_prompt: "106 video prompt",
      ai_instructions: "106 customer intent",
      share_slug: "share-106",
      visibility: "public",
      creative_recipe: { version: 1 },
    }),
  };
}

function fixtureAsset107PartialState() {
  const insertedImageUrl = `data:image/png;base64,${"B".repeat(2_700_000)}`;
  return {
    userId: "user-107",
    projectId: "project-107",
    assetId: "107",
    storedImageUrl: ASSET_107_STORED_IMAGE_URL,
    insertedImageUrl,
    existingShareSlug: null,
    uploadedPaths: {
      original: "user-107/project-107/107/original.jpg",
      enhanced: "user-107/project-107/107/enhanced.png",
      teaser: "user-107/project-107/107/teaser.mp4",
    },
    pendingMetadata: omitAlreadyPersistedImageUrl({
      image_url: insertedImageUrl,
      original_path: "user-107/project-107/107/original.jpg",
      image_path: "user-107/project-107/107/enhanced.png",
      teaser_video_path: "user-107/project-107/107/teaser.mp4",
      image_prompt: "107 image prompt",
      video_prompt: "107 video prompt",
      ai_instructions: "107 customer intent",
      share_slug: "share-107-replacement",
      visibility: "public",
      creative_recipe: { version: 1 },
    }),
  };
}

function applyFinalAssetPatch(
  stored: { image_url: string } & Record<string, unknown>,
  patch: Record<string, unknown>,
): { image_url: string } & Record<string, unknown> {
  assert.equal("image_url" in patch, false);
  assert.notEqual(patch.image_url, null);
  return { ...stored, ...patch };
}

test("final PATCH omits image_url and preserves the already-stored value", () => {
  const fixture = fixtureAsset106PartialState();
  const stored: { image_url: string } & Record<string, unknown> = {
    id: fixture.assetId,
    image_url: fixture.storedImageUrl,
    original_path: null,
    image_path: null,
  };

  const patched = applyFinalAssetPatch(stored, fixture.pendingMetadata);

  assert.equal("image_url" in fixture.pendingMetadata, false);
  assert.equal(patched.image_url, ASSET_106_STORED_IMAGE_URL);
  assert.equal(patched.original_path, fixture.uploadedPaths.original);
  assert.equal(patched.image_path, fixture.uploadedPaths.enhanced);
  assert.equal(patched.teaser_video_path, fixture.uploadedPaths.teaser);
  assert.equal(patched.share_slug, "share-106");
  assert.equal(patched.image_prompt, "106 image prompt");
  assert.equal(patched.video_prompt, "106 video prompt");
  assert.equal(patched.ai_instructions, "106 customer intent");
  assert.equal(patched.visibility, "public");
});

test("timeout aborts the actual request and produces retryable PERSISTENCE_TIMEOUT", async () => {
  let fetchAborted = false;
  let fetchStarted = false;
  await assert.rejects(
    retryFinalAssetUpdate({
      attempts: 1,
      timeoutMs: 5,
      wait: async () => undefined,
      update: async (signal) => {
        fetchStarted = true;
        await new Promise<void>((_resolve, reject) => {
          const hung = globalThis.setTimeout(() => {
            reject(new Error("underlying request was not aborted"));
          }, 1_000);
          signal.addEventListener("abort", () => {
            fetchAborted = true;
            globalThis.clearTimeout(hung);
            reject(new DOMException("The user aborted a request.", "AbortError"));
          }, { once: true });
        });
      },
    }),
    (error: unknown) =>
      error instanceof FinalAssetUpdateTimeoutError &&
      error.code === "PERSISTENCE_TIMEOUT" &&
      error.status === 408 &&
      isTransientPersistenceError(error),
  );
  assert.equal(fetchStarted, true);
  assert.equal(fetchAborted, true);
});

test("max final persistence attempts is 3", async () => {
  let updates = 0;
  await assert.rejects(
    retryFinalAssetUpdate({
      update: async () => {
        updates += 1;
        throw new FinalAssetUpdateTimeoutError(5);
      },
      wait: async () => undefined,
    }),
    (error: unknown) => error instanceof FinalAssetUpdateTimeoutError,
  );
  assert.equal(FINAL_ASSET_UPDATE_ATTEMPTS, 3);
  assert.equal(updates, 3);
});

test("permanent 4xx persistence rejection is not retried", async () => {
  let updates = 0;
  await assert.rejects(
    retryFinalAssetUpdate({
      update: async () => {
        updates += 1;
        throw {
          code: "PERSISTENCE_REJECTED",
          status: 400,
          message: "Permanent validation failure.",
        };
      },
      wait: async () => undefined,
    }),
    (error: unknown) =>
      typeof error === "object" &&
      error !== null &&
      (error as { status?: number }).status === 400,
  );
  assert.equal(updates, 1);
});

test("asset 106/107 fixtures retain ids, storage paths and replacement share slug", () => {
  const asset106 = fixtureAsset106PartialState();
  const asset107 = fixtureAsset107PartialState();

  assert.equal(asset106.projectId, "project-106");
  assert.equal(asset106.assetId, "106");
  assert.equal(asset106.uploadedPaths.original, "user-106/project-106/106/original.jpg");
  assert.equal(asset106.uploadedPaths.enhanced, "user-106/project-106/106/enhanced.png");
  assert.equal(asset106.uploadedPaths.teaser, "user-106/project-106/106/teaser.mp4");
  assert.equal(asset106.pendingMetadata.share_slug, "share-106");

  assert.equal(asset107.projectId, "project-107");
  assert.equal(asset107.assetId, "107");
  assert.equal(asset107.uploadedPaths.original, "user-107/project-107/107/original.jpg");
  assert.equal(asset107.uploadedPaths.enhanced, "user-107/project-107/107/enhanced.png");
  assert.equal(asset107.uploadedPaths.teaser, "user-107/project-107/107/teaser.mp4");
  assert.equal(asset107.pendingMetadata.share_slug, "share-107-replacement");

  const recovered107 = {
    ...asset107,
    pendingMetadata: {
      ...asset107.pendingMetadata,
      share_slug: "share-107-replacement",
    },
  };
  assert.equal(recovered107.projectId, asset107.projectId);
  assert.equal(recovered107.assetId, asset107.assetId);
  assert.deepEqual(recovered107.uploadedPaths, asset107.uploadedPaths);
  assert.equal(recovered107.pendingMetadata.share_slug, "share-107-replacement");
});

test("reconciliation is persistence-only and does not generate, upload, create or consume", () => {
  const persistence = readRepo("lib/studio-persistence.ts");
  const biblioteca = readRepo("lib/biblioteca.ts");
  const creation = readRepo("lib/studio-creation.ts");
  const retry = creation.slice(
    creation.indexOf("export async function retryCreationPersistence"),
    creation.indexOf("async function tryConsumePrepaidCommercial"),
  );
  const run = persistence.slice(
    persistence.indexOf("async function runStudioPersistence"),
    persistence.indexOf("export async function persistPremiumVideo"),
  );
  const updateAsset = biblioteca.slice(
    biblioteca.indexOf("export async function updateBibliotecaAsset"),
  );

  assert.match(run, /const context = await createBibliotecaMutationContext\(input\.userId\)/);
  assert.match(run, /if \(!recovery\.projectId\) \{[\s\S]*?createBibliotecaProject/);
  assert.match(run, /if \(!recovery\.assetId\) \{[\s\S]*?saveBibliotecaAssets/);
  assert.match(run, /if \(!recovery\.uploadedPaths\.original\) \{[\s\S]*?uploadLibraryObject/);
  assert.match(run, /if \(!recovery\.uploadedPaths\.enhanced\) \{[\s\S]*?uploadLibraryObject/);
  assert.match(run, /if \(!recovery\.uploadedPaths\.teaser\) \{[\s\S]*?uploadLibraryObject/);
  assert.match(run, /dataUrlToBlob\(input\.enhancedDataUrl\)/);
  assert.doesNotMatch(run, /\/api\/video|generateVideos|generateCommercialVideo|consume-commercial|consume-advertising/);
  assert.doesNotMatch(retry, /\/api\/video|generateVideos|generateCommercialVideo|consume-commercial|consume-advertising/);
  assert.match(retry, /reconcileStudioCreation\(recovery/);
  assert.doesNotMatch(retry, /persistStudioCreation/);
  assert.match(updateAsset, /\.abortSignal\(signal\)[\s\S]*?\.maybeSingle\(\)/);
  assert.match(updateAsset, /\.abortSignal\(signal\)[\s\S]*?\.single\(\)/);
  assert.doesNotMatch(updateAsset, /\.single\(\)\s*\n\s*\.abortSignal/);
  assert.doesNotMatch(updateAsset, /\.maybeSingle\(\)\s*\n\s*\.abortSignal/);
});

test("pre-finalization gap telemetry is fire-and-forget and preserves error propagation", () => {
  const persistence = readRepo("lib/studio-persistence.ts");
  const telemetry = readRepo("lib/studio-persistence-telemetry.ts");
  const gap = persistence.slice(
    persistence.indexOf('stage: "post_upload_fetch_success"'),
    persistence.indexOf("const asset = await finalizeStudioAsset"),
  );

  assert.match(telemetry, /"pre_finalization_start"/);
  assert.match(telemetry, /"resolve_share_slug_start"/);
  assert.match(telemetry, /"resolve_share_slug_success"/);
  assert.match(telemetry, /"resolve_share_slug_error"/);
  assert.match(telemetry, /"recipe_build_start"/);
  assert.match(telemetry, /"recipe_build_success"/);
  assert.match(telemetry, /"recipe_build_error"/);
  assert.match(telemetry, /"pre_finalization_complete"/);
  assert.match(telemetry, /void fetch\("\/api\/studio\/persistence-telemetry"/);
  assert.doesNotMatch(telemetry, /await fetch\(/);

  assert.match(
    gap,
    /post_upload_fetch_success[\s\S]*pre_finalization_start[\s\S]*resolve_share_slug_start[\s\S]*resolveShareSlug\([\s\S]*resolve_share_slug_success[\s\S]*recipe_build_start[\s\S]*buildCreativeRecipeV1\([\s\S]*recipe_build_success[\s\S]*pre_finalization_complete/,
  );
  assert.match(
    gap,
    /emitPersistenceTelemetryError\(\s*"resolve_share_slug_error"[\s\S]*?throw error;/,
  );
  assert.match(
    gap,
    /emitPersistenceTelemetryError\(\s*"recipe_build_error"[\s\S]*?throw error;/,
  );
  assert.doesNotMatch(persistence, /await emitPersistenceTelemetry/);
  assert.doesNotMatch(gap, /share_slug: shareSlug[\s\S]*console\.(log|info|debug)\(shareSlug/);
  assert.doesNotMatch(gap, /JSON\.stringify\(recipe\)/);
});
