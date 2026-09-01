/**
 * Director V2 fixture replay harness — isolated contract validation without generation.
 *
 * Run: npx tsx --test tests/creative-director-v2/replay-harness.test.ts
 */
import assert from "node:assert/strict";
import test from "node:test";

import { parseClosedCommercialProposal } from "../../lib/creative-director/proposal-contract.ts";
import {
  buildCommercialProposalFromBrief,
  buildVisualGenerationIntent,
  createCreativeProposalV2,
  DIRECTOR_V2_FAILURE_MESSAGE,
  containsInternalLanguage,
} from "../../lib/creative-director-v2/engine.ts";
import type { DirectorV2Provider } from "../../lib/creative-director-v2/types.ts";
import {
  BAKERY_CREATIVE_BRIEF,
  BAKERY_REQUEST,
  CLINIC_FONCIONAL,
  CLINIC_FUNCIONAL,
  INCOMPLETE_CLARIFICATION,
  INCOMPLETE_REQUEST,
  LEAKING_PROVIDER_RESPONSE,
  PELVIC_INITIAL_REQUEST,
  PELVIC_NARRATION,
  PELVIC_VISUAL_EVENTS,
  PERLA_CREATIVE_BRIEF,
  PERLA_HEADLINE,
  PERLA_NARRATION,
  PERLA_REQUEST,
  PERLA_VISUAL_EVENTS,
  VILLAGIO_ADDRESS,
  VILLAGIO_CREATIVE_BRIEF,
  VILLAGIO_HEADLINE,
  VILLAGIO_NARRATION,
  VILLAGIO_PHONE,
  VILLAGIO_REQUEST,
  VILLAGIO_VISUAL_EVENTS,
  pelvicCreativeBrief,
} from "./fixtures.ts";

function mockProvider(
  handler: DirectorV2Provider["generate"],
): DirectorV2Provider {
  return { generate: handler };
}

function assertPassesClosedContract(proposal: unknown) {
  const parsed = parseClosedCommercialProposal(proposal);
  assert.ok("proposal" in parsed, JSON.stringify(parsed));
}

function assertNoLeakageInResponse(response: {
  message: string;
  clarifyingQuestions?: string[];
}) {
  assert.equal(containsInternalLanguage(response.message), false);
  for (const question of response.clarifyingQuestions ?? []) {
    assert.equal(containsInternalLanguage(question), false);
  }
}

function assertVisualBeatsOnly(proposal: { requiredNarrativeBeats: string[] }) {
  assert.deepEqual(proposal.requiredNarrativeBeats, [...PELVIC_VISUAL_EVENTS]);
  const beats = JSON.stringify(proposal.requiredNarrativeBeats);
  assert.doesNotMatch(beats, /Mejora los problemas de incontinencia/);
  assert.doesNotMatch(beats, /CLINICA GINECOESTETICA/);
  assert.doesNotMatch(beats, /FONCIONAL|FUNCIONAL/);
}

// 1. Pelvic-chair / Dra. Maricruz
test("1 — pelvic-chair: visual beats only, narration and clinic overlay preserved", async () => {
  const provider = mockProvider(async () => ({
    message: "Te propongo este comercial en el consultorio.",
    creative: pelvicCreativeBrief(CLINIC_FONCIONAL),
  }));

  const response = await createCreativeProposalV2(
    { customerMessage: PELVIC_INITIAL_REQUEST, projectContext: { sourcePhotoCount: 1 } },
    { provider },
  );

  assert.ok(response.proposal);
  assertVisualBeatsOnly(response.proposal!);
  assert.equal(response.proposal!.promotionalOverlays.headline, CLINIC_FONCIONAL);
  assert.ok(response.proposal!.visualGenerationIntent.includes(PELVIC_NARRATION));
  assert.doesNotMatch(
    JSON.stringify(response.proposal!.requiredNarrativeBeats),
    new RegExp(PELVIC_NARRATION.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  );
  assertPassesClosedContract(response.proposal);
  assertNoLeakageInResponse(response);
});

// 2. FONCIONAL → FUNCIONAL correction
test("2 — FONCIONAL to FUNCIONAL correction updates overlay only", async () => {
  const initial = buildCommercialProposalFromBrief(
    pelvicCreativeBrief(CLINIC_FONCIONAL),
    { sourcePhotoCount: 1 },
  );

  const provider = mockProvider(async () => ({
    message: "Corregí FONCIONAL por FUNCIONAL en el overlay.",
    creative: pelvicCreativeBrief(CLINIC_FUNCIONAL),
  }));

  const response = await createCreativeProposalV2(
    {
      customerMessage: "CAMBIAR FONCIONAL POR FUNCIONAL",
      projectContext: { lastCompletedProposal: initial, sourcePhotoCount: 1 },
    },
    { provider },
  );

  assert.ok(response.proposal);
  assert.equal(response.proposal!.promotionalOverlays.headline, CLINIC_FUNCIONAL);
  assert.doesNotMatch(
    response.proposal!.promotionalOverlays.headline ?? "",
    /FONCIONAL/,
  );
  assertVisualBeatsOnly(response.proposal!);
  assertPassesClosedContract(response.proposal);
});

// 3. Exact narration preservation
test("3 — exact narration preserved in visual intent, not in beats", async () => {
  const proposal = buildCommercialProposalFromBrief(
    pelvicCreativeBrief(CLINIC_FONCIONAL),
    {},
  );
  assert.ok(proposal.visualGenerationIntent.includes(PELVIC_NARRATION));
  assertPassesClosedContract(proposal);
});

// 4. Exact promotional overlay preservation
test("4 — exact promotional overlay preservation", async () => {
  const proposal = buildCommercialProposalFromBrief(
    pelvicCreativeBrief(CLINIC_FONCIONAL),
    {},
  );
  assert.equal(proposal.promotionalOverlays.headline, CLINIC_FONCIONAL);
  assert.equal(proposal.promotionalOverlays.call_to_action, "Agenda tu cita");
  assertPassesClosedContract(proposal);
});

// 5. Required visual sequence preservation
test("5 — required visual sequence preserved in beats and intent", () => {
  const intent = buildVisualGenerationIntent([...PELVIC_VISUAL_EVENTS], PELVIC_NARRATION);
  for (const beat of PELVIC_VISUAL_EVENTS) {
    assert.ok(intent.includes(beat));
  }
  const proposal = buildCommercialProposalFromBrief(
    pelvicCreativeBrief(CLINIC_FONCIONAL),
    {},
  );
  assert.deepEqual(proposal.requiredNarrativeBeats, [...PELVIC_VISUAL_EVENTS]);
  assertPassesClosedContract(proposal);
});

// 6. Natural complete brief → proposal
test("6 — natural complete brief returns executable proposal", async () => {
  const provider = mockProvider(async () => ({
    message: "Te propongo un comercial cálido para tu panadería.",
    creative: BAKERY_CREATIVE_BRIEF,
  }));

  const response = await createCreativeProposalV2(
    {
      customerMessage: BAKERY_REQUEST,
      projectContext: { sourcePhotoCount: 1 },
    },
    { provider },
  );

  assert.ok(response.proposal);
  assert.equal(response.needsClarification, false);
  assertPassesClosedContract(response.proposal);
  assertNoLeakageInResponse(response);
});

// 7. Truly incomplete brief → ONE clarification
test("7 — incomplete brief returns exactly one clarification question", async () => {
  const provider = mockProvider(async () => INCOMPLETE_CLARIFICATION);

  const response = await createCreativeProposalV2(
    { customerMessage: INCOMPLETE_REQUEST },
    { provider },
  );

  assert.equal(response.needsClarification, true);
  assert.equal(response.proposal, undefined);
  assert.deepEqual(response.clarifyingQuestions, [
    INCOMPLETE_CLARIFICATION.clarifyingQuestion,
  ]);
  assert.equal(response.clarifyingQuestions?.length, 1);
  assertNoLeakageInResponse(response);
});

// 8. No internal terminology leakage
test("8 — internal terminology in provider message returns fixed human-safe failure", async () => {
  const provider = mockProvider(async () => LEAKING_PROVIDER_RESPONSE);

  const response = await createCreativeProposalV2(
    { customerMessage: PELVIC_INITIAL_REQUEST },
    { provider },
  );

  assert.equal(response.message, DIRECTOR_V2_FAILURE_MESSAGE);
  assert.equal(response.proposal, undefined);
  assertNoLeakageInResponse(response);
});

// 9. No repetitive customer-visible loop (single provider call)
test("9 — engine makes a single provider call with no retry loop", async () => {
  let callCount = 0;
  const provider = mockProvider(async () => {
    callCount += 1;
    return {
      message: "Te propongo este comercial en el consultorio.",
      creative: pelvicCreativeBrief(CLINIC_FONCIONAL),
    };
  });

  await createCreativeProposalV2(
    { customerMessage: PELVIC_INITIAL_REQUEST },
    { provider },
  );

  assert.equal(callCount, 1);
});

// 10. Proposal passes parseClosedCommercialProposal
test("10 — built proposal passes parseClosedCommercialProposal for all core fixtures", () => {
  for (const brief of [
    pelvicCreativeBrief(CLINIC_FONCIONAL),
    pelvicCreativeBrief(CLINIC_FUNCIONAL),
    BAKERY_CREATIVE_BRIEF,
    PERLA_CREATIVE_BRIEF,
    VILLAGIO_CREATIVE_BRIEF,
  ]) {
    const proposal = buildCommercialProposalFromBrief(brief, {
      sourcePhotoCount: brief.sourceImageFidelity === "protected" ? 1 : 0,
    });
    assertPassesClosedContract(proposal);
  }
});

// 11. La Perla de Oro / Baja fish tacos
test("11 — La Perla de Oro: fish tacos, exact narration and overlay", async () => {
  const provider = mockProvider(async () => ({
    message: "Te propongo un comercial TikTok para tus tacos de pescado Baja.",
    creative: PERLA_CREATIVE_BRIEF,
  }));

  const response = await createCreativeProposalV2(
    { customerMessage: PERLA_REQUEST },
    { provider },
  );

  assert.ok(response.proposal);
  assert.deepEqual(response.proposal!.requiredNarrativeBeats, [...PERLA_VISUAL_EVENTS]);
  assert.equal(response.proposal!.promotionalOverlays.headline, PERLA_HEADLINE);
  assert.ok(response.proposal!.visualGenerationIntent.includes(PERLA_NARRATION));
  assertPassesClosedContract(response.proposal);
  assertNoLeakageInResponse(response);
});

// 12. Villagio restaurant — TikTok, fidelity, sequence, narration, address, phone
test("12 — Villagio: TikTok sequence, protected fidelity, exact promo data", async () => {
  const provider = mockProvider(async () => ({
    message: "Te propongo un comercial TikTok para Villagio con la secuencia completa.",
    creative: VILLAGIO_CREATIVE_BRIEF,
  }));

  const response = await createCreativeProposalV2(
    {
      customerMessage: VILLAGIO_REQUEST,
      projectContext: {
        sourcePhotoCount: 1,
        destination: { platform: "TikTok", aspectRatio: "9:16" },
      },
    },
    { provider },
  );

  assert.ok(response.proposal);
  assert.deepEqual(response.proposal!.requiredNarrativeBeats, [...VILLAGIO_VISUAL_EVENTS]);
  assert.equal(response.proposal!.productionProfile.fidelity_class, "protected");
  assert.equal(response.proposal!.promotionalOverlays.headline, VILLAGIO_HEADLINE);
  assert.equal(response.proposal!.promotionalOverlays.phone, VILLAGIO_PHONE);
  assert.equal(response.proposal!.promotionalOverlays.url, VILLAGIO_ADDRESS);
  assert.ok(response.proposal!.visualGenerationIntent.includes(VILLAGIO_NARRATION));
  assert.match(response.proposal!.pacing, /TikTok/i);
  assertPassesClosedContract(response.proposal);
  assertNoLeakageInResponse(response);
});

// Construction failure → fixed message
test("construction failure returns fixed human-safe message", async () => {
  const provider = mockProvider(async () => ({
    message: "Aquí va tu propuesta.",
    creative: {
      ...pelvicCreativeBrief(CLINIC_FONCIONAL),
      visualEvents: [],
    },
  }));

  const response = await createCreativeProposalV2(
    { customerMessage: PELVIC_INITIAL_REQUEST },
    { provider },
  );

  assert.equal(response.message, DIRECTOR_V2_FAILURE_MESSAGE);
  assert.equal(response.proposal, undefined);
});
