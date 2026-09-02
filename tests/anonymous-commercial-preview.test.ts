/**
 * September 1 production incident — anonymous commercial stuck at 96%.
 *
 * Run: npx tsx --test tests/anonymous-commercial-preview.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function extractRunCreationCommercialBlock(source: string): string {
  const start = source.indexOf("const result = await createCommercialAssets({");
  assert.ok(start >= 0, "createCommercialAssets block should exist");
  const end = source.indexOf("} catch (createError)", start);
  assert.ok(end > start, "runCreation commercial try block should exist");
  return source.slice(start, end);
}

test("incident regression — local-only anonymous draft completes to Preview", () => {
  const director = readRepo("components/studio/CreativeDirector.tsx");
  const commercialBlock = extractRunCreationCommercialBlock(director);

  assert.match(
    director,
    /result\.status === "local-only"[\s\S]*?anonymousDraftSaved = true/,
    "persistToLibrary must record successful anonymous draft persistence",
  );
  assert.match(
    commercialBlock,
    /const anonymousCommercialReady =[\s\S]*?persistResult\.status === "local-only"[\s\S]*?anonymousDraftSaved === true[\s\S]*?videoUrlRef\.current/,
    "runCreation must treat successful local-only + in-memory video as ready",
  );
  assert.match(
    commercialBlock,
    /if \(!authenticatedCommercialSaved && !anonymousCommercialReady\)[\s\S]*?setCreationProgressComplete\(false\)[\s\S]*?return;/,
    "non-ready persistence must remain fail-closed",
  );
  assert.match(
    commercialBlock,
    /setCreationProgressComplete\(true\)[\s\S]*?setPhase\("preview"\)/,
    "successful anonymous commercial must reach Preview completion",
  );
  assert.doesNotMatch(
    commercialBlock,
    /if \(persistResult\.status !== "saved" \|\| !persistResult\.assetId\)/,
    "must not blanket-block Preview on local-only after incident fix",
  );
});

test("incident regression — successful local-only path reuses generated video without second generation", () => {
  const director = readRepo("components/studio/CreativeDirector.tsx");
  const commercialBlock = extractRunCreationCommercialBlock(director);

  assert.match(
    commercialBlock,
    /setVideoUrl\(result\.videoUrl\)[\s\S]*?await persistToLibrary/,
    "generated video must be set before persistence",
  );
  assert.match(
    commercialBlock,
    /videoUrlRef\.current = result\.videoUrl/,
    "generated video must remain in memory for Preview",
  );
  assert.doesNotMatch(
    commercialBlock,
    /await createCommercialAssets\([\s\S]*?await createCommercialAssets\(/,
    "commercial generation must not run twice in runCreation",
  );
  assert.doesNotMatch(
    commercialBlock,
    /anonymousCommercialReady[\s\S]*?createCommercialAssets/,
    "anonymous completion must not trigger another generation",
  );
});

test("incident regression — Preview does not require assetId for anonymous local-only", () => {
  const director = readRepo("components/studio/CreativeDirector.tsx");
  const commercialBlock = extractRunCreationCommercialBlock(director);
  const previewGate = director.slice(
    director.indexOf('{phase === "preview"'),
    director.indexOf("{draftRecoveryError"),
  );

  assert.doesNotMatch(
    commercialBlock,
    /anonymousCommercialReady[\s\S]*?assetId/,
    "anonymous ready path must not gate on assetId",
  );
  assert.match(previewGate, /phase === "preview"[\s\S]*?videoUrl &&/);
  assert.match(previewGate, /<CinematicReveal/);
  assert.doesNotMatch(previewGate, /savedAssetIdRef\.current/);
});

test("incident regression — failed anonymous draft persistence stays fail-closed", () => {
  const director = readRepo("components/studio/CreativeDirector.tsx");

  assert.match(
    director,
    /Anonymous draft persistence failed/,
    "draft persistence failure must remain explicit",
  );
  assert.match(
    director,
    /anonymousDraftSaved = true[\s\S]*?catch \(draftError\)/,
    "anonymousDraftSaved must only flip on successful draft save",
  );
});

test("authenticated commercial saved path remains unchanged", () => {
  const director = readRepo("components/studio/CreativeDirector.tsx");
  const commercialBlock = extractRunCreationCommercialBlock(director);

  assert.match(
    commercialBlock,
    /const authenticatedCommercialSaved =[\s\S]*?persistResult\.status === "saved"[\s\S]*?persistResult\.assetId/,
    "authenticated flow must still require saved + assetId",
  );
  assert.match(
    commercialBlock,
    /if \(!authenticatedCommercialSaved && !anonymousCommercialReady\)/,
    "authenticated and anonymous success paths must remain distinct",
  );
  assert.match(
    director,
    /if \(result\.status === "saved" && result\.assetId\)/,
    "persistToLibrary must still checkpoint assetId for authenticated saves",
  );
  assert.match(
    director,
    /if \(!savedAssetIdRef\.current\)[\s\S]*?Termina de guardar tu comercial antes de desbloquearlo\./,
    "checkout unlock must still require persisted assetId",
  );
});

test("anonymous draft and claim architecture remain untouched", () => {
  const director = readRepo("components/studio/CreativeDirector.tsx");

  assert.match(director, /persistAnonymousDraft/);
  assert.match(director, /saveStudioDraft/);
  assert.match(director, /setResumeToken\(result\.resumeToken\)/);
  assert.match(director, /buildAuthRedirectUrl/);
  assert.doesNotMatch(director, /\/api\/studio\/draft\/claim/);
});

test("generation APIs and providers remain outside this fix", () => {
  const director = readRepo("components/studio/CreativeDirector.tsx");
  const commercialBlock = extractRunCreationCommercialBlock(director);

  assert.doesNotMatch(commercialBlock, /\/api\/enhancement/);
  assert.doesNotMatch(commercialBlock, /\/api\/video/);
  assert.doesNotMatch(commercialBlock, /Veo/);
  assert.match(commercialBlock, /await createCommercialAssets\(/);
  assert.match(commercialBlock, /await persistToLibrary\(/);
});
