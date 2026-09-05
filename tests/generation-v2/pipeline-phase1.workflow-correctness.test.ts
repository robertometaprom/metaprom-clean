/**
 * Generation Pipeline V2 — Workflow-path correctness (no stress).
 * Uses @workflow/vitest Local World + start(). Does NOT use sync executor.
 */

import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { start } from "workflow/api";

import {
  canTransition,
  createFakeProviders,
  createGenerationJob,
  createMemoryGenerationJobsStore,
  isTerminalStatus,
  resolveGenerationExecutorMode,
  toPublicView,
  type FakeProviderScenario,
  type GenerationJobsStore,
  type GenerationRequestV2,
  type OwnershipContext,
} from "../../lib/generation-v2/index.ts";
import {
  clearGenerationJobStore,
  commercialGenerationWorkflow,
  registerGenerationJobStore,
  registerGenerationProviders,
} from "../../workflows/commercial-generation.ts";

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

async function runViaWorkflow(input: {
  store: GenerationJobsStore;
  generationId: string;
  scenario?: FakeProviderScenario;
  failTimesBeforeSuccess?: number;
  delayMs?: number;
}): Promise<void> {
  const providers = createFakeProviders({
    scenario: input.scenario,
    failTimesBeforeSuccess: input.failTimesBeforeSuccess,
    delayMs: input.delayMs,
  });
  registerGenerationJobStore(input.generationId, input.store);
  registerGenerationProviders(input.generationId, providers);

  const run = await start(commercialGenerationWorkflow, [input.generationId]);
  await input.store.update(input.generationId, {
    workflowRunId: String(run.runId),
  });
  await run.returnValue;
}

describe("canonical executor", () => {
  it("defaults to workflow (sync only when explicitly requested)", () => {
    expect(resolveGenerationExecutorMode({})).toBe("workflow");
    expect(
      resolveGenerationExecutorMode({ GENERATION_V2_EXECUTOR: "sync" }),
    ).toBe("sync");
    expect(
      resolveGenerationExecutorMode({ GENERATION_V2_EXECUTOR: "workflow" }),
    ).toBe("workflow");
  });
});

describe("workflow path correctness", () => {
  it("success reaches READY", async () => {
    const store = createMemoryGenerationJobsStore();
    const { job } = await createGenerationJob({
      store,
      request: baseRequest(),
    });
    await runViaWorkflow({ store, generationId: job.id, scenario: "success" });
    const done = await store.getById(job.id);
    expect(done?.status).toBe("ready");
    expect(done?.artifacts.creativeRecipe).toBeTruthy();
    expect(done?.artifacts.shareSlug).toBeTruthy();
    expect(toPublicView(done!).rollup).toBe("READY");
    clearGenerationJobStore(job.id);
  });

  it("retryable image fail once reaches READY", async () => {
    const store = createMemoryGenerationJobsStore();
    const { job } = await createGenerationJob({
      store,
      request: baseRequest(),
    });
    await runViaWorkflow({
      store,
      generationId: job.id,
      scenario: "image_fail_retryable",
      failTimesBeforeSuccess: 1,
    });
    const done = await store.getById(job.id);
    expect(done?.status).toBe("ready");
    expect(done?.attemptImage).toBe(2);
    clearGenerationJobStore(job.id);
  });

  it("retryable video fail once reaches READY", async () => {
    const store = createMemoryGenerationJobsStore();
    const { job } = await createGenerationJob({
      store,
      request: baseRequest(),
    });
    await runViaWorkflow({
      store,
      generationId: job.id,
      scenario: "video_fail_retryable",
      failTimesBeforeSuccess: 1,
    });
    const done = await store.getById(job.id);
    expect(done?.status).toBe("ready");
    expect(done?.attemptVideo).toBe(2);
    clearGenerationJobStore(job.id);
  });

  it("terminal image failure reaches FAILED", async () => {
    const store = createMemoryGenerationJobsStore();
    const { job } = await createGenerationJob({
      store,
      request: baseRequest(),
    });
    await runViaWorkflow({
      store,
      generationId: job.id,
      scenario: "image_fail_terminal",
    });
    const done = await store.getById(job.id);
    expect(done?.status).toBe("failed");
    expect(done?.error?.class).toBe("malformed_provider_response");
    expect(isTerminalStatus(done!.status)).toBe(true);
    clearGenerationJobStore(job.id);
  });

  it("terminal video failure reaches FAILED", async () => {
    const store = createMemoryGenerationJobsStore();
    const { job } = await createGenerationJob({
      store,
      request: baseRequest(),
    });
    await runViaWorkflow({
      store,
      generationId: job.id,
      scenario: "video_empty",
    });
    const done = await store.getById(job.id);
    expect(done?.status).toBe("failed");
    expect(done?.error?.class).toBe("empty_video");
    clearGenerationJobStore(job.id);
  });

  it("storage retry reaches READY", async () => {
    const store = createMemoryGenerationJobsStore();
    const { job } = await createGenerationJob({
      store,
      request: baseRequest(),
    });
    await runViaWorkflow({
      store,
      generationId: job.id,
      scenario: "storage_fail",
      failTimesBeforeSuccess: 1,
    });
    const done = await store.getById(job.id);
    expect(done?.status).toBe("ready");
    expect(done?.attemptPersist).toBe(2);
    clearGenerationJobStore(job.id);
  });

  it("finalize retry reaches READY", async () => {
    const store = createMemoryGenerationJobsStore();
    const { job } = await createGenerationJob({
      store,
      request: baseRequest(),
    });
    await runViaWorkflow({
      store,
      generationId: job.id,
      scenario: "db_fail",
      failTimesBeforeSuccess: 1,
    });
    const done = await store.getById(job.id);
    expect(done?.status).toBe("ready");
    expect(done?.attemptPersist).toBe(2);
    clearGenerationJobStore(job.id);
  });

  it("timeout exhaustion reaches FAILED", async () => {
    const store = createMemoryGenerationJobsStore();
    const { job } = await createGenerationJob({
      store,
      request: baseRequest(),
    });
    await runViaWorkflow({
      store,
      generationId: job.id,
      scenario: "image_timeout",
      failTimesBeforeSuccess: 5,
    });
    const done = await store.getById(job.id);
    expect(done?.status).toBe("failed");
    expect(done?.error?.class).toBe("image_timeout");
    expect(done?.attemptImage).toBe(3);
    clearGenerationJobStore(job.id);
  });

  it("same owner and idempotency key yields same generationId", async () => {
    const store = createMemoryGenerationJobsStore();
    const request = baseRequest({ idempotencyKey: "wf-idem-1" });
    const a = await createGenerationJob({ store, request });
    const b = await createGenerationJob({ store, request });
    expect(a.created).toBe(true);
    expect(b.created).toBe(false);
    expect(a.job.id).toBe(b.job.id);
    expect(await store.count()).toBe(1);
  });

  it("duplicate create does not create duplicate logical execution", async () => {
    const store = createMemoryGenerationJobsStore();
    const request = baseRequest({ idempotencyKey: "wf-idem-dup" });
    const first = await createGenerationJob({ store, request });
    await runViaWorkflow({
      store,
      generationId: first.job.id,
      scenario: "success",
    });

    const second = await createGenerationJob({ store, request });
    expect(second.created).toBe(false);
    expect(second.job.id).toBe(first.job.id);
    expect(await store.count()).toBe(1);

    const after = await store.getById(first.job.id);
    expect(after?.status).toBe("ready");
    clearGenerationJobStore(first.job.id);
  });

  it("illegal state transitions rejected", () => {
    expect(canTransition("created", "ready")).toBe(false);
    expect(canTransition("ready", "failed")).toBe(false);
    expect(canTransition("failed", "created")).toBe(false);
    expect(canTransition("persisting", "ready")).toBe(true);
  });

  it("READY invariant enforced", async () => {
    const store = createMemoryGenerationJobsStore();
    const { job } = await createGenerationJob({
      store,
      request: baseRequest({
        ownershipContext: { kind: "authenticated", userId: "u_ready" },
      }),
    });
    await runViaWorkflow({ store, generationId: job.id, scenario: "success" });
    const done = await store.getById(job.id);
    expect(done?.status).toBe("ready");
    const view = toPublicView(done!);
    expect(view.rollup).toBe("READY");
    expect(view.result).toBeTruthy();
    expect(view.result?.shareSlug).toBeTruthy();
    expect(view.result?.creativeRecipe).toBeTruthy();
    clearGenerationJobStore(job.id);
  });
});

describe("workflow request independence", () => {
  it("start returns before terminal and workflow continues to READY", async () => {
    const store = createMemoryGenerationJobsStore();
    const { job } = await createGenerationJob({
      store,
      request: baseRequest(),
    });
    const providers = createFakeProviders({
      scenario: "success",
      delayMs: 40,
    });
    registerGenerationJobStore(job.id, store);
    registerGenerationProviders(job.id, providers);

    const run = await start(commercialGenerationWorkflow, [job.id]);
    expect(run.runId).toBeTruthy();

    const immediate = await store.getById(job.id);
    expect(isTerminalStatus(immediate!.status)).toBe(false);

    await run.returnValue;

    const terminal = await store.getById(job.id);
    expect(["ready", "failed"]).toContain(terminal!.status);
    expect(terminal!.status).toBe("ready");
    clearGenerationJobStore(job.id);
  });
});
