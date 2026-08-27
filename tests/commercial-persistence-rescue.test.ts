import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { retryFinalAssetUpdate } from "../lib/studio-persistence-retry.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const readRepo = (path: string) => readFileSync(join(ROOT, path), "utf8");

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
