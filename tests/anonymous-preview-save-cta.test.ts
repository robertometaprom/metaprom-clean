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
import { NEW_USER_HANDOFF_CTA } from "../lib/studio/new-user-handoff.ts";

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
  assert.equal(NEW_USER_HANDOFF_CTA, ANONYMOUS_PREVIEW_SAVE_CTA);
});

test("anonymous Preview renders a visible save invitation in review mode", () => {
  const reveal = readRepo("components/studio/CinematicReveal.tsx");
  const invite = readRepo("components/studio/AnonymousPreviewSaveInvite.tsx");

  assert.match(invite, /anonymous-preview-save-invite/);
  assert.match(invite, /ANONYMOUS_PREVIEW_SAVE_HEADLINE/);
  assert.match(invite, /ANONYMOUS_PREVIEW_SAVE_BODY/);
  assert.match(invite, /NewUserHandoff/);
  assert.match(reveal, /AnonymousPreviewSaveInvite/);
  assert.match(reveal, /showAnonymousSaveInvite/);
  assert.match(
    reveal,
    /reviewShowPurchase \? \([\s\S]*purchaseBlock[\s\S]*: \([\s\S]*anonymousSaveInviteBlock/,
    "save invite must appear before Premium in invite-stage media footer",
  );
});

test("anonymous Preview save CTA uses NewUserHandoff single-tap auth flow", () => {
  const director = readRepo("components/studio/CreativeDirector.tsx");
  const reveal = readRepo("components/studio/CinematicReveal.tsx");
  const invite = readRepo("components/studio/AnonymousPreviewSaveInvite.tsx");
  const handoff = readRepo("lib/studio/new-user-handoff.ts");

  assert.match(
    director,
    /showAnonymousSaveInvite=\{[\s\S]*!isAuthenticated && autoSaveStatus === "local-only"/,
    "save invite is anonymous-only",
  );
  assert.match(director, /onAnonymousPersistDraft=/);
  assert.match(director, /persistAnonymousDraft\("save"\)/);
  assert.match(director, /resolveStudioAuthRedirect\(resumeToken\)/);
  assert.doesNotMatch(
    director,
    /href="\/login\?redirect=%2Fstudio"/,
    "must not hardcode plain /studio login redirect",
  );

  assert.match(invite, /persistDraft/);
  assert.match(invite, /NewUserHandoff/);
  assert.doesNotMatch(invite, /showSignIn/);
  assert.doesNotMatch(invite, /Continuar con Google/);
  assert.match(reveal, /onAnonymousPersistDraft/);
  assert.match(handoff, /prompt:\s*"select_account"/);
  assert.match(handoff, /buildAuthRedirectUrl/);
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
    /onAnonymousPersistDraft[\s\S]*createCommercialAssets/,
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

test("mobile Preview layout keeps video prominent with save CTA directly below", () => {
  const reveal = readRepo("components/studio/CinematicReveal.tsx");
  const review = readRepo("components/studio/DirectorResultReview.tsx");
  const invite = readRepo("components/studio/AnonymousPreviewSaveInvite.tsx");

  assert.match(reveal, /preview-offer-media/);
  assert.match(reveal, /max-h-\[min\(42vh,72vw\)\]/);
  assert.match(reveal, /pointer-events-none h-full w-full object-contain/);
  assert.match(reveal, /overflow-y-auto overscroll-y-contain/);
  assert.match(reveal, /if \(stage === "offer"\)[\s\S]*document\.body\.style\.overflow = ""/);
  assert.match(reveal, /if \(reviewMode\) return false;/);
  assert.doesNotMatch(invite, /Compartir|ShareCommercialActions|share_slug/);

  assert.match(review, /preview-media-footer/);
  assert.match(
    review,
    /\{media\}[\s\S]*preview-media-footer[\s\S]*\{mediaFooter\}/,
    "save invitation must render directly under preview media on mobile",
  );
  assert.match(review, /justify-start lg:flex-1 lg:basis-\[46%\] lg:justify-center/);
  assert.match(review, /min-h-0[\s\S]*lg:min-h-\[100dvh\]/);
  assert.match(review, /lg:flex-1 lg:flex-row/);
  assert.doesNotMatch(
    review,
    /flex-1 flex-col justify-center lg:basis-\[46%\]/,
    "mobile preview column must not vertically center and push CTAs below fold",
  );

  assert.match(reveal, /Produce tu comercial completo/);
  assert.match(
    readRepo("components/studio/DirectorReviewInvite.tsx"),
    /DIRECTOR_REVIEW_ADJUST_LABEL/,
  );
});
