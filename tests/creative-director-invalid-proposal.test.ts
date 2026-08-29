/**
 * Director closed-proposal contract: invalid optional proposal must not 500.
 *
 * Phase 1 reproduced current throw + HTTP 500 mapping before this fallback.
 * Run: npx tsx --test tests/creative-director-invalid-proposal.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import type OpenAI from "openai";

import { createOpenAICreativeDirectorProvider } from "../lib/creative-director/providers/openai.ts";
import { CreativeDirectorError } from "../lib/creative-director/types.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const DIRECTOR_BEATS = [
  "A bakery owner photographs a pastry box with her phone",
  "She uploads the photo",
  "The photo transforms into a professional advertisement",
] as const;

const VALID_MESSAGE =
  "Te propongo un comercial breve donde la panadería transforma su caja en un anuncio.";

const VALID_PROPOSAL = {
  summary: "A bakery owner turns a pastry box photo into a campaign.",
  openingHook: "A bakery owner photographs a pastry box with her phone",
  productHeroMoment: "The photo transforms into a professional advertisement",
  emotionalTone: "warm confidence",
  pacing: "brisk and clear",
  callToAction: "Conoce más",
  narrative:
    "A bakery owner photographs a pastry box with her phone, uploads it, and watches it become a professional advertisement.",
  visualGenerationIntent: DIRECTOR_BEATS.join(". ") + ".",
  requiredNarrativeBeats: [...DIRECTOR_BEATS],
  productionProfile: {
    fidelity_class: "protected",
    preserve_product_identity: true,
    protected_reasons: ["packaging", "label", "logo", "typography"],
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
};

/** Structurally present proposal that fails the closed productionProfile contract. */
const INVALID_PROPOSAL = {
  ...VALID_PROPOSAL,
  productionProfile: {
    fidelity_class: "invalid-class",
    preserve_product_identity: true,
    protected_reasons: ["packaging", "label", "logo", "typography"],
    veo_copy_policy: "deterministic_overlay_only",
  },
};

type ChatCreateArgs = {
  messages?: Array<{ role?: string; content?: string }>;
};

function mockOpenAI(contents: Array<string | null>) {
  const calls: ChatCreateArgs[] = [];
  let index = 0;
  const client = {
    chat: {
      completions: {
        create: async (args: ChatCreateArgs) => {
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

function providerFrom(contents: Array<string | null>) {
  const mock = mockOpenAI(contents);
  return {
    ...mock,
    provider: createOpenAICreativeDirectorProvider({ client: mock.client }),
  };
}

const REQUEST = {
  systemPrompt: "Creative Director test prompt",
  customerMessage: "Quiero un comercial de mi panadería",
  projectContext: {},
};

function payload(body: Record<string, unknown>): string {
  return JSON.stringify(body);
}

test("1 — valid message + valid proposal succeeds unchanged", async () => {
  const { provider, calls } = providerFrom([
    payload({ message: VALID_MESSAGE, proposal: VALID_PROPOSAL }),
  ]);

  const response = await provider.generate(REQUEST);

  assert.equal(response.message, VALID_MESSAGE);
  assert.ok(response.proposal);
  assert.equal(response.proposal?.summary, VALID_PROPOSAL.summary);
  assert.deepEqual(response.proposal?.requiredNarrativeBeats, [...DIRECTOR_BEATS]);
  assert.equal(response.proposal?.productionProfile.fidelity_class, "protected");
  assert.equal(calls.length, 1);
});

test("2 — valid message + no proposal succeeds unchanged", async () => {
  const { provider, calls } = providerFrom([
    payload({ message: VALID_MESSAGE }),
  ]);

  const response = await provider.generate(REQUEST);

  assert.equal(response.message, VALID_MESSAGE);
  assert.equal(response.proposal, undefined);
  assert.equal(calls.length, 1);
});

test("3 — attempt 1 invalid proposal + attempt 2 valid proposal succeeds with proposal", async () => {
  const { provider, calls } = providerFrom([
    payload({ message: VALID_MESSAGE, proposal: INVALID_PROPOSAL }),
    payload({ message: VALID_MESSAGE, proposal: VALID_PROPOSAL }),
  ]);

  const response = await provider.generate(REQUEST);

  assert.equal(response.message, VALID_MESSAGE);
  assert.ok(response.proposal);
  assert.equal(response.proposal?.summary, VALID_PROPOSAL.summary);
  assert.equal(response.proposal?.productionProfile.fidelity_class, "protected");
  assert.equal(calls.length, 2);
  const retryContent = calls[1]?.messages?.at(-1)?.content ?? "";
  assert.match(retryContent, /production_profile\.fidelity_class is invalid/);
  assert.doesNotMatch(
    JSON.stringify(response.proposal),
    /invalid-class/,
  );
});

test("4 — exhausted invalid proposal + valid message succeeds with message and no proposal", async () => {
  const invalidTurn = payload({ message: VALID_MESSAGE, proposal: INVALID_PROPOSAL });
  const { provider, calls } = providerFrom([invalidTurn, invalidTurn]);

  const response = await provider.generate(REQUEST);

  assert.equal(response.message, VALID_MESSAGE);
  assert.equal(response.proposal, undefined);
  assert.equal(calls.length, 2);
  assert.doesNotMatch(JSON.stringify(response), /invalid-class/);
  assert.doesNotMatch(JSON.stringify(response), /INVALID_PROPOSAL/);
});

test("5 — invalid or missing conversational message still fails", async () => {
  const missing = providerFrom([
    payload({ proposal: VALID_PROPOSAL }),
    payload({ proposal: INVALID_PROPOSAL }),
  ]);
  await assert.rejects(
    () => missing.provider.generate(REQUEST),
    (error: unknown) => {
      assert.ok(error instanceof CreativeDirectorError);
      assert.equal(
        error.message,
        "Creative Director provider response missing required message field.",
      );
      return true;
    },
  );
  assert.equal(missing.calls.length, 2);

  const emptyThenMissing = providerFrom([
    payload({ message: "", proposal: VALID_PROPOSAL }),
    payload({ proposal: VALID_PROPOSAL }),
  ]);
  await assert.rejects(
    () => emptyThenMissing.provider.generate(REQUEST),
    (error: unknown) => {
      assert.ok(error instanceof CreativeDirectorError);
      assert.equal(
        error.message,
        "Creative Director provider response missing required message field.",
      );
      return true;
    },
  );
});

test("5b — last-attempt missing message does not keep a prior conversational turn", async () => {
  const { provider } = providerFrom([
    payload({ message: VALID_MESSAGE, proposal: INVALID_PROPOSAL }),
    payload({ proposal: VALID_PROPOSAL }),
  ]);

  await assert.rejects(
    () => provider.generate(REQUEST),
    (error: unknown) => {
      assert.ok(error instanceof CreativeDirectorError);
      assert.equal(
        error.message,
        "Creative Director provider response missing required message field.",
      );
      return true;
    },
  );
});

test("6 — strict proposal validation remains active and informs retry", async () => {
  const beatsInvalid = {
    ...VALID_PROPOSAL,
    requiredNarrativeBeats: [],
  };
  const { provider, calls } = providerFrom([
    payload({ message: VALID_MESSAGE, proposal: beatsInvalid }),
    payload({ message: VALID_MESSAGE, proposal: VALID_PROPOSAL }),
  ]);

  const response = await provider.generate(REQUEST);

  assert.ok(response.proposal);
  assert.deepEqual(response.proposal?.requiredNarrativeBeats, [...DIRECTOR_BEATS]);
  const retryContent = calls[1]?.messages?.at(-1)?.content ?? "";
  assert.match(
    retryContent,
    /required_narrative_beats must contain 1-4 observable beats/,
  );
});

test("7 — invalid proposal is never returned to the client", async () => {
  const overlayInvalid = {
    ...VALID_PROPOSAL,
    overlayStyle: {
      ...VALID_PROPOSAL.overlayStyle,
      origin: "not-a-supported-origin",
    },
  };
  const { provider } = providerFrom([
    payload({ message: VALID_MESSAGE, proposal: overlayInvalid }),
    payload({ message: VALID_MESSAGE, proposal: overlayInvalid }),
  ]);

  const response = await provider.generate(REQUEST);

  assert.equal(response.message, VALID_MESSAGE);
  assert.equal(response.proposal, undefined);
  const serialized = JSON.stringify(response);
  assert.doesNotMatch(serialized, /not-a-supported-origin/);
  assert.doesNotMatch(serialized, /"proposal"/);
});

test("true CreativeDirectorError failures still map to HTTP 500 at the route", () => {
  const route = readFileSync(join(ROOT, "app/api/creative-director/route.ts"), "utf8");
  const catchStart = route.indexOf('console.error("Creative Director route error:"');
  const directorError = route.indexOf(
    "if (error instanceof CreativeDirectorError)",
    catchStart,
  );
  const mapped500 = route.indexOf("500,", directorError);

  assert.ok(catchStart > 0);
  assert.ok(directorError > catchStart);
  assert.ok(mapped500 > directorError);
  assert.match(
    route.slice(directorError, mapped500 + 4),
    /return jsonError\(\s*mapCreationError\(error\.message\) \?\?[\s\S]*?500,/,
  );
});
