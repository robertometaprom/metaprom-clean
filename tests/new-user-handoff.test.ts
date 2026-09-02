/**
 * NewUserHandoff — single-tap save → OAuth orchestration.
 *
 * Run: npx tsx --test tests/new-user-handoff.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  executeNewUserHandoff,
  isNewUserHandoffBusy,
  NEW_USER_HANDOFF_CTA,
  NEW_USER_HANDOFF_ERROR,
  NEW_USER_HANDOFF_PREPARING,
  NEW_USER_HANDOFF_REDIRECTING,
  newUserHandoffButtonLabel,
} from "../lib/studio/new-user-handoff.ts";
import { ANONYMOUS_PREVIEW_SAVE_CTA } from "../lib/studio/anonymous-preview-save.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

test("NewUserHandoff copy and busy gate are explicit", () => {
  assert.equal(NEW_USER_HANDOFF_CTA, "Guardar mi comercial");
  assert.equal(NEW_USER_HANDOFF_CTA, ANONYMOUS_PREVIEW_SAVE_CTA);
  assert.equal(NEW_USER_HANDOFF_PREPARING, "Preparando tu comercial...");
  assert.equal(NEW_USER_HANDOFF_REDIRECTING, "Abriendo Google...");
  assert.match(NEW_USER_HANDOFF_ERROR, /Intenta de nuevo/);
  assert.doesNotMatch(NEW_USER_HANDOFF_ERROR, /draft|token|OAuth|claim/i);

  assert.equal(newUserHandoffButtonLabel("idle"), NEW_USER_HANDOFF_CTA);
  assert.equal(newUserHandoffButtonLabel("preparing"), NEW_USER_HANDOFF_PREPARING);
  assert.equal(
    newUserHandoffButtonLabel("redirecting"),
    NEW_USER_HANDOFF_REDIRECTING,
  );
  assert.equal(newUserHandoffButtonLabel("error"), NEW_USER_HANDOFF_CTA);

  assert.equal(isNewUserHandoffBusy("idle"), false);
  assert.equal(isNewUserHandoffBusy("error"), false);
  assert.equal(isNewUserHandoffBusy("preparing"), true);
  assert.equal(isNewUserHandoffBusy("redirecting"), true);
});

test("single tap persists draft then initiates OAuth without second tap", async () => {
  const phases: string[] = [];
  let persistCalls = 0;
  let oauthCalls = 0;
  let oauthRedirect: string | null = null;

  const resumeToken = await executeNewUserHandoff({
    persistDraft: async () => {
      persistCalls += 1;
      return "resume-token-abc";
    },
    buildRedirect: (token) => `/studio?resume=${encodeURIComponent(token)}`,
    startOAuth: async (redirectTo) => {
      oauthCalls += 1;
      oauthRedirect = redirectTo;
    },
    onPhase: (phase) => phases.push(phase),
  });

  assert.equal(resumeToken, "resume-token-abc");
  assert.equal(persistCalls, 1);
  assert.equal(oauthCalls, 1);
  assert.equal(oauthRedirect, "/studio?resume=resume-token-abc");
  assert.deepEqual(phases, ["preparing", "redirecting"]);
});

test("persistence error never reaches OAuth and stays human-safe", async () => {
  const phases: string[] = [];
  let oauthCalls = 0;

  await assert.rejects(
    () =>
      executeNewUserHandoff({
        persistDraft: async () => {
          throw new Error("storage exploded");
        },
        startOAuth: async () => {
          oauthCalls += 1;
        },
        onPhase: (phase) => phases.push(phase),
      }),
    /storage exploded/,
  );

  assert.equal(oauthCalls, 0);
  assert.deepEqual(phases, ["preparing"]);
});

test("NewUserHandoff OAuth requests prompt=select_account and preserves callback", () => {
  const handoff = readRepo("lib/studio/new-user-handoff.ts");
  const callback = readRepo("app/auth/callback/route.ts");
  const googleButton = readRepo("components/GoogleSignInButton.tsx");

  assert.match(handoff, /provider:\s*"google"/);
  assert.match(handoff, /prompt:\s*"select_account"/);
  assert.match(handoff, /queryParams:\s*\{/);
  assert.match(handoff, /\/auth\/callback/);
  assert.match(handoff, /searchParams\.set\("next", redirectTo\)/);
  assert.doesNotMatch(handoff, /scopes:/);

  assert.match(callback, /getSafeRedirectPath/);
  assert.match(callback, /exchangeCodeForSession/);
  assert.doesNotMatch(
    handoff,
    /app\/auth\/callback/,
    "handoff must not rewrite callback route",
  );

  // General login button may omit select_account; handoff owns the chooser.
  assert.doesNotMatch(googleButton, /select_account/);
});

test("NewUserHandoff UI blocks duplicate taps and replaces fragile CTA swap", () => {
  const ui = readRepo("components/studio/NewUserHandoff.tsx");
  const invite = readRepo("components/studio/AnonymousPreviewSaveInvite.tsx");
  const director = readRepo("components/studio/CreativeDirector.tsx");
  const reveal = readRepo("components/studio/CinematicReveal.tsx");

  assert.match(ui, /inFlightRef/);
  assert.match(ui, /disabled=\{busy\}/);
  assert.match(ui, /executeNewUserHandoff/);
  assert.match(ui, /NEW_USER_HANDOFF_ERROR/);
  assert.match(ui, /data-testid="anonymous-preview-save-cta"/);

  assert.match(invite, /NewUserHandoff/);
  assert.match(invite, /persistDraft/);
  assert.doesNotMatch(invite, /showSignIn/);
  assert.doesNotMatch(invite, /GoogleSignInButton/);
  assert.doesNotMatch(invite, /Continuar con Google/);

  assert.match(reveal, /onAnonymousPersistDraft/);
  assert.doesNotMatch(reveal, /showAnonymousSaveSignIn/);
  assert.doesNotMatch(reveal, /onAnonymousSave/);

  assert.match(director, /onAnonymousPersistDraft=/);
  assert.match(director, /persistAnonymousDraft\("save"\)/);
  assert.doesNotMatch(
    director,
    /onAnonymousSave=\{\(\) => void handleOpenLibrary\(\)\}/,
  );
  assert.doesNotMatch(director, /showAnonymousSaveSignIn/);
});

test("resume token + claim + Biblioteca contracts remain the existing ones", () => {
  const handoff = readRepo("lib/studio/new-user-handoff.ts");
  const director = readRepo("components/studio/CreativeDirector.tsx");
  const client = readRepo("lib/studio-draft/client.ts");
  const callback = readRepo("app/auth/callback/route.ts");

  assert.match(handoff, /buildAuthRedirectUrl/);
  assert.match(client, /buildStudioResumeUrl/);
  assert.match(
    readRepo("lib/studio-draft/types.ts"),
    /\/studio\?resume=\$\{encodeURIComponent\(resumeToken\)\}/,
  );
  assert.match(director, /await claimStudioDraft\(token\)/);
  assert.match(director, /await applyClaimResult\(claimResult\)/);
  assert.match(
    director,
    /onOpenLibrary\?\.\(\{[\s\S]*projectId: claimResult\.projectId[\s\S]*assetId: claimResult\.assetId/,
  );
  assert.doesNotMatch(handoff, /claimStudioDraft/);
  assert.doesNotMatch(handoff, /onOpenLibrary/);
  assert.doesNotMatch(handoff, /createCommercialAssets/);
  assert.doesNotMatch(callback, /select_account/);
});

test("Anonymous Share / dormant share_slug remain unused by handoff", () => {
  const handoff = readRepo("lib/studio/new-user-handoff.ts");
  const invite = readRepo("components/studio/AnonymousPreviewSaveInvite.tsx");
  const ui = readRepo("components/studio/NewUserHandoff.tsx");

  for (const source of [handoff, invite, ui]) {
    assert.doesNotMatch(source, /share_slug/);
    assert.doesNotMatch(source, /Anonymous Share|createAnonymousShare/i);
  }
});
