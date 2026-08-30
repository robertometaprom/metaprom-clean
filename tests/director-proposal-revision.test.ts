/**
 * Director revision continuity + proposal fidelity.
 *
 * After a completed proposal, a customer correction must end in:
 * A) updated structured proposal + current-turn Usar/Editar
 * B) one genuine clarification, without proposal actions
 * C) honest recovery, never executing stale copy as the revision
 *
 * Run: npx tsx --test tests/director-proposal-revision.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import type OpenAI from "openai";

import { createCreativeProposal } from "../lib/creative-director/engine.ts";
import { CREATIVE_DIRECTOR_SYSTEM_PROMPT } from "../lib/creative-director/prompt.ts";
import { createOpenAICreativeDirectorProvider } from "../lib/creative-director/providers/openai.ts";
import {
  DIRECTOR_REVISION_APPLY_FAILED_MESSAGE,
  resolveDirectorRevisionOutcome,
  resolveDirectorRevisionResponse,
} from "../lib/creative-director/revision.ts";
import type {
  CommercialProposal,
  CreativeDirectorProvider,
} from "../lib/creative-director/types.ts";
import { sanitizeProjectContext } from "../lib/security/validation.ts";
import {
  findLatestCompletedProposal,
  findLatestExecutableProposal,
  resolveDirectorComposerAction,
} from "../lib/studio/director-execution-approval.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

const DIRECTOR_BEATS = [
  "A clinician presents a pelvic chair in a medical office",
  "The chair is shown in a brief functional demonstration",
  "The clinic name appears as the closing overlay",
] as const;

const FONCIONAL_HEADLINE = "CLÍNICA GINECOESTÉTICA Y FONCIONAL";
const FUNCIONAL_HEADLINE = "CLÍNICA GINECOESTÉTICA Y FUNCIONAL";

function proposalWithHeadline(headline: string): CommercialProposal {
  return {
    summary: "TikTok commercial for a pelvic chair in a medical office.",
    openingHook: "A calm medical office opens on the pelvic chair.",
    productHeroMoment: "The chair is presented as a functional clinic tool.",
    emotionalTone: "professional confidence",
    pacing: "brisk TikTok rhythm",
    callToAction: "Agenda tu cita",
    narrative: `Comercial TikTok para una silla pélvica. Overlay: ${headline}.`,
    visualGenerationIntent: DIRECTOR_BEATS.join(". ") + ".",
    requiredNarrativeBeats: [...DIRECTOR_BEATS],
    productionProfile: {
      fidelity_class: "protected",
      preserve_product_identity: true,
      protected_reasons: ["packaging", "label", "logo", "typography"],
      veo_copy_policy: "deterministic_overlay_only",
    },
    promotionalOverlays: {
      headline,
      call_to_action: "Agenda tu cita",
      timing_or_layout: "top_intro",
    },
    overlayStyle: {
      typography_treatment: "cinematic",
      palette_preset: "warm",
      text_alignment: "center",
      cta_treatment: "panel",
      promotion_treatment: "badge",
      origin: "user",
    },
  };
}

const STALE_PROPOSAL = proposalWithHeadline(FONCIONAL_HEADLINE);
const REVISED_PROPOSAL = proposalWithHeadline(FUNCIONAL_HEADLINE);

function assertProposalHasFuncional(proposal: CommercialProposal | undefined) {
  assert.ok(proposal, "expected an updated structured proposal");
  const serialized = JSON.stringify(proposal);
  assert.match(proposal.promotionalOverlays.headline ?? "", /FUNCIONAL/);
  assert.doesNotMatch(proposal.promotionalOverlays.headline ?? "", /FONCIONAL/);
  assert.match(serialized, /FUNCIONAL/);
  assert.doesNotMatch(serialized, /FONCIONAL/);
}

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

test("A — accepted correction returns a valid updated proposal with FUNCIONAL", async () => {
  const provider: CreativeDirectorProvider = {
    async generate() {
      return {
        message: "Actualicé FONCIONAL por FUNCIONAL.",
        needsClarification: false,
        proposal: REVISED_PROPOSAL,
      };
    },
  };

  const response = await createCreativeProposal(
    {
      customerMessage: "Cambiar FONCIONAL por FUNCIONAL",
      projectContext: { lastCompletedProposal: STALE_PROPOSAL },
    },
    { provider },
  );

  assert.equal(resolveDirectorRevisionOutcome({
    lastCompletedProposal: STALE_PROPOSAL,
    response,
  }), "applied");
  assertProposalHasFuncional(response.proposal);
  assert.equal(response.revisionApplyFailed, undefined);
  assert.equal(response.needsClarification, false);
});

test("A — Usar esta propuesta hands off the UPDATED proposal, not FONCIONAL", () => {
  const messages = [
    { role: "customer" as const, content: "Quiero un comercial TikTok" },
    {
      role: "director" as const,
      content: "Propuesta inicial",
      proposal: STALE_PROPOSAL,
    },
    { role: "customer" as const, content: "Cambiar FONCIONAL por FUNCIONAL" },
    {
      role: "director" as const,
      content: "Listo, actualicé la propuesta.",
      proposal: REVISED_PROPOSAL,
    },
  ];

  const executable = findLatestExecutableProposal(messages);
  assertProposalHasFuncional(executable ?? undefined);

  const action = resolveDirectorComposerAction({
    composerText: "hazlo",
    messages,
  });
  assert.equal(action.type, "accept_proposal");
  if (action.type !== "accept_proposal") return;
  assertProposalHasFuncional(action.proposal);
  assert.notEqual(action.proposal, STALE_PROPOSAL);
});

test("B — genuine clarification does not expose proposal actions", () => {
  const clarification = resolveDirectorRevisionResponse({
    lastCompletedProposal: STALE_PROPOSAL,
    response: {
      message: "¿Quieres el cambio solo en el overlay o también en la narración?",
      needsClarification: true,
      clarifyingQuestions: [
        "¿El cambio es solo en el texto del overlay?",
      ],
      proposal: STALE_PROPOSAL,
    },
  });

  assert.equal(clarification.needsClarification, true);
  assert.equal(clarification.proposal, undefined);
  assert.equal(clarification.revisionApplyFailed, undefined);

  const messages = [
    {
      role: "director" as const,
      content: "Propuesta inicial",
      proposal: STALE_PROPOSAL,
    },
    { role: "customer" as const, content: "Cambia el texto" },
    {
      role: "director" as const,
      content: clarification.message,
      needsClarification: true,
    },
  ];

  assert.equal(findLatestExecutableProposal(messages), null);
  const action = resolveDirectorComposerAction({
    composerText: "hazlo",
    messages,
  });
  assert.equal(action.type, "converse");
});

test("C — acknowledgement without updated proposal never executes stale FONCIONAL", async () => {
  const provider: CreativeDirectorProvider = {
    async generate() {
      return {
        message: "Listo, ya cambié FONCIONAL por FUNCIONAL.",
        needsClarification: false,
      };
    },
  };

  const response = await createCreativeProposal(
    {
      customerMessage: "Cambiar FONCIONAL por FUNCIONAL",
      projectContext: { lastCompletedProposal: STALE_PROPOSAL },
    },
    { provider },
  );

  assert.equal(response.revisionApplyFailed, true);
  assert.equal(response.proposal, undefined);
  assert.equal(response.message, DIRECTOR_REVISION_APPLY_FAILED_MESSAGE);
  assert.doesNotMatch(JSON.stringify(response), /FONCIONAL/);

  const messages = [
    {
      role: "director" as const,
      content: "Propuesta inicial",
      proposal: STALE_PROPOSAL,
    },
    { role: "customer" as const, content: "Cambiar FONCIONAL por FUNCIONAL" },
    {
      role: "director" as const,
      content: response.message,
      revisionApplyFailed: true,
    },
  ];

  assert.ok(findLatestCompletedProposal(messages));
  assert.equal(findLatestExecutableProposal(messages), null);
  const action = resolveDirectorComposerAction({
    composerText: "hazlo",
    messages,
  });
  assert.equal(action.type, "converse");
});

test("C — invalid closed proposal fallback after revision is recovery, not stale attach", async () => {
  const invalid = {
    ...REVISED_PROPOSAL,
    productionProfile: {
      ...REVISED_PROPOSAL.productionProfile,
      fidelity_class: "invalid-class",
    },
  };
  const { client } = mockOpenAI([
    payload({
      message: "Actualicé el texto.",
      proposal: invalid,
    }),
    payload({
      message: "Actualicé el texto.",
      proposal: invalid,
    }),
  ]);
  const provider = createOpenAICreativeDirectorProvider({ client });

  const response = await createCreativeProposal(
    {
      customerMessage: "Cambiar FONCIONAL por FUNCIONAL",
      projectContext: { lastCompletedProposal: STALE_PROPOSAL },
    },
    { provider },
  );

  assert.equal(response.revisionApplyFailed, true);
  assert.equal(response.proposal, undefined);
  assert.equal(response.message, DIRECTOR_REVISION_APPLY_FAILED_MESSAGE);
});

test("provider retries an acknowledge-only revision and then returns FUNCIONAL", async () => {
  const { client, calls } = mockOpenAI([
    payload({
      message: "Listo, ya lo corregí.",
      needsClarification: false,
    }),
    payload({
      message: "Propuesta actualizada.",
      needsClarification: false,
      proposal: REVISED_PROPOSAL,
    }),
  ]);
  const provider = createOpenAICreativeDirectorProvider({ client });

  const response = await provider.generate({
    systemPrompt: "test",
    customerMessage: "Cambiar FONCIONAL por FUNCIONAL",
    projectContext: { lastCompletedProposal: STALE_PROPOSAL },
  });

  assert.equal(calls.length, 2);
  const retryContent = calls[1]?.messages?.at(-1)?.content ?? "";
  assert.match(retryContent, /full updated valid proposal/i);
  assertProposalHasFuncional(response.proposal);
});

test("first-turn omit without a completed proposal stays unchanged", async () => {
  const provider: CreativeDirectorProvider = {
    async generate() {
      return {
        message: "Cuéntame el destino.",
        needsClarification: false,
      };
    },
  };

  const response = await createCreativeProposal(
    { customerMessage: "Quiero un comercial" },
    { provider },
  );

  assert.equal(response.message, "Cuéntame el destino.");
  assert.equal(response.proposal, undefined);
  assert.equal(response.revisionApplyFailed, undefined);
});

test("client safety net never attaches the stale proposal as the revised version", () => {
  const resolved = resolveDirectorRevisionResponse({
    lastCompletedProposal: STALE_PROPOSAL,
    response: {
      message: "Listo, ya está FUNCIONAL.",
      needsClarification: false,
    },
  });

  assert.equal(resolved.revisionApplyFailed, true);
  assert.equal(resolved.proposal, undefined);
  assert.notEqual(resolved.proposal, STALE_PROPOSAL);
});

test("sanitize keeps a valid lastCompletedProposal and drops an invalid one", () => {
  const kept = sanitizeProjectContext({
    lastCompletedProposal: STALE_PROPOSAL,
  });
  assert.equal(
    kept?.lastCompletedProposal?.promotionalOverlays.headline,
    FONCIONAL_HEADLINE,
  );

  const dropped = sanitizeProjectContext({
    lastCompletedProposal: {
      ...STALE_PROPOSAL,
      productionProfile: {
        ...STALE_PROPOSAL.productionProfile,
        fidelity_class: "invalid-class",
      },
    },
  });
  assert.equal(dropped?.lastCompletedProposal, undefined);
});

test("prompt requires a full updated proposal after a completed proposal", () => {
  assert.match(
    CREATIVE_DIRECTOR_SYSTEM_PROMPT,
    /Last Completed Proposal/,
  );
  assert.match(
    CREATIVE_DIRECTOR_SYSTEM_PROMPT,
    /Do not acknowledge a correction without returning that updated proposal/,
  );
  assert.match(
    CREATIVE_DIRECTOR_SYSTEM_PROMPT,
    /Ask exactly one clarifying question and omit "proposal"/,
  );
});

test("panel restores current-turn Usar/Editar only from the resolved proposal", () => {
  const panel = readRepo("components/studio/CreativeDirectorPanel.tsx");

  assert.match(panel, /lastCompletedProposal/);
  assert.match(panel, /resolveDirectorRevisionResponse/);
  assert.match(panel, /proposal: resolved\.proposal/);
  assert.match(panel, /Usar esta propuesta/);
  assert.match(panel, /Editar propuesta/);
  assert.match(panel, /DIRECTOR_REVISION_RETRY_ACTION/);
  assert.match(panel, /handleRetryRevision/);
  assert.match(
    panel,
    /handleUseProposal\(\s*message\.proposal!/,
  );
  assert.doesNotMatch(panel, /proposal:\s*priorProposal/);
  assert.doesNotMatch(panel, /proposal:\s*findLatestCompletedProposal\(/);
  assert.doesNotMatch(panel, /proposal:\s*findLatestExecutableProposal\(/);
  assert.doesNotMatch(
    panel,
    /response\.proposal\s*\?\s*response\.proposal\s*:\s*priorProposal/,
  );
});
