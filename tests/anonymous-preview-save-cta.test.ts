/**
 * P0 — anonymous Preview must invite save/register before Premium.
 *
 * Run: npx tsx --test tests/anonymous-preview-save-cta.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  ANONYMOUS_PREVIEW_SAVE_BODY,
  ANONYMOUS_PREVIEW_SAVE_CTA,
  ANONYMOUS_PREVIEW_SAVE_HEADLINE,
} from "../lib/studio/anonymous-preview-save.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

test("anonymous Preview save copy communicates preserving the current creation", () => {
  assert.equal(
    ANONYMOUS_PREVIEW_SAVE_HEADLINE,
    "¿Te gustó tu creación? Guárdala.",
  );
  assert.match(
    ANONYMOUS_PREVIEW_SAVE_BODY,
    /conserva este comercial/i,
  );
  assert.match(ANONYMOUS_PREVIEW_SAVE_BODY, /Biblioteca/i);
  assert.equal(ANONYMOUS_PREVIEW_SAVE_CTA, "Guardar mi comercial");
});

test("anonymous Preview renders a visible save invitation in review mode", () => {
  const reveal = readRepo("components/studio/CinematicReveal.tsx");
  const invite = readRepo("components/studio/AnonymousPreviewSaveInvite.tsx");

  assert.match(invite, /anonymous-preview-save-invite/);
  assert.match(invite, /ANONYMOUS_PREVIEW_SAVE_HEADLINE/);
  assert.match(invite, /ANONYMOUS_PREVIEW_SAVE_BODY/);
  assert.match(invite, /ANONYMOUS_PREVIEW_SAVE_CTA/);
  assert.match(reveal, /AnonymousPreviewSaveInvite/);
  assert.match(reveal, /showAnonymousSaveInvite/);
  assert.match(
    reveal,
    /reviewShowPurchase \? \([\s\S]*purchaseBlock[\s\S]*: \([\s\S]*anonymousSaveInviteBlock/,
    "save invite must appear before Premium in invite-stage media footer",
  );
});

test("anonymous Preview save CTA reuses existing auth flow and preserves resume redirect", () => {
  const director = readRepo("components/studio/CreativeDirector.tsx");
  const reveal = readRepo("components/studio/CinematicReveal.tsx");
  const invite = readRepo("components/studio/AnonymousPreviewSaveInvite.tsx");

  assert.match(
    director,
    /showAnonymousSaveInvite=\{[\s\S]*!isAuthenticated && autoSaveStatus === "local-only"/,
    "save invite is anonymous-only",
  );
  assert.match(director, /onAnonymousSave=\{\(\) => void handleOpenLibrary\(\)\}/);
  assert.match(director, /anonymousSaveAuthRedirect=\{studioAuthRedirect\}/);
  assert.match(director, /showAnonymousSaveSignIn=\{showRegistrationInvite\}/);
  assert.match(director, /void requestAuthentication\("save"\)/);
  assert.match(director, /resolveStudioAuthRedirect\(resumeToken\)/);
  assert.doesNotMatch(
    director,
    /href="\/login\?redirect=%2Fstudio"/,
    "must not hardcode plain /studio login redirect",
  );

  assert.match(invite, /onClick=\{onSave\}/);
  assert.match(invite, /redirectTo=\{authRedirectTo\}/);
  assert.match(reveal, /onAnonymousSave/);
});

test("anonymous Preview save invite does not add Share or trigger second generation", () => {
  const director = readRepo("components/studio/CreativeDirector.tsx");
  const reveal = readRepo("components/studio/CinematicReveal.tsx");
  const invite = readRepo("components/studio/AnonymousPreviewSaveInvite.tsx");

  assert.doesNotMatch(invite, /share_slug/);
  assert.doesNotMatch(invite, /ShareCommercialActions/);
  assert.doesNotMatch(invite, /WhatsApp/);
  assert.doesNotMatch(invite, /createCommercialAssets/);
  assert.match(reveal, /Produce tu comercial completo/);
  assert.match(
    readRepo("components/studio/DirectorReviewInvite.tsx"),
    /DIRECTOR_REVIEW_ADJUST_LABEL/,
  );
  assert.doesNotMatch(
    director,
    /onAnonymousSave[\s\S]*createCommercialAssets/,
    "save CTA must not invoke generation",
  );
});

test("authenticated Preview does not show anonymous save invitation wiring", () => {
  const director = readRepo("components/studio/CreativeDirector.tsx");

  assert.match(
    director,
    /!isAuthenticated && autoSaveStatus === "local-only"/,
    "authenticated users must be excluded by anonymous-only guard",
  );
  assert.doesNotMatch(
    director,
    /showAnonymousSaveInvite=\{true\}/,
    "save invite must not be always-on",
  );
});
