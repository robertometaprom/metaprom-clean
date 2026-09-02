/**
 * Zero-cost UX4A Preview handoff fixture — no generation.
 *
 * Run: npx tsx --test tests/ux4a-preview-handoff-fixture.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  isUx4aReviewMockRequest,
  loadUx4aPreviewHandoffAssets,
  UX4A_FIXTURE_BEFORE_URL,
  UX4A_FIXTURE_PREMIUM_URL,
  UX4A_FIXTURE_VIDEO_URL,
} from "../lib/studio/ux4a-preview-handoff-fixture.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

test("fixture gate requires ux4aReview=1 and local/dev protection", () => {
  assert.equal(
    isUx4aReviewMockRequest("?ux4aReview=1", "localhost", "production"),
    true,
  );
  assert.equal(
    isUx4aReviewMockRequest("?ux4aReview=1", "127.0.0.1", "production"),
    true,
  );
  assert.equal(
    isUx4aReviewMockRequest("?ux4aReview=1", "[::1]", "production"),
    true,
  );
  assert.equal(
    isUx4aReviewMockRequest("?ux4aReview=1", "evil.example", "development"),
    true,
  );
  assert.equal(
    isUx4aReviewMockRequest("?ux4aReview=1", "evil.example", "production"),
    false,
  );
  assert.equal(
    isUx4aReviewMockRequest("", "localhost", "development"),
    false,
  );
  assert.equal(
    isUx4aReviewMockRequest("?ux4aReview=0", "localhost", "development"),
    false,
  );
});

test("fixture media files are checked in under public/showcase/coffee", () => {
  assert.ok(existsSync(join(ROOT, "public/showcase/coffee/commercial.mp4")));
  assert.ok(existsSync(join(ROOT, "public/showcase/coffee/before.jpg")));
  assert.ok(existsSync(join(ROOT, "public/showcase/coffee/premium.jpg")));
  assert.equal(UX4A_FIXTURE_VIDEO_URL, "/showcase/coffee/commercial.mp4");
  assert.equal(UX4A_FIXTURE_BEFORE_URL, "/showcase/coffee/before.jpg");
  assert.equal(UX4A_FIXTURE_PREMIUM_URL, "/showcase/coffee/premium.jpg");
});

test("fixture hydrates File, enhanced data URL, and teaser Blob without generation URLs", async () => {
  const requested: string[] = [];

  const fetchImpl = (async (input: RequestInfo | URL) => {
    const url = String(input);
    requested.push(url);
    if (url.includes("before.jpg")) {
      return new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "Content-Type": "image/jpeg" },
      });
    }
    if (url.includes("premium.jpg")) {
      return new Response(new Uint8Array([4, 5, 6]), {
        status: 200,
        headers: { "Content-Type": "image/jpeg" },
      });
    }
    if (url.includes("commercial.mp4")) {
      return new Response(new Uint8Array([7, 8, 9]), {
        status: 200,
        headers: { "Content-Type": "video/mp4" },
      });
    }
    throw new Error(`unexpected fetch: ${url}`);
  }) as typeof fetch;

  const assets = await loadUx4aPreviewHandoffAssets(fetchImpl);

  assert.equal(assets.originalFile.name, "before.jpg");
  assert.ok(assets.originalFile.size > 0);
  assert.match(assets.enhancedDataUrl, /^data:/);
  assert.ok(assets.teaserBlob.size > 0);
  assert.equal(assets.videoUrl, UX4A_FIXTURE_VIDEO_URL);

  assert.deepEqual(requested.sort(), [
    UX4A_FIXTURE_BEFORE_URL,
    UX4A_FIXTURE_PREMIUM_URL,
    UX4A_FIXTURE_VIDEO_URL,
  ].sort());

  for (const url of requested) {
    assert.doesNotMatch(url, /\/api\/video/);
    assert.doesNotMatch(url, /\/api\/enhancement/);
    assert.doesNotMatch(url, /openai/i);
    assert.doesNotMatch(url, /veo/i);
  }
});

test("CreativeDirector fixture enters Preview-ready anonymous save state", () => {
  const director = readRepo("components/studio/CreativeDirector.tsx");
  const fixture = readRepo("lib/studio/ux4a-preview-handoff-fixture.ts");

  assert.match(director, /isUx4aReviewMockRequest/);
  assert.match(director, /loadUx4aPreviewHandoffAssets/);
  assert.match(director, /UX4A_FIXTURE_VIDEO_URL/);
  assert.match(
    director,
    /isUx4aReviewMockRequest\(\) \? "local-only" : "idle"/,
  );
  assert.match(director, /setAutoSaveStatus\("local-only"\)/);
  assert.match(director, /setPhase\("preview"\)/);
  assert.match(director, /setCreationMode\("commercial"\)/);
  assert.match(director, /setRevealStage\("offer"\)/);
  assert.match(director, /teaserVideoBlobStore\.current = assets\.teaserBlob/);
  assert.match(director, /setPremiumImage\(assets\.enhancedDataUrl\)/);
  assert.match(director, /setPrimarySourceFile\(assets\.originalFile\)/);

  assert.match(
    director,
    /showAnonymousSaveInvite=\{[\s\S]*!isAuthenticated && autoSaveStatus === "local-only"/,
  );

  assert.doesNotMatch(fixture, /createCommercialAssets/);
  assert.doesNotMatch(fixture, /createAdvertisingImage/);
  assert.doesNotMatch(fixture, /from ["']openai["']/);
  assert.doesNotMatch(fixture, /@google\/genai/);
  assert.doesNotMatch(fixture, /consumeCommercial|consumeAdvertising/);
  assert.doesNotMatch(fixture, /share_slug/);
});

test("fixture path never invokes generation from handoff or fixture modules", () => {
  const director = readRepo("components/studio/CreativeDirector.tsx");
  const fixture = readRepo("lib/studio/ux4a-preview-handoff-fixture.ts");
  const handoff = readRepo("lib/studio/new-user-handoff.ts");

  const ux4aBlockStart = director.indexOf("if (ux4aReviewMock)");
  const ux4aBlockEnd = director.indexOf("if (explicitDirector)", ux4aBlockStart);
  assert.ok(ux4aBlockStart >= 0 && ux4aBlockEnd > ux4aBlockStart);
  const ux4aBlock = director.slice(ux4aBlockStart, ux4aBlockEnd);

  assert.doesNotMatch(ux4aBlock, /createCommercialAssets/);
  assert.doesNotMatch(ux4aBlock, /createAdvertisingImage/);
  assert.doesNotMatch(ux4aBlock, /fulfillPremium/);
  assert.match(ux4aBlock, /loadUx4aPreviewHandoffAssets/);

  for (const source of [fixture, handoff]) {
    assert.doesNotMatch(source, /createCommercialAssets/);
    assert.doesNotMatch(source, /createAdvertisingImage/);
    assert.doesNotMatch(source, /from ["']openai["']/);
    assert.doesNotMatch(source, /@google\/genai/);
    assert.doesNotMatch(source, /fulfillPremium/);
  }

  assert.doesNotMatch(
    fixture,
    /fetchImpl\(["'`]\/api\//,
    "fixture must not fetch generation API routes",
  );
});

test("Premium and Stripe surfaces are untouched by fixture/handoff modules", () => {
  const fixture = readRepo("lib/studio/ux4a-preview-handoff-fixture.ts");
  const handoff = readRepo("lib/studio/new-user-handoff.ts");

  for (const source of [fixture, handoff]) {
    assert.doesNotMatch(source, /stripe/i);
    assert.doesNotMatch(source, /fulfillPremium/);
    assert.doesNotMatch(source, /processing_premium/);
  }
});
