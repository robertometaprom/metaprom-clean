/**
 * P0 — anonymous commercial preview public share (share_slug on studio_drafts).
 *
 * Run: npx tsx --test tests/anonymous-preview-share.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  generateShareSlug,
  isValidShareSlug,
  isShareSlugUniqueViolation,
  SHARE_SLUG_LENGTH,
} from "../lib/preview/share-slug.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

// --- A. anonymous draft share slug ---

test("anonymous draft save mints share_slug when teaser is persisted", () => {
  const server = readRepo("lib/studio-draft/server.ts");

  assert.match(server, /teaserPath && !shareSlug/);
  assert.match(server, /share_slug: shareSlug/);
  assert.match(server, /return \{ resumeToken, shareSlug \}/);
  assert.match(server, /createUniqueShareSlug/);
  assert.match(server, /isShareSlugTakenAcrossTables/);
});

test("minted slug format matches existing share slug alphabet and length", () => {
  const slug = generateShareSlug();
  assert.equal(slug.length, SHARE_SLUG_LENGTH);
  assert.ok(isValidShareSlug(slug));
});

test("repeated draft save preserves existing share_slug", () => {
  const server = readRepo("lib/studio-draft/server.ts");
  assert.match(server, /let shareSlug = existing\?\.share_slug \?\? null/);
  assert.match(server, /if \(teaserPath && !shareSlug\)/);
});

test("slug availability checks assets table", () => {
  const shareSlug = readRepo("lib/preview/share-slug.ts");
  assert.match(shareSlug, /isShareSlugTakenInAssets/);
  assert.match(shareSlug, /\.from\("assets"\)/);
});

test("slug availability checks studio_drafts table", () => {
  const shareSlug = readRepo("lib/preview/share-slug.ts");
  assert.match(shareSlug, /isShareSlugTakenInStudioDrafts/);
  assert.match(shareSlug, /\.from\("studio_drafts"\)/);
});

test("isShareSlugUniqueViolation recognizes postgres 23505", () => {
  assert.ok(isShareSlugUniqueViolation({ code: "23505" }));
  assert.ok(!isShareSlugUniqueViolation({ code: "42P01" }));
});

// --- B. public anonymous resolver ---

test("/p slug resolves valid unclaimed unexpired draft after asset miss", () => {
  const resolver = readRepo("lib/preview/public-preview.ts");

  assert.match(resolver, /const asset = await getPreviewAssetBySlug\(slug\)/);
  assert.match(resolver, /if \(asset\) \{[\s\S]*return asset/);
  assert.match(resolver, /return getPreviewDraftBySlug\(slug\)/);
  assert.match(resolver, /\.is\("claimed_at", null\)/);
  assert.match(resolver, /\.gt\("expires_at", now\)/);
  assert.match(resolver, /\.not\("teaser_path", "is", null\)/);
});

test("expired and claimed drafts are excluded from public draft resolver", () => {
  const resolver = readRepo("lib/preview/public-preview.ts");
  assert.match(resolver, /\.gt\("expires_at", now\)/);
  assert.match(resolver, /\.is\("claimed_at", null\)/);
});

test("draft without teaser does not resolve publicly", () => {
  const resolver = readRepo("lib/preview/public-preview.ts");
  assert.match(resolver, /if \(!row\.teaser_path\)/);
  assert.match(resolver, /\.not\("teaser_path", "is", null\)/);
});

test("public resolver select lists exclude resume_token and ownership fields", () => {
  const resolver = readRepo("lib/preview/public-preview.ts");
  assert.doesNotMatch(resolver, /resume_token/);
  assert.doesNotMatch(resolver, /claimed_by/);
  assert.doesNotMatch(resolver, /conversation_history/);
  assert.doesNotMatch(resolver, /original_path/);
  assert.match(resolver, /RESOLVED_DRAFT_SELECT/);
  assert.match(resolver, /RESOLVED_ASSET_SELECT/);
});

test("sanitizePublicPreview never exposes storage URLs or private paths", () => {
  const sanitize = readRepo("lib/preview/sanitize-public-preview.ts");
  assert.match(sanitize, /originalPhotoUrl: null/);
  assert.match(sanitize, /buildPublicPreviewStreamPath/);
  assert.match(sanitize, /buildPublicPreviewImagePath/);
  assert.doesNotMatch(sanitize, /signedUrl|storage\.supabase|studio-drafts/);
});

test("draft media is signed server-side from private studio-drafts bucket", () => {
  const resolver = readRepo("lib/preview/public-preview.ts");
  const server = readRepo("lib/studio-draft/server.ts");

  assert.match(resolver, /createSignedStudioDraftUrlServer/);
  assert.match(resolver, /storageSource === "studio_drafts"/);
  assert.match(server, /STUDIO_DRAFTS_BUCKET/);
  assert.match(server, /createSignedStudioDraftUrlServer/);
});

// --- C. Share UI ---

test("anonymous Preview renders WhatsApp Share below video when slug exists", () => {
  const reveal = readRepo("components/studio/CinematicReveal.tsx");

  assert.match(reveal, /mediaFooter=\{/);
  assert.match(
    reveal,
    /publicPreviewUrl && shareSlug \? \([\s\S]*ShareCommercialActions[\s\S]*variant="whatsapp"/,
  );
});

test("Share appears above Save invite in reviewMode mediaFooter", () => {
  const reveal = readRepo("components/studio/CinematicReveal.tsx");
  const inviteBlock = reveal.slice(
    reveal.indexOf("stage === \"offer\" && reviewMode"),
    reveal.indexOf("stage === \"offer\" && !reviewMode"),
  );

  assert.match(
    inviteBlock,
    /ShareCommercialActions[\s\S]*anonymousSaveInviteBlock/,
    "WhatsApp Share must render directly below preview and above Save",
  );
});

test("anonymous Preview without slug does not render fake Share button", () => {
  const reveal = readRepo("components/studio/CinematicReveal.tsx");
  assert.match(reveal, /publicPreviewUrl && shareSlug \?/);
  assert.doesNotMatch(
    reveal,
    /ShareCommercialActions[\s\S]*disabled/,
  );
});

test("Save CTA, adjustment, and Premium paths remain present", () => {
  const reveal = readRepo("components/studio/CinematicReveal.tsx");
  const director = readRepo("components/studio/CreativeDirector.tsx");
  const invite = readRepo("components/studio/AnonymousPreviewSaveInvite.tsx");
  const reviewInvite = readRepo("components/studio/DirectorReviewInvite.tsx");

  assert.match(invite, /ANONYMOUS_PREVIEW_SAVE_CTA/);
  assert.match(reveal, /anonymousSaveInviteBlock/);
  assert.match(reveal, /Produce tu comercial completo/);
  assert.match(reviewInvite, /DIRECTOR_REVIEW_ADJUST_LABEL/);
  assert.match(director, /showAnonymousSaveInvite=/);
});

// --- D. claim continuity ---

test("claim passes preserved draft share_slug into persistStudioCreationServer", () => {
  const server = readRepo("lib/studio-draft/server.ts");
  const persistence = readRepo("lib/studio-persistence-server.ts");

  assert.match(server, /preservedShareSlug: draft\.share_slug/);
  assert.match(persistence, /preservedShareSlug\?: string \| null/);
  assert.match(persistence, /input\.preservedShareSlug/);
});

test("persistStudioCreationServer reuses preserved slug when asset namespace is free", () => {
  const persistence = readRepo("lib/studio-persistence-server.ts");

  assert.match(
    persistence,
    /isValidShareSlug\(input\.preservedShareSlug\)[\s\S]*isShareSlugTakenInAssets/,
  );
  assert.match(persistence, /shareSlug = input\.preservedShareSlug/);
});

test("asset resolver stays first so claimed drafts do not shadow library assets", () => {
  const resolver = readRepo("lib/preview/public-preview.ts");
  assert.match(
    resolver,
    /getPreviewAssetBySlug[\s\S]*getPreviewDraftBySlug/,
  );
});

test("claim path does not introduce second generation", () => {
  const server = readRepo("lib/studio-draft/server.ts");
  const claimRoute = readRepo("app/api/studio/draft/claim/route.ts");

  assert.match(server, /persistStudioCreationServer/);
  assert.doesNotMatch(server, /createCommercialAssets/);
  assert.doesNotMatch(server, /\/api\/video/);
  assert.doesNotMatch(claimRoute, /createCommercialAssets/);

  const director = readRepo("components/studio/CreativeDirector.tsx");
  const claimBlock = director.slice(
    director.indexOf("const attemptResumeClaim = useCallback"),
    director.indexOf("const requestAuthentication = useCallback"),
  );
  assert.doesNotMatch(claimBlock, /createCommercialAssets/);
});

test("resume/auth draft flow remains intact", () => {
  const client = readRepo("lib/studio-draft/client.ts");
  const route = readRepo("app/api/studio/draft/route.ts");

  assert.match(client, /resumeToken/);
  assert.match(client, /claimStudioDraft/);
  assert.match(route, /saveStudioDraftServer/);
  assert.match(route, /getStudioDraftServer/);
});

// --- E. authenticated sharing regression ---

test("existing authenticated asset share path unchanged", () => {
  const biblioteca = readRepo("components/biblioteca/Biblioteca.tsx");
  const page = readRepo("app/p/[share_slug]/page.tsx");
  const share = readRepo("components/share/ShareCommercialActions.tsx");

  assert.match(biblioteca, /ShareCommercialActions/);
  assert.match(page, /resolvePublicPreviewPage/);
  assert.match(share, /useShareCommercial/);
});

test("existing WhatsApp handoff and public stream proxy remain wired", () => {
  const stream = readRepo("app/api/public/[slug]/stream/route.ts");
  const wa = readRepo("app/share/wa/[share_slug]/page.tsx");

  assert.match(stream, /createPublicPreviewStreamUrl/);
  assert.doesNotMatch(stream, /LIBRARY_BUCKET|studio-drafts/);
  assert.match(wa, /WhatsAppHandoffClient/);
});

test("draft save response returns shareSlug to CreativeDirector", () => {
  const client = readRepo("lib/studio-draft/client.ts");
  const director = readRepo("components/studio/CreativeDirector.tsx");
  const route = readRepo("app/api/studio/draft/route.ts");

  assert.match(client, /shareSlug/);
  assert.match(director, /result\.shareSlug/);
  assert.match(director, /setShareSlug\(result\.shareSlug\)/);
  assert.match(route, /saveStudioDraftServer/);
});

test("migration adds studio_drafts.share_slug with partial unique index", () => {
  const migration = readRepo(
    "supabase/migrations/20260902120000_studio_drafts_share_slug.sql",
  );

  assert.match(migration, /add column if not exists share_slug text/);
  assert.match(migration, /studio_drafts_share_slug_idx/);
  assert.match(migration, /where share_slug is not null/);
});

test("Biblioteca was not modified for this task", () => {
  const biblioteca = readRepo("components/biblioteca/Biblioteca.tsx");
  assert.doesNotMatch(biblioteca, /studio_drafts/);
  assert.doesNotMatch(biblioteca, /anonymous/i);
});
