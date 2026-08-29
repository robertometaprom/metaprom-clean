/**
 * Isolated “Generar sin foto” peer action on the Director photo choices.
 *
 * Run: npx tsx --test tests/generate-without-photo.test.ts
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

const capture = readRepo("components/studio/InstantCaptureButtons.tsx");
const director = readRepo("components/studio/CreativeDirector.tsx");

function photoActionsBlock(): string {
  const start = director.indexOf("photoActions={");
  assert.ok(start >= 0, "photoActions is defined on CreativeDirector");
  const end = director.indexOf("accountActions={", start);
  assert.ok(end > start, "photoActions block ends before accountActions");
  return director.slice(start, end);
}

test("Tomar foto and Subir foto(s) remain the Director photo choices", () => {
  const block = photoActionsBlock();
  assert.match(block, /galleryLabel="Subir foto\(s\)"/);
  assert.match(block, /cameraLabel="Tomar foto"/);
  assert.match(
    block,
    /onFileSelected=\{\(file\) => \{\s*applySelectedFile\(file\);/,
  );
  assert.match(
    block,
    /onFilesSelected=\{\(files\) => \{\s*appendSourceFiles\(files\);/,
  );
});

test("Generar sin foto reuses the existing welcome→upload transition only", () => {
  const block = photoActionsBlock();
  assert.match(
    block,
    /onSkipPhoto=\{\(\) => \{\s*setPhase\(\(current\) =>\s*current === "welcome" \? "upload" : current,/,
  );
  assert.doesNotMatch(block, /onSkipPhoto[\s\S]*applySelectedFile/);
  assert.doesNotMatch(block, /onSkipPhoto[\s\S]*appendSourceFiles/);
  assert.doesNotMatch(block, /onSkipPhoto[\s\S]*createAdvertisingImage/);
  assert.doesNotMatch(block, /onSkipPhoto[\s\S]*createCommercialAssets/);
  assert.doesNotMatch(block, /onSkipPhoto[\s\S]*runCreation/);
});

test("skip-photo button is opt-in and does not open camera or gallery inputs", () => {
  assert.match(capture, /onSkipPhoto\?: \(\) => void/);
  assert.match(
    capture,
    /skipPhotoLabel \?\?\s*\(locale === "en" \? "Generate without photo" : "Generar sin foto"\)/,
  );
  assert.match(
    capture,
    /const skipPhotoButton = onSkipPhoto \? \([\s\S]*onClick=\{onSkipPhoto\}/,
  );
  assert.doesNotMatch(
    capture,
    /skipPhotoButton[\s\S]*galleryInputRef\.current\?\.click/,
  );
  assert.doesNotMatch(
    capture,
    /skipPhotoButton[\s\S]*cameraInputRef\.current\?\.click/,
  );
  assert.doesNotMatch(capture, /skipPhotoButton[\s\S]*setWebcamOpen\(true\)/);
});

test("upload-phase InstantCaptureButtons still has no skip-photo action", () => {
  const uploadStart = director.indexOf('{phase === "upload" &&');
  const uploadEnd = director.indexOf('{phase === "creation_mode" &&', uploadStart);
  const uploadBlock = director.slice(uploadStart, uploadEnd);
  assert.match(uploadBlock, /<InstantCaptureButtons/);
  assert.doesNotMatch(uploadBlock, /onSkipPhoto/);
});
