/**
 * Director V2 Studio dry-run — query switch, API selection, generation firewall.
 *
 * Run: npx tsx --test tests/creative-director-v2/dry-run-studio.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { CommercialProposal } from "../../lib/creative-director/types.ts";
import {
  CREATIVE_DIRECTOR_V1_API_PATH,
  CREATIVE_DIRECTOR_V2_API_PATH,
  DIRECTOR_V2_DRY_RUN_INVALID_MESSAGE,
  DIRECTOR_V2_DRY_RUN_QUERY_PARAM,
  DIRECTOR_V2_DRY_RUN_QUERY_VALUE,
  DIRECTOR_V2_DRY_RUN_VALID_MESSAGE,
  isDirectorV2DryRunSearchParam,
  resolveCreativeDirectorApiPath,
  validateDirectorV2DryRunProposal,
} from "../../lib/studio/director-v2-dry-run.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

const VALID_PROPOSAL = {
  summary: "Panadería",
  openingHook: "Apertura",
  productHeroMoment: "Hero",
  emotionalTone: "cálido",
  pacing: "ágil",
  callToAction: "Conoce más",
  narrative: "Una panadería transforma su caja en un anuncio profesional.",
  visualGenerationIntent: [
    "A bakery owner photographs a pastry box with her phone",
    "She uploads the photo",
    "The photo transforms into a professional advertisement",
  ].join(" "),
  requiredNarrativeBeats: [
    "A bakery owner photographs a pastry box with her phone",
    "She uploads the photo",
    "The photo transforms into a professional advertisement",
  ],
  productionProfile: {
    fidelity_class: "protected",
    preserve_product_identity: true,
    protected_reasons: ["packaging"],
    veo_copy_policy: "deterministic_overlay_only",
  },
  promotionalOverlays: {
    headline: "Hazlo extraordinario",
    call_to_action: "Conoce más",
    url: "https://metaprom.com",
    logo_required: true,
    timing_or_layout: "top_intro",
  },
  overlayStyle: {
    typography_treatment: "cinematic",
    palette_preset: "warm",
    text_alignment: "left",
    cta_treatment: "panel",
    promotion_treatment: "badge",
    origin: "user",
  },
} as CommercialProposal;

// 1. /studio without query parameter remains V1.
test("1 — default Studio Director API path is V1", () => {
  assert.equal(resolveCreativeDirectorApiPath(false), CREATIVE_DIRECTOR_V1_API_PATH);
  assert.equal(
    isDirectorV2DryRunSearchParam(""),
    false,
  );
  assert.equal(
    isDirectorV2DryRunSearchParam("?foo=bar"),
    false,
  );
  assert.equal(
    isDirectorV2DryRunSearchParam(`?${DIRECTOR_V2_DRY_RUN_QUERY_PARAM}=0`),
    false,
  );

  const panel = readRepo("components/studio/CreativeDirectorPanel.tsx");
  assert.match(
    panel,
    /resolveCreativeDirectorApiPath\(directorV2DryRun\)/,
  );
  assert.match(panel, /directorV2DryRun = false/);
});

// 2. directorV2DryRun=1 selects /api/creative-director-v2.
test("2 — directorV2DryRun=1 selects creative-director-v2 API", () => {
  assert.equal(
    isDirectorV2DryRunSearchParam(
      `?${DIRECTOR_V2_DRY_RUN_QUERY_PARAM}=${DIRECTOR_V2_DRY_RUN_QUERY_VALUE}`,
    ),
    true,
  );
  assert.equal(
    resolveCreativeDirectorApiPath(true),
    CREATIVE_DIRECTOR_V2_API_PATH,
  );

  const studio = readRepo("components/studio/CreativeDirector.tsx");
  assert.match(studio, /readDirectorV2DryRunFromLocation/);
  assert.match(studio, /directorV2DryRun=\{directorV2DryRun\}/);
});

// 3. V2 dry-run proposal acceptance does NOT call handleUseDirectorProposal.
test("3 — V2 dry-run blocks onUseProposal handoff", () => {
  const panel = readRepo("components/studio/CreativeDirectorPanel.tsx");
  assert.match(
    panel,
    /if \(directorV2DryRun\) \{[\s\S]*validateDirectorV2DryRunProposal/,
  );
  assert.match(
    panel,
    /if \(directorV2DryRun\) \{[\s\S]*appendDirectorMessage\(validation\.message\)[\s\S]*return;\s*\}/,
  );
});

// 4. V2 dry-run cannot reach runCreation.
test("4 — V2 dry-run panel cannot reach runCreation", () => {
  const panel = readRepo("components/studio/CreativeDirectorPanel.tsx");
  const dryRun = readRepo("lib/studio/director-v2-dry-run.ts");
  assert.doesNotMatch(panel, /runCreation/);
  assert.doesNotMatch(dryRun, /runCreation/);
  assert.doesNotMatch(panel, /setPhase/);
});

// 5. V2 dry-run cannot call /api/enhancement.
test("5 — V2 dry-run cannot call /api/enhancement", () => {
  const panel = readRepo("components/studio/CreativeDirectorPanel.tsx");
  const dryRun = readRepo("lib/studio/director-v2-dry-run.ts");
  assert.doesNotMatch(panel, /\/api\/enhancement/);
  assert.doesNotMatch(dryRun, /\/api\/enhancement/);
});

// 6. V2 dry-run cannot call /api/video.
test("6 — V2 dry-run cannot call /api/video", () => {
  const panel = readRepo("components/studio/CreativeDirectorPanel.tsx");
  const dryRun = readRepo("lib/studio/director-v2-dry-run.ts");
  assert.doesNotMatch(panel, /\/api\/video/);
  assert.doesNotMatch(dryRun, /\/api\/video/);
});

// 7. V2 dry-run cannot consume generation credits.
test("7 — V2 dry-run cannot consume generation credits", () => {
  const panel = readRepo("components/studio/CreativeDirectorPanel.tsx");
  const dryRun = readRepo("lib/studio/director-v2-dry-run.ts");
  const route = readRepo("app/api/creative-director-v2/route.ts");
  for (const source of [panel, dryRun, route]) {
    assert.doesNotMatch(source, /consumeCommercial/);
    assert.doesNotMatch(source, /consumeAdvertisingAsset/);
    assert.doesNotMatch(source, /entitlements\/consume/);
    assert.doesNotMatch(source, /createCommercialAssets/);
    assert.doesNotMatch(source, /createAdvertisingImage/);
  }
});

// 8. V2 dry-run validation uses parseClosedCommercialProposal.
test("8 — V2 dry-run validation uses parseClosedCommercialProposal", () => {
  const dryRun = readRepo("lib/studio/director-v2-dry-run.ts");
  assert.match(dryRun, /parseClosedCommercialProposal/);

  const valid = validateDirectorV2DryRunProposal(VALID_PROPOSAL);
  assert.equal(valid.valid, true);
  assert.equal(valid.message, DIRECTOR_V2_DRY_RUN_VALID_MESSAGE);

  const invalid = validateDirectorV2DryRunProposal({
    ...VALID_PROPOSAL,
    narrative: 123,
  } as unknown as CommercialProposal);
  assert.equal(invalid.valid, false);
  assert.equal(invalid.message, DIRECTOR_V2_DRY_RUN_INVALID_MESSAGE);
});

// 9. V2 internal-language output guard remains active.
test("9 — V2 internal-language output guard remains active", () => {
  const engine = readRepo("lib/creative-director-v2/engine.ts");
  const guard = readRepo("lib/creative-director-v2/output-guard.ts");
  assert.match(engine, /containsInternalLanguage/);
  assert.match(guard, /containsInternalLanguage/);
});

// 10. Existing Director V1 regression wiring remains intact.
test("10 — Director V1 regression wiring remains intact", () => {
  const panel = readRepo("components/studio/CreativeDirectorPanel.tsx");
  const studio = readRepo("components/studio/CreativeDirector.tsx");

  assert.match(studio, /onUseProposal=\{handleUseDirectorProposal\}/);
  assert.match(
    panel,
    /resolveCreativeDirectorApiPath\(directorV2DryRun\)/,
  );
  assert.match(
    panel,
    /decision\.type === "accept_proposal"[\s\S]*handleUseProposal\(decision\.proposal, decision\.narrative\)/,
  );
});

test("V2 dry-run shows visible test indicator only in dry-run mode", () => {
  const panel = readRepo("components/studio/CreativeDirectorPanel.tsx");
  assert.match(panel, /directorV2DryRun \? \(/);
  assert.match(panel, /DIRECTOR V2 — DRY RUN/);
  assert.match(panel, /Generación desactivada/);
  assert.match(panel, /data-testid="director-v2-dry-run-indicator"/);
});
