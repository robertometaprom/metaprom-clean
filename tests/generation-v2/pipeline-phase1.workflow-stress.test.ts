/**
 * Generation Pipeline V2 — Workflow-path stress harness.
 * Uses @workflow/vitest Local World + start(). Does NOT use sync executor.
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { start } from "workflow/api";

import {
  createFakeProviders,
  createGenerationJob,
  createMemoryGenerationJobsStore,
  type FakeProviderScenario,
  type GenerationRequestV2,
  type OwnershipContext,
} from "../../lib/generation-v2/index.ts";
import {
  clearGenerationJobStore,
  commercialGenerationWorkflow,
  registerGenerationJobStore,
  registerGenerationProviders,
} from "../../workflows/commercial-generation.ts";

const WORKFLOW_START_BATCH = Number(
  process.env.GENERATION_V2_WORKFLOW_STRESS_BATCH ?? "20",
);

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

export type StressReport = {
  total: number;
  ready: number;
  failed: number;
  running: number;
  nonTerminal: number;
  duplicateLogicalJobs: number;
  duplicateArtifacts: number;
  averageCompletionTime: number;
  maxCompletionTime: number;
};

async function mapInBatches<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const slice = items.slice(i, i + batchSize);
    const part = await Promise.all(slice.map(fn));
    out.push(...part);
  }
  return out;
}

async function runWorkflowStress(count: number): Promise<StressReport> {
  const store = createMemoryGenerationJobsStore();
  const scenarioByJobId = new Map<string, FakeProviderScenario>();
  const ids: string[] = [];
  const elapsedById = new Map<string, number>();

  for (let i = 0; i < count; i++) {
    const ownership: OwnershipContext =
      i % 2 === 0
        ? { kind: "authenticated", userId: `user_${i}` }
        : { kind: "anonymous", sessionId: `sess_${i}` };

    let scenario: FakeProviderScenario = "success";
    if (i % 29 === 0 && i > 0) scenario = "video_empty";
    else if (i % 31 === 0 && i > 0) scenario = "image_fail_terminal";
    else if (i % 13 === 0 && i > 0) scenario = "video_fail_retryable";
    else if (i % 11 === 0 && i > 0) scenario = "db_fail";
    else if (i % 17 === 0 && i > 0) scenario = "image_fail_retryable";
    else if (i % 19 === 0 && i > 0) scenario = "storage_fail";

    const { job } = await createGenerationJob({
      store,
      request: baseRequest({
        idempotencyKey: `wf-stress-${count}-${i}`,
        ownershipContext: ownership,
      }),
    });
    ids.push(job.id);
    scenarioByJobId.set(job.id, scenario);
  }

  const providers = createFakeProviders({
    scenarioByJobId,
    failTimesBeforeSuccess: 1,
  });

  for (const id of ids) {
    registerGenerationJobStore(id, store);
    registerGenerationProviders(id, providers);
  }

  await mapInBatches(ids, WORKFLOW_START_BATCH, async (id) => {
    const t0 = Date.now();
    const run = await start(commercialGenerationWorkflow, [id]);
    await store.update(id, { workflowRunId: String(run.runId) });
    await run.returnValue;
    elapsedById.set(id, Date.now() - t0);
  });

  let ready = 0;
  let failed = 0;
  let running = 0;
  const pathOwners = new Map<string, string>();
  let duplicateArtifacts = 0;
  const logical = new Map<string, number>();

  for (const id of ids) {
    const job = await store.getById(id);
    assert.ok(job);
    const key = `${job.ownershipScope}::${job.idempotencyKey}`;
    logical.set(key, (logical.get(key) ?? 0) + 1);

    if (job.status === "ready") {
      ready += 1;
      for (const p of [
        job.artifacts.enhancedImagePath,
        job.artifacts.teaserPath,
      ]) {
        if (!p) continue;
        const prev = pathOwners.get(p);
        if (prev && prev !== id) duplicateArtifacts += 1;
        else pathOwners.set(p, id);
      }
    } else if (job.status === "failed") {
      failed += 1;
    } else {
      running += 1;
    }
  }

  let duplicateLogicalJobs = 0;
  for (const n of logical.values()) {
    if (n > 1) duplicateLogicalJobs += n - 1;
  }

  const times = [...elapsedById.values()];
  const averageCompletionTime =
    times.length === 0 ? 0 : times.reduce((a, b) => a + b, 0) / times.length;
  const maxCompletionTime = times.length === 0 ? 0 : Math.max(...times);
  const nonTerminal = (await store.listNonTerminal()).length;

  for (const id of ids) clearGenerationJobStore(id);

  return {
    total: count,
    ready,
    failed,
    running,
    nonTerminal,
    duplicateLogicalJobs,
    duplicateArtifacts,
    averageCompletionTime,
    maxCompletionTime,
  };
}

function assertStressGate(report: StressReport) {
  expect(report.total).toBe(report.ready + report.failed);
  expect(report.running).toBe(0);
  expect(report.nonTerminal).toBe(0);
  expect(report.duplicateLogicalJobs).toBe(0);
}

describe("workflow stress harness", () => {
  it("wfStress010", async () => {
    const report = await runWorkflowStress(10);
    console.log("WORKFLOW_STRESS_10", JSON.stringify(report));
    assertStressGate(report);
  });

  it("wfStress050", async () => {
    const report = await runWorkflowStress(50);
    console.log("WORKFLOW_STRESS_50", JSON.stringify(report));
    assertStressGate(report);
  });

  it("wfStress100", async () => {
    const report = await runWorkflowStress(100);
    console.log("WORKFLOW_STRESS_100", JSON.stringify(report));
    assertStressGate(report);
  });

  it(
    "wfStress500",
    async () => {
      const report = await runWorkflowStress(500);
      console.log("WORKFLOW_STRESS_500", JSON.stringify(report));
      assertStressGate(report);
    },
    900_000,
  );

  it(
    "wfStress1k",
    async () => {
      const report = await runWorkflowStress(1000);
      console.log("WORKFLOW_STRESS_1000", JSON.stringify(report));
      assertStressGate(report);
    },
    1_800_000,
  );
});
