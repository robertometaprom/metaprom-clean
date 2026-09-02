/**
 * Production incident — anonymous commercial lost after Google signup.
 *
 * Run: npx tsx --test tests/anonymous-auth-draft-claim.test.ts
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

test("real-user regression — Studio auth entry points preserve resume redirect", () => {
  const director = readRepo("components/studio/CreativeDirector.tsx");
  const shell = readRepo("components/studio/StudioShell.tsx");
  const panel = readRepo("components/studio/CreativeDirectorPanel.tsx");
  const client = readRepo("lib/studio-draft/client.ts");

  assert.match(client, /resolveStudioAuthRedirect/);
  assert.match(client, /buildStudioLoginUrl/);
  assert.match(
    client,
    /readResumeTokenFromLocation\(\)[\s\S]*readStoredResumeToken\(\)/,
    "auth redirect must read URL resume before sessionStorage",
  );

  assert.doesNotMatch(
    director,
    /href="\/login\?redirect=%2Fstudio"/,
    "CreativeDirector must not hardcode plain /studio login redirect",
  );
  assert.match(director, /buildStudioLoginUrl\(resumeToken\)/);
  assert.match(director, /redirectTo=\{studioAuthRedirect\}/);
  assert.match(director, /authRedirectTo=\{studioAuthRedirect\}/);

  assert.doesNotMatch(
    shell,
    /href="\/login\?redirect=%2Fstudio"/,
    "StudioShell menu must not hardcode plain /studio login redirect",
  );
  assert.match(shell, /buildStudioLoginUrl\(\)/);

  assert.match(
    panel,
    /encodeURIComponent\(authRedirectTo \|\| "\/studio"\)/,
    "Director panel email login must preserve authRedirectTo contract",
  );
});

test("real-user regression — anonymous restore does not permanently consume claim", () => {
  const director = readRepo("components/studio/CreativeDirector.tsx");

  assert.match(director, /resumeRestoredRef/);
  assert.match(director, /resumeClaimCompletedRef/);
  assert.match(director, /resumeClaimInFlightRef/);
  assert.doesNotMatch(director, /resumeHandledRef/);

  const anonymousRestoreBlock = director.slice(
    director.indexOf("if (resumeRestoredRef.current) return;"),
    director.indexOf("} catch (resumeError)"),
  );

  assert.doesNotMatch(
    anonymousRestoreBlock,
    /resumeClaimCompletedRef\.current = true/,
    "anonymous draft restore must not mark claim as completed",
  );
  assert.match(
    anonymousRestoreBlock,
    /resumeRestoredRef\.current = true/,
    "anonymous restore should be one-shot for UI only",
  );
});

test("real-user regression — claim executes after authentication hydrates", () => {
  const director = readRepo("components/studio/CreativeDirector.tsx");

  assert.match(director, /const attemptResumeClaim = useCallback/);
  assert.match(director, /await claimStudioDraft\(token\)/);
  assert.match(director, /await applyClaimResult\(claimResult\)/);

  assert.match(
    director,
    /if \(!isAuthenticated \|\| resumeClaimCompletedRef\.current\) return;/,
    "claim continuation must wait for authenticated session",
  );
  assert.match(
    director,
    /readResumeTokenFromLocation\(\)[\s\S]*readStoredResumeToken\(\)[\s\S]*resumeToken/,
    "post-auth claim must resolve resume token from URL, storage, or state",
  );
  assert.match(
    director,
    /resumeClaimInFlightRef\.current/,
    "claim must guard against duplicate concurrent invocation",
  );
});

test("real-user regression — existing claim endpoint reused without regeneration", () => {
  const director = readRepo("components/studio/CreativeDirector.tsx");
  const client = readRepo("lib/studio-draft/client.ts");
  const claimRoute = readRepo("app/api/studio/draft/claim/route.ts");
  const server = readRepo("lib/studio-draft/server.ts");

  assert.match(client, /\/api\/studio\/draft\/claim/);
  assert.match(claimRoute, /claimStudioDraftServer/);
  assert.match(server, /persistStudioCreationServer/);
  assert.doesNotMatch(director, /\/api\/studio\/draft\/claim/);
  assert.doesNotMatch(director, /createCommercialAssets\([\s\S]*attemptResumeClaim/);
  assert.match(director, /onLibraryUpdated\?\.\(/);
});

test("real-user regression — server claim remains idempotent against duplicate rows", () => {
  const server = readRepo("lib/studio-draft/server.ts");

  assert.match(
    server,
    /\.is\("claimed_at", null\)/,
    "claim must remain conditional on unclaimed draft",
  );
  assert.match(server, /Este borrador ya fue vinculado a una cuenta\./);
});
