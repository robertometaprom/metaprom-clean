import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  approximateSerializedBytes,
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
    persistence.indexOf("let teaserUpdates"),
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
    /recovery\.updates = \{ \.\.\.recovery\.updates, share_slug: shareSlug \}/,
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
