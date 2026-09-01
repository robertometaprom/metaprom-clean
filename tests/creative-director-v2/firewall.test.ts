/**
 * Director V2 generation firewall — must not import or reference generation entry points.
 *
 * Run: npx tsx --test tests/creative-director-v2/firewall.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

const FORBIDDEN_PATTERNS = [
  /studio-creation/,
  /api\/enhancement/,
  /api\/video/,
  /persistStudioCreation/,
  /fulfillPremiumVideo/,
  /premium-video-fulfillment/,
  /createCommercialAssets/,
  /createAdvertisingImage/,
];

const V2_SOURCE_ROOTS = [
  "lib/creative-director-v2",
  "app/api/creative-director-v2",
];

function collectSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

function relativeFromRoot(absolutePath: string): string {
  return absolutePath.slice(ROOT.length + 1).replace(/\\/g, "/");
}

test("Director V2 sources do not reference generation entry points", () => {
  const violations: string[] = [];

  for (const relPath of V2_SOURCE_ROOTS) {
    const absolute = join(ROOT, relPath);
    for (const file of collectSourceFiles(absolute)) {
      const content = readFileSync(file, "utf8");
      const rel = relativeFromRoot(file);

      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(content)) {
          violations.push(`${rel} matches ${pattern}`);
        }
      }
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Generation firewall violations:\n${violations.join("\n")}`,
  );
});

test("Director V2 API route calls createCreativeProposalV2 only", () => {
  const route = readFileSync(
    join(ROOT, "app/api/creative-director-v2/route.ts"),
    "utf8",
  );
  assert.match(route, /createCreativeProposalV2/);
  assert.doesNotMatch(route, /createCreativeProposal[^V]/);
  assert.doesNotMatch(route, /studio-creation/);
});

test("Director V2 dry-run Studio wiring is isolated from generation", () => {
  const panel = readFileSync(
    join(ROOT, "components/studio/CreativeDirectorPanel.tsx"),
    "utf8",
  );
  const director = readFileSync(
    join(ROOT, "components/studio/CreativeDirector.tsx"),
    "utf8",
  );
  const dryRun = readFileSync(
    join(ROOT, "lib/studio/director-v2-dry-run.ts"),
    "utf8",
  );

  assert.match(panel, /creative-director-v2|resolveCreativeDirectorApiPath/);
  assert.match(panel, /directorV2Api/);
  assert.match(panel, /directorV2DryRun/);
  assert.match(director, /readDirectorV2ModeFromLocation/);
  assert.match(dryRun, /parseClosedCommercialProposal/);

  for (const source of [panel, dryRun]) {
    assert.doesNotMatch(source, /runCreation/);
    assert.doesNotMatch(source, /createCommercialAssets/);
    assert.doesNotMatch(source, /createAdvertisingImage/);
    assert.doesNotMatch(source, /\/api\/enhancement/);
    assert.doesNotMatch(source, /\/api\/video/);
  }

  assert.doesNotMatch(director, /creative-director-v2/);
  assert.doesNotMatch(director, /validateDirectorV2DryRunProposal/);

  assert.match(
    panel,
    /if \(directorV2DryRun\) \{[\s\S]*validateDirectorV2DryRunProposal/,
  );
});
