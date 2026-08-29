/**
 * Natural-language Director approval uses the same proposal-acceptance handoff.
 *
 * Run: npx tsx --test tests/director-natural-approval.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { CommercialProposal } from "../lib/creative-director/types.ts";
import {
  isDirectorExecutionApproval,
  resolveDirectorComposerAction,
} from "../lib/studio/director-execution-approval.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

const PROPOSAL = {
  summary: "Panadería",
  openingHook: "Apertura",
  productHeroMoment: "Hero",
  emotionalTone: "cálido",
  pacing: "ágil",
  callToAction: "Conoce más",
  narrative: "Una panadería transforma su caja en un anuncio profesional.",
  visualGenerationIntent: "Owner photographs a pastry box.",
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

const WITH_PROPOSAL = [
  { role: "customer" as const, content: "Quiero un comercial" },
  {
    role: "director" as const,
    content: "Te propongo esto.",
    proposal: PROPOSAL,
  },
];

const WITHOUT_PROPOSAL = [
  { role: "customer" as const, content: "Quiero un comercial" },
  { role: "director" as const, content: "Cuéntame más." },
];

test('"hazlo" with a valid proposal follows proposal acceptance', () => {
  const action = resolveDirectorComposerAction({
    composerText: "hazlo",
    messages: WITH_PROPOSAL,
  });
  assert.equal(action.type, "accept_proposal");
  if (action.type !== "accept_proposal") return;
  assert.equal(action.proposal, PROPOSAL);
  assert.equal(action.narrative, PROPOSAL.narrative);
});

test('"adelante" with a valid proposal follows proposal acceptance', () => {
  const action = resolveDirectorComposerAction({
    composerText: "Adelante!",
    messages: WITH_PROPOSAL,
  });
  assert.equal(action.type, "accept_proposal");
});

test('"ya genera" with a valid proposal follows proposal acceptance', () => {
  const action = resolveDirectorComposerAction({
    composerText: "ya genera",
    messages: WITH_PROPOSAL,
  });
  assert.equal(action.type, "accept_proposal");
});

test("equivalent English approval with a valid proposal follows proposal acceptance", () => {
  for (const phrase of [
    "do it",
    "go ahead",
    "generate it",
    "looks good, go ahead",
    "proceed",
  ]) {
    const action = resolveDirectorComposerAction({
      composerText: phrase,
      messages: WITH_PROPOSAL,
    });
    assert.equal(action.type, "accept_proposal", phrase);
  }
});

test("approval without a valid proposal continues normal conversation", () => {
  for (const phrase of ["hazlo", "adelante", "ya genera", "do it", "go ahead"]) {
    const action = resolveDirectorComposerAction({
      composerText: phrase,
      messages: WITHOUT_PROPOSAL,
    });
    assert.equal(action.type, "converse", phrase);
    if (action.type === "converse") {
      assert.equal(action.message, phrase);
    }
  }
});

test("ambiguous or non-approval text continues normal Director conversation", () => {
  const phrases = [
    "hazlo más cinematográfico",
    "dale un tono más cálido",
    "genera un comercial de mi café",
    "adelante con un estilo más oscuro",
    "ok",
    "perfecto",
    "me gusta",
    "looks good",
  ];

  for (const phrase of phrases) {
    assert.equal(isDirectorExecutionApproval(phrase), false, phrase);
    const action = resolveDirectorComposerAction({
      composerText: phrase,
      messages: WITH_PROPOSAL,
    });
    assert.equal(action.type, "converse", phrase);
  }
});

test("natural approval uses the same handoff as Usar esta propuesta", () => {
  const panel = readRepo("components/studio/CreativeDirectorPanel.tsx");
  const studio = readRepo("components/studio/CreativeDirector.tsx");

  assert.match(
    panel,
    /decision\.type === "accept_proposal"[\s\S]*handleUseProposal\(decision\.proposal, decision\.narrative\)/,
  );
  assert.match(
    panel,
    /onUse=\{\(\) =>\s*handleUseProposal\(/,
  );
  assert.match(studio, /onUseProposal=\{handleUseDirectorProposal\}/);
  assert.doesNotMatch(panel, /decision\.type === "accept_proposal"[\s\S]{0,400}requestCreativeDirector/);
  assert.doesNotMatch(panel, /decision\.type === "accept_proposal"[\s\S]{0,400}fetch\("\/api\/creative-director"/);
});

test("destination selection remains required after natural approval", () => {
  const studio = readRepo("components/studio/CreativeDirector.tsx");

  assert.match(
    studio,
    /knownMode === "commercial" && !destinationRef\.current[\s\S]*return "destination"/,
  );
  assert.match(studio, /onUseProposal=\{handleUseDirectorProposal\}/);
  assert.doesNotMatch(
    studio,
    /startFreshDirectorSession[\s\S]{0,200}setPhase\("intent"\)/,
  );
  assert.doesNotMatch(
    readRepo("components/studio/CreativeDirectorPanel.tsx"),
    /decision\.type === "accept_proposal"[\s\S]{0,400}setPhase\("intent"\)/,
  );
  assert.doesNotMatch(
    readRepo("lib/studio/director-execution-approval.ts"),
    /\/api\/video|createCommercialAssets|handleGenerate/,
  );
});
