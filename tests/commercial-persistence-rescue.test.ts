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

test("reconciliation retries only the existing asset update", () => {
  const persistence = readRepo("lib/studio-persistence.ts");
  const reconciliation = persistence.slice(
    persistence.indexOf("export async function reconcileStudioCreation"),
    persistence.indexOf("export async function persistStudioCreation"),
  );

  assert.match(reconciliation, /finalizeStudioAsset\(recovery/);
  assert.doesNotMatch(reconciliation, /createBibliotecaProject|saveBibliotecaAssets/);
  assert.doesNotMatch(reconciliation, /uploadLibraryObject|dataUrlToBlob/);
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
