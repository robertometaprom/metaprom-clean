/**
 * Regression for the real pelvic-chair production failure:
 * validatorCode "beats" after the model put spoken/graphic copy into
 * requiredNarrativeBeats, then excluded it from visualGenerationIntent.
 *
 * Run: npx tsx --test tests/director-beats-semantic-categories.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import type OpenAI from "openai";

import type { DirectorDiagnosticEvent } from "../lib/creative-director/diagnostics.ts";
import {
  classifyBeatsDiagnosticSubcode,
  DIRECTOR_DIAG_PREFIX,
} from "../lib/creative-director/diagnostics.ts";
import { createCreativeProposal } from "../lib/creative-director/engine.ts";
import { CREATIVE_DIRECTOR_SYSTEM_PROMPT } from "../lib/creative-director/prompt.ts";
import { createOpenAICreativeDirectorProvider } from "../lib/creative-director/providers/openai.ts";
import {
  commercialProposalContractFailure,
  parseClosedCommercialProposal,
} from "../lib/creative-director/proposal-contract.ts";
import {
  DIRECTOR_REVISION_RETRY_ACTION,
  resolveDirectorRevisionOutcome,
  resolveDirectorRevisionResponse,
} from "../lib/creative-director/revision.ts";
import type {
  CommercialProposal,
  CreativeDirectorProvider,
} from "../lib/creative-director/types.ts";
import {
  findLatestExecutableProposal,
  resolveDirectorComposerAction,
} from "../lib/studio/director-execution-approval.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const VISUAL_BEATS = [
  "A doctor enters the medical office with a woman aged approximately 55–60.",
  "The doctor guides the woman to the pelvic chair.",
  "The woman sits in the pelvic chair.",
] as const;

const NARRATION =
  "Mejora los problemas de incontinencia y recupera tu seguridad con la silla pélvica.";

const CLINIC_FONCIONAL =
  "CLINICA GINECOESTETICA Y FONCIONAL Dra. Maricruz Barraza";
const CLINIC_FUNCIONAL =
  "CLINICA GINECOESTETICA Y FUNCIONAL Dra. Maricruz Barraza";

const INITIAL_REQUEST = [
  "A doctor enters a medical office with a 55–60 year-old woman and seats her in a pelvic chair.",
  `Narration: "${NARRATION}"`,
  `Final graphic: "${CLINIC_FONCIONAL}"`,
].join(" ");

const SPOKEN_INTENT = `Only the doctor speaks. He says the exact phrase once: "${NARRATION}". The woman and every other visible person remain silent. No other speech, dialogue, chanting, murmuring, vocal reactions, improvised words, or vocalizations. Normal non-vocal music, ambience, and sound effects remain allowed.`;

function proposalWithClinicLegend(headline: string): CommercialProposal {
  return {
    summary:
      "Medical-office commercial: a doctor seats a woman in a pelvic chair.",
    openingHook:
      "A doctor enters the medical office with a woman aged approximately 55–60.",
    productHeroMoment: "The woman sits in the pelvic chair.",
    emotionalTone: "professional reassurance",
    pacing: "calm 8-second clinic rhythm",
    callToAction: "Agenda tu cita",
    narrative:
      "A doctor enters the medical office with a woman aged approximately 55–60, guides her to the pelvic chair, and she sits. Overlay carries the clinic legend.",
    requiredNarrativeBeats: [...VISUAL_BEATS],
    visualGenerationIntent: `${VISUAL_BEATS.join(" ")} ${SPOKEN_INTENT}`,
    productionProfile: {
      fidelity_class: "protected",
      preserve_product_identity: true,
      protected_reasons: ["packaging", "label", "logo", "typography"],
      veo_copy_policy: "deterministic_overlay_only",
    },
    promotionalOverlays: {
      headline,
      call_to_action: "Agenda tu cita",
      timing_or_layout: "bottom_outro",
    },
    overlayStyle: {
      typography_treatment: "refined",
      palette_preset: "light",
      text_alignment: "center",
      cta_treatment: "text_only",
      promotion_treatment: "emphasis",
      origin: "user",
    },
  };
}

const INITIAL_PROPOSAL = proposalWithClinicLegend(CLINIC_FONCIONAL);
const REVISED_PROPOSAL = proposalWithClinicLegend(CLINIC_FUNCIONAL);

const PRODUCTION_FAILURE_SHAPE = {
  ...INITIAL_PROPOSAL,
  requiredNarrativeBeats: [
    VISUAL_BEATS[0],
    NARRATION,
    CLINIC_FONCIONAL,
  ],
  visualGenerationIntent: VISUAL_BEATS.join(" "),
};

function payload(body: Record<string, unknown>): string {
  return JSON.stringify(body);
}

function mockOpenAI(contents: Array<string | null>) {
  const calls: Array<{ messages?: Array<{ role?: string; content?: string }> }> =
    [];
  let index = 0;
  const client = {
    chat: {
      completions: {
        create: async (args: {
          messages?: Array<{ role?: string; content?: string }>;
        }) => {
          calls.push(args);
          const content = contents[Math.min(index, contents.length - 1)] ?? null;
          index += 1;
          return { choices: [{ message: { content } }] };
        },
      },
    },
  } as unknown as OpenAI;

  return { client, calls };
}

function parseDirectorDiagnostic(args: unknown[]): DirectorDiagnosticEvent | null {
  const text = args
    .map((arg) => (typeof arg === "string" ? arg : ""))
    .join(" ");
  const marker = `${DIRECTOR_DIAG_PREFIX} `;
  const index = text.indexOf(marker);
  if (index === -1) return null;
  return JSON.parse(text.slice(index + marker.length)) as DirectorDiagnosticEvent;
}

async function withDirectorDiagnostics<T>(
  run: () => Promise<T>,
): Promise<{ result: T; events: DirectorDiagnosticEvent[] }> {
  const events: DirectorDiagnosticEvent[] = [];
  const original = console.info;
  console.info = ((...args: unknown[]) => {
    const event = parseDirectorDiagnostic(args);
    if (event) events.push(event);
  }) as typeof console.info;
  try {
    const result = await run();
    return { result, events };
  } finally {
    console.info = original;
  }
}

function assertVisualBeatsOnly(proposal: CommercialProposal) {
  assert.deepEqual(proposal.requiredNarrativeBeats, [...VISUAL_BEATS]);
  const beats = JSON.stringify(proposal.requiredNarrativeBeats);
  assert.doesNotMatch(beats, /Mejora los problemas de incontinencia/);
  assert.doesNotMatch(beats, /CLINICA GINECOESTETICA/);
  assert.doesNotMatch(beats, /FONCIONAL|FUNCIONAL/);
  assert.doesNotMatch(beats, /Dra\. Maricruz Barraza/);
}

function assertOverlayHeadline(proposal: CommercialProposal, headline: string) {
  assert.equal(proposal.promotionalOverlays.headline, headline);
}

test("prompt removes the spoken-copy-in-required-beats contradiction", () => {
  assert.doesNotMatch(
    CREATIVE_DIRECTOR_SYSTEM_PROMPT,
    /Never replace or weaken it in the narrative, required beats, or any other proposal field/,
  );
  assert.match(
    CREATIVE_DIRECTOR_SYSTEM_PROMPT,
    /Spoken and narrated copy is not a requiredNarrativeBeat/,
  );
  assert.match(
    CREATIVE_DIRECTOR_SYSTEM_PROMPT,
    /VISUAL EVENT \(short observable action that can be seen\)/,
  );
  assert.match(
    CREATIVE_DIRECTOR_SYSTEM_PROMPT,
    /SPOKEN\/NARRATED COPY \(exact words to be spoken\)/,
  );
  assert.match(
    CREATIVE_DIRECTOR_SYSTEM_PROMPT,
    /GRAPHIC\/PROMOTIONAL OVERLAY COPY/,
  );
  assert.match(
    CREATIVE_DIRECTOR_SYSTEM_PROMPT,
    /Derive 1-4 requiredNarrativeBeats from VISUAL EVENTS only/,
  );
  assert.match(
    CREATIVE_DIRECTOR_SYSTEM_PROMPT,
    /Do not promote that spoken wording into requiredNarrativeBeats merely to preserve it/,
  );
  assert.match(
    CREATIVE_DIRECTOR_SYSTEM_PROMPT,
    /Never include those exact graphic requirements in "visualGenerationIntent" or requiredNarrativeBeats/,
  );
  assert.match(
    CREATIVE_DIRECTOR_SYSTEM_PROMPT,
    /Last Completed Proposal/,
  );
  assert.match(
    CREATIVE_DIRECTOR_SYSTEM_PROMPT,
    /Do not acknowledge a correction without returning that updated proposal/,
  );
});

test("initial request contains the three real production categories", () => {
  assert.match(INITIAL_REQUEST, /pelvic chair/i);
  assert.ok(INITIAL_REQUEST.includes(NARRATION));
  assert.ok(INITIAL_REQUEST.includes(CLINIC_FONCIONAL));
});

test("correct fixture: visual beats only, narration and clinic stay in their fields, existing beats contract passes", () => {
  const failure = commercialProposalContractFailure(INITIAL_PROPOSAL);
  assert.equal(failure, null);

  const parsed = parseClosedCommercialProposal(INITIAL_PROPOSAL);
  assert.ok("proposal" in parsed);
  if (!("proposal" in parsed)) return;

  assertVisualBeatsOnly(parsed.proposal);
  assertOverlayHeadline(parsed.proposal, CLINIC_FONCIONAL);
  assert.match(parsed.proposal.visualGenerationIntent, new RegExp(VISUAL_BEATS[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.ok(parsed.proposal.visualGenerationIntent.includes(NARRATION));
  assert.doesNotMatch(
    parsed.proposal.visualGenerationIntent,
    /CLINICA GINECOESTETICA Y FONCIONAL Dra\. Maricruz Barraza/,
  );
  assert.doesNotMatch(
    JSON.stringify(parsed.proposal.requiredNarrativeBeats),
    new RegExp(NARRATION.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  );
});

test("production-failure shape still fails the existing beats contract without loosening it", () => {
  const failure = commercialProposalContractFailure(PRODUCTION_FAILURE_SHAPE);
  assert.ok(failure);
  assert.equal(failure?.code, "beats");
  assert.match(
    failure?.detail ?? "",
    /visualGenerationIntent is missing required narrative beat/,
  );
  assert.equal(
    classifyBeatsDiagnosticSubcode(failure?.detail ?? ""),
    "missing_verbatim_beat",
  );
  assert.equal(
    classifyBeatsDiagnosticSubcode(
      "required_narrative_beats must contain 1-4 observable beats for an 8-second clip.",
    ),
    "invalid_beat_array",
  );
});

test("provider accepts the correct pelvic-chair fixture on the initial request", async () => {
  const { client } = mockOpenAI([
    payload({
      message: "Te propongo este comercial en el consultorio.",
      proposal: INITIAL_PROPOSAL,
    }),
  ]);
  const provider = createOpenAICreativeDirectorProvider({ client });

  const response = await provider.generate({
    systemPrompt: CREATIVE_DIRECTOR_SYSTEM_PROMPT,
    customerMessage: INITIAL_REQUEST,
    projectContext: {},
  });

  assert.ok(response.proposal);
  assertVisualBeatsOnly(response.proposal!);
  assertOverlayHeadline(response.proposal!, CLINIC_FONCIONAL);
  assert.ok(response.proposal!.visualGenerationIntent.includes(NARRATION));
});

test("revision CAMBIAR FONCIONAL POR FUNCIONAL returns a valid updated proposal", async () => {
  const provider: CreativeDirectorProvider = {
    async generate() {
      return {
        message: "Corregí FONCIONAL por FUNCIONAL en el overlay.",
        needsClarification: false,
        proposal: REVISED_PROPOSAL,
      };
    },
  };

  const response = await createCreativeProposal(
    {
      customerMessage: "CAMBIAR FONCIONAL POR FUNCIONAL",
      projectContext: { lastCompletedProposal: INITIAL_PROPOSAL },
    },
    { provider },
  );

  assert.equal(
    resolveDirectorRevisionOutcome({
      lastCompletedProposal: INITIAL_PROPOSAL,
      response,
    }),
    "applied",
  );
  assert.ok(response.proposal);
  assert.equal(commercialProposalContractFailure(response.proposal), null);
  assertVisualBeatsOnly(response.proposal!);
  assertOverlayHeadline(response.proposal!, CLINIC_FUNCIONAL);
  assert.doesNotMatch(
    response.proposal!.promotionalOverlays.headline ?? "",
    /FONCIONAL/,
  );
  assert.doesNotMatch(JSON.stringify(response.proposal), /FONCIONAL/);
  assert.equal(response.revisionApplyFailed, undefined);
  assert.equal(response.needsClarification, false);
});

test("revised turn exposes Usar esta propuesta / Editar propuesta and Usar executes the revised object", () => {
  const messages = [
    { role: "customer" as const, content: INITIAL_REQUEST },
    {
      id: "initial",
      role: "director" as const,
      content: "Propuesta inicial",
      proposal: INITIAL_PROPOSAL,
    },
    {
      role: "customer" as const,
      content: "CAMBIAR FONCIONAL POR FUNCIONAL",
    },
    {
      id: "revised",
      role: "director" as const,
      content: "Overlay actualizado.",
      proposal: REVISED_PROPOSAL,
    },
  ];

  const executable = findLatestExecutableProposal(messages);
  assert.equal(executable, REVISED_PROPOSAL);
  assertOverlayHeadline(executable!, CLINIC_FUNCIONAL);
  assert.notEqual(executable, INITIAL_PROPOSAL);

  const action = resolveDirectorComposerAction({
    composerText: "hazlo",
    messages,
  });
  assert.equal(action.type, "accept_proposal");
  if (action.type !== "accept_proposal") return;
  assert.equal(action.proposal, REVISED_PROPOSAL);
  assertOverlayHeadline(action.proposal, CLINIC_FUNCIONAL);
  assert.doesNotMatch(
    action.proposal.promotionalOverlays.headline ?? "",
    /FONCIONAL/,
  );

  const panel = readFileSync(
    join(ROOT, "components/studio/CreativeDirectorPanel.tsx"),
    "utf8",
  );
  assert.match(panel, /resolveDirectorRevisionResponse/);
  assert.match(panel, /proposal: resolved\.proposal/);
  assert.match(panel, /Usar esta propuesta/);
  assert.match(panel, /Editar propuesta/);
  assert.match(panel, /isLatest=\{message\.id === latestProposalMessageId\}/);
  assert.match(
    panel,
    /handleUseProposal\(\s*message\.proposal!/,
  );
  assert.doesNotMatch(panel, /proposal:\s*priorProposal/);
});

test("failed safe revision stays recovery and never executes FONCIONAL", () => {
  const resolved = resolveDirectorRevisionResponse({
    lastCompletedProposal: INITIAL_PROPOSAL,
    response: {
      message: "Listo, ya está FUNCIONAL.",
      needsClarification: false,
    },
  });

  assert.equal(resolved.revisionApplyFailed, true);
  assert.equal(resolved.proposal, undefined);
  assert.notEqual(resolved.proposal, INITIAL_PROPOSAL);

  const messages = [
    {
      role: "director" as const,
      content: "Propuesta inicial",
      proposal: INITIAL_PROPOSAL,
    },
    {
      role: "customer" as const,
      content: "CAMBIAR FONCIONAL POR FUNCIONAL",
    },
    {
      role: "director" as const,
      content: resolved.message,
      revisionApplyFailed: true,
    },
  ];

  assert.equal(findLatestExecutableProposal(messages), null);
  const action = resolveDirectorComposerAction({
    composerText: "hazlo",
    messages,
  });
  assert.equal(action.type, "converse");

  const panel = readFileSync(
    join(ROOT, "components/studio/CreativeDirectorPanel.tsx"),
    "utf8",
  );
  assert.match(panel, /DIRECTOR_REVISION_RETRY_ACTION/);
  assert.equal(DIRECTOR_REVISION_RETRY_ACTION, "Reintentar corrección");
});

test("missing_verbatim_beat retry receives beats-specific repair instruction and returns a valid proposal", async () => {
  const { client, calls } = mockOpenAI([
    payload({
      message: "Te propongo este comercial en el consultorio.",
      proposal: PRODUCTION_FAILURE_SHAPE,
    }),
    payload({
      message: "Te propongo este comercial en el consultorio.",
      proposal: INITIAL_PROPOSAL,
    }),
  ]);
  const provider = createOpenAICreativeDirectorProvider({ client });

  const { result: response, events } = await withDirectorDiagnostics(() =>
    provider.generate({
      systemPrompt: CREATIVE_DIRECTOR_SYSTEM_PROMPT,
      customerMessage: INITIAL_REQUEST,
      projectContext: {},
    }),
  );

  const retryMessage = calls[1]?.messages?.find(
    (message) =>
      message.role === "user" &&
      typeof message.content === "string" &&
      message.content.includes("requiredNarrativeBeats[0]"),
  )?.content;
  assert.ok(retryMessage);
  assert.match(retryMessage!, /VERBATIM/i);
  assert.match(retryMessage!, /Do not paraphrase/);
  assert.match(retryMessage!, /Do not shorten/);
  assert.match(retryMessage!, /Do not semantically rewrite/);
  assert.match(retryMessage!, /Preserve the exact string/);
  assert.match(retryMessage!, /VISUAL EVENTS/);
  assert.match(retryMessage!, /SPOKEN\/NARRATED COPY/);
  assert.match(retryMessage!, /GRAPHIC\/PROMOTIONAL COPY/);
  assert.match(retryMessage!, /promotionalOverlays only/);
  assert.match(
    retryMessage!,
    /Do NOT move promotional overlay copy into requiredNarrativeBeats/,
  );
  for (const beat of PRODUCTION_FAILURE_SHAPE.requiredNarrativeBeats) {
    assert.ok(retryMessage!.includes(JSON.stringify(beat)));
  }

  assert.ok(response.proposal);
  assert.equal(commercialProposalContractFailure(response.proposal), null);
  for (const beat of response.proposal!.requiredNarrativeBeats) {
    assert.ok(response.proposal!.visualGenerationIntent.includes(beat));
  }
  assertVisualBeatsOnly(response.proposal!);
  assertOverlayHeadline(response.proposal!, CLINIC_FONCIONAL);
  assert.ok(response.proposal!.visualGenerationIntent.includes(NARRATION));

  const parseEvents = events.filter(
    (event) => event.event === "director.parse_outcome",
  );
  assert.deepEqual(parseEvents[0], {
    event: "director.parse_outcome",
    outcome: "invalid_proposal",
    validatorCode: "beats",
    validatorSubcode: "missing_verbatim_beat",
  });
  assert.deepEqual(parseEvents[1], {
    event: "director.parse_outcome",
    outcome: "valid_proposal",
  });
  assert.deepEqual(
    events.find((event) => event.event === "director.provider_final"),
    {
      event: "director.provider_final",
      final: "returned_with_proposal",
      attempt: 1,
    },
  );
});

test("beats diagnostic subcodes stay server-only and do not leak customer copy", async () => {
  const { client } = mockOpenAI([
    payload({
      message: "Te propongo este comercial en el consultorio.",
      proposal: PRODUCTION_FAILURE_SHAPE,
    }),
    payload({
      message: "Te propongo este comercial en el consultorio.",
      proposal: INITIAL_PROPOSAL,
    }),
  ]);
  const provider = createOpenAICreativeDirectorProvider({ client });

  const { result: response, events } = await withDirectorDiagnostics(() =>
    provider.generate({
      systemPrompt: "test",
      customerMessage: INITIAL_REQUEST,
      projectContext: {},
    }),
  );

  assert.ok(response.proposal);
  assertVisualBeatsOnly(response.proposal!);

  const parseEvents = events.filter(
    (event) => event.event === "director.parse_outcome",
  );
  assert.deepEqual(parseEvents[0], {
    event: "director.parse_outcome",
    outcome: "invalid_proposal",
    validatorCode: "beats",
    validatorSubcode: "missing_verbatim_beat",
  });
  assert.deepEqual(parseEvents[1], {
    event: "director.parse_outcome",
    outcome: "valid_proposal",
  });

  const serialized = JSON.stringify(events);
  assert.doesNotMatch(serialized, /Mejora los problemas de incontinencia/);
  assert.doesNotMatch(serialized, /CLINICA GINECOESTETICA/);
  assert.doesNotMatch(serialized, /visualGenerationIntent/);
  assert.doesNotMatch(serialized, /requiredNarrativeBeats/);
  assert.doesNotMatch(serialized, /Dra\. Maricruz Barraza/);
});
