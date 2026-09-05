/**
 * Generation Pipeline V2 — Phase 1 unit + stress harness.
 * Fake providers only. Gate: NON-TERMINAL JOBS AFTER COMPLETION = 0.
 *
 * Run: npm run test:generation-v2
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import {
  canTransition,
  createFakeProviders,
  createGenerationJob,
  createMemoryGenerationJobsStore,
  isTerminalStatus,
  runCommercialGeneration,
  shouldRetry,
  toPublicView,
  validateGenerationRequestV2,
  type FakeProviderScenario,
  type GenerationRequestV2,
  type OwnershipContext,
} from "../../lib/generation-v2/index.ts";

function baseRequest(
  overrides: Partial<GenerationRequestV2> & {
    ownershipContext?: OwnershipContext;
    idempotencyKey?: string;
  } = {},
): GenerationRequestV2 {
  return {
    idempotencyKey: overrides.idempotencyKey ?? randomUUID(),
    sourceImageRef: "uploads/test/source.png",
    customerIntent: "Sell handmade ceramic mugs",
    visualGenerationIntent: {
      visualEvents: "Mug rotates on oak table under soft window light",
      spokenCopy: "Handmade ceramics for your morning ritual",
    },
    creationMode: "commercial",
    destination: { platform: "TikTok", aspectRatio: "9:16" },
    productMode: "social",
    ownershipContext: overrides.ownershipContext ?? {
      kind: "authenticated",
      userId: "user_test_1",
    },
    ...overrides,
  };
}

test("state machine allows only forward legal transitions", () => {
  assert.equal(canTransition("created", "image_generating"), true);
  assert.equal(canTransition("created", "ready"), false);
  assert.equal(canTransition("persisting", "ready"), true);
  assert.equal(canTransition("persisting", "failed"), true);
  assert.equal(canTransition("ready", "failed"), false);
  assert.equal(canTransition("failed", "created"), false);
});

test("validateGenerationRequestV2 rejects missing VGI", () => {
  assert.throws(
    () =>
      validateGenerationRequestV2({
        ...baseRequest(),
        visualGenerationIntent: null,
      }),
    /visualGenerationIntent/,
  );
});

test("idempotent create returns same generationId", async () => {
  const store = createMemoryGenerationJobsStore();
  const request = baseRequest({ idempotencyKey: "idem-1" });

  const a = await createGenerationJob({ store, request });
  const b = await createGenerationJob({ store, request });

  assert.equal(a.created, true);
  assert.equal(b.created, false);
  assert.equal(a.job.id, b.job.id);
  assert.equal(await store.count(), 1);
});

test("success path reaches READY with recipe + auth share_slug", async () => {
  const store = createMemoryGenerationJobsStore();
  const { job } = await createGenerationJob({
    store,
    request: baseRequest(),
  });

  const done = await runCommercialGeneration(job.id, {
    store,
    providers: createFakeProviders({ scenario: "success" }),
  });

  assert.equal(done.status, "ready");
  assert.ok(done.artifacts.creativeRecipe);
  assert.ok(done.artifacts.shareSlug);
  assert.equal(done.artifacts.draftResumeToken, null);

  const view = toPublicView(done);
  assert.equal(view.rollup, "READY");
  assert.ok(view.result);
  assert.equal(view.result?.shareSlug, done.artifacts.shareSlug);
});

test("anonymous READY keeps share_slug null + draft token", async () => {
  const store = createMemoryGenerationJobsStore();
  const { job } = await createGenerationJob({
    store,
    request: baseRequest({
      ownershipContext: { kind: "anonymous", sessionId: "anon_1" },
    }),
  });

  const done = await runCommercialGeneration(job.id, {
    store,
    providers: createFakeProviders({ scenario: "success" }),
  });

  assert.equal(done.status, "ready");
  assert.equal(done.artifacts.shareSlug, null);
  assert.ok(done.artifacts.draftResumeToken);
  assert.ok(done.artifacts.creativeRecipe);
});

test("retryable image failures recover then READY", async () => {
  const store = createMemoryGenerationJobsStore();
  const { job } = await createGenerationJob({
    store,
    request: baseRequest(),
  });

  const done = await runCommercialGeneration(job.id, {
    store,
    providers: createFakeProviders({
      scenario: "image_fail_retryable",
      failTimesBeforeSuccess: 2,
    }),
  });

  assert.equal(done.status, "ready");
  assert.equal(done.attemptImage, 3);
});

test("terminal image failure → FAILED (non-terminal = 0)", async () => {
  const store = createMemoryGenerationJobsStore();
  const { job } = await createGenerationJob({
    store,
    request: baseRequest(),
  });

  const done = await runCommercialGeneration(job.id, {
    store,
    providers: createFakeProviders({ scenario: "image_fail_terminal" }),
  });

  assert.equal(done.status, "failed");
  assert.equal(done.error?.class, "malformed_provider_response");
  assert.equal(isTerminalStatus(done.status), true);
});

test("empty video → FAILED", async () => {
  const store = createMemoryGenerationJobsStore();
  const { job } = await createGenerationJob({
    store,
    request: baseRequest(),
  });

  const done = await runCommercialGeneration(job.id, {
    store,
    providers: createFakeProviders({ scenario: "video_empty" }),
  });

  assert.equal(done.status, "failed");
  assert.equal(done.error?.class, "empty_video");
});

test("shouldRetry respects policy budgets", () => {
  assert.equal(shouldRetry({ class: "image_provider", attempt: 1 }), true);
  assert.equal(shouldRetry({ class: "image_provider", attempt: 3 }), false);
  assert.equal(
    shouldRetry({ class: "malformed_provider_response", attempt: 1 }),
    false,
  );
  assert.equal(shouldRetry({ class: "invalid_input", attempt: 1 }), false);
});

async function runStressBatch(input: {
  count: number;
  scenarioForIndex: (i: number) => FakeProviderScenario;
  ownership?: OwnershipContext;
}): Promise<{ ready: number; failed: number; nonTerminal: number }> {
  const store = createMemoryGenerationJobsStore();
  const scenarioByJobId = new Map<string, FakeProviderScenario>();
  const ids: string[] = [];

  for (let i = 0; i < input.count; i++) {
    const ownership: OwnershipContext =
      input.ownership ??
      (i % 2 === 0
        ? { kind: "authenticated", userId: `user_${i}` }
        : { kind: "anonymous", sessionId: `sess_${i}` });

    const { job } = await createGenerationJob({
      store,
      request: baseRequest({
        idempotencyKey: `stress-${input.count}-${i}`,
        ownershipContext: ownership,
      }),
    });
    ids.push(job.id);
    scenarioByJobId.set(job.id, input.scenarioForIndex(i));
  }

  const providers = createFakeProviders({
    scenarioByJobId,
    failTimesBeforeSuccess: 1,
  });

  await Promise.all(
    ids.map((id) => runCommercialGeneration(id, { store, providers })),
  );

  let ready = 0;
  let failed = 0;
  for (const id of ids) {
    const job = await store.getById(id);
    assert.ok(job);
    if (job.status === "ready") ready += 1;
    else if (job.status === "failed") failed += 1;
  }

  const nonTerminal = (await store.listNonTerminal()).length;
  return { ready, failed, nonTerminal };
}

test("stress 10 — mixed outcomes, 0 non-terminal", async () => {
  const scenarios: FakeProviderScenario[] = [
    "success",
    "success",
    "image_fail_retryable",
    "video_fail_retryable",
    "storage_fail",
    "image_fail_terminal",
    "video_empty",
    "db_fail",
    "success",
    "video_timeout",
  ];
  const result = await runStressBatch({
    count: 10,
    scenarioForIndex: (i) => scenarios[i]!,
  });
  assert.equal(result.nonTerminal, 0);
  assert.equal(result.ready + result.failed, 10);
  assert.ok(result.ready >= 1);
  assert.ok(result.failed >= 1);
});

test("stress 50 — 0 non-terminal", async () => {
  const result = await runStressBatch({
    count: 50,
    scenarioForIndex: (i) =>
      i % 7 === 0
        ? "image_fail_terminal"
        : i % 5 === 0
          ? "video_fail_retryable"
          : "success",
  });
  assert.equal(result.nonTerminal, 0);
  assert.equal(result.ready + result.failed, 50);
});

test("stress 100 — 0 non-terminal", async () => {
  const result = await runStressBatch({
    count: 100,
    scenarioForIndex: (i) => (i % 11 === 0 ? "video_empty" : "success"),
  });
  assert.equal(result.nonTerminal, 0);
  assert.equal(result.ready + result.failed, 100);
});

test(
  "stress 500 — 0 non-terminal",
  { timeout: 120_000 },
  async () => {
    const result = await runStressBatch({
      count: 500,
      scenarioForIndex: (i) => {
        if (i % 23 === 0) return "image_fail_terminal";
        if (i % 19 === 0) return "storage_fail";
        if (i % 17 === 0) return "image_fail_retryable";
        return "success";
      },
    });
    assert.equal(result.nonTerminal, 0);
    assert.equal(result.ready + result.failed, 500);
  },
);

test(
  "stress 1000 — gate: NON-TERMINAL = 0",
  { timeout: 180_000 },
  async () => {
    const result = await runStressBatch({
      count: 1000,
      scenarioForIndex: (i) => {
        if (i % 29 === 0) return "video_empty";
        if (i % 31 === 0) return "image_fail_terminal";
        if (i % 13 === 0) return "video_fail_retryable";
        if (i % 11 === 0) return "db_fail";
        return "success";
      },
    });
    assert.equal(result.nonTerminal, 0, "stress gate failed: non-terminal jobs remain");
    assert.equal(result.ready + result.failed, 1000);
  },
);
