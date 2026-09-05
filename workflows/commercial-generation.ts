/**
 * Vercel Workflow SDK adapter for Commercial Generation V2.
 *
 * Product truth remains in generation_jobs (Supabase / store).
 * This file only provides durable step scheduling via start() + "use step".
 *
 * On Vercel Preview/Production with GENERATION_V2_STORE=supabase, each step
 * loads the store and reconstructs fake providers from the job request
 * (Phase 1B controls). Process registries remain for Vitest Local World only.
 */

import { generationWorkflowSteps } from "../lib/generation-v2/runner";
import {
  assertFakeOnlyProviders,
} from "../lib/generation-v2/phase1b";
import {
  createFakeProviders,
  type GenerationProviders,
} from "../lib/generation-v2/providers/fake";
import type { GenerationJobsStore } from "../lib/generation-v2/store";
import { createMemoryGenerationJobsStore } from "../lib/generation-v2/store-memory";
import type { GenerationJobRecord } from "../lib/generation-v2/types";

type GenerationV2Globals = typeof globalThis & {
  __generationV2StoreRegistry?: Map<string, GenerationJobsStore>;
  __generationV2ProvidersRegistry?: Map<string, GenerationProviders>;
  __generationV2DefaultStore?: GenerationJobsStore | null;
};

function g(): GenerationV2Globals {
  return globalThis as GenerationV2Globals;
}

function storeRegistry(): Map<string, GenerationJobsStore> {
  const globals = g();
  if (!globals.__generationV2StoreRegistry) {
    globals.__generationV2StoreRegistry = new Map();
  }
  return globals.__generationV2StoreRegistry;
}

function providersRegistry(): Map<string, GenerationProviders> {
  const globals = g();
  if (!globals.__generationV2ProvidersRegistry) {
    globals.__generationV2ProvidersRegistry = new Map();
  }
  return globals.__generationV2ProvidersRegistry;
}

export function registerGenerationJobStore(
  generationId: string,
  store: GenerationJobsStore,
): void {
  storeRegistry().set(generationId, store);
  g().__generationV2DefaultStore = store;
}

export function registerGenerationProviders(
  generationId: string,
  providers: GenerationProviders,
): void {
  providersRegistry().set(generationId, providers);
}

export function clearGenerationJobStore(generationId: string): void {
  storeRegistry().delete(generationId);
  providersRegistry().delete(generationId);
}

function useSupabaseStore(): boolean {
  return process.env.GENERATION_V2_STORE?.trim().toLowerCase() === "supabase";
}

function resolveStore(generationId: string): GenerationJobsStore {
  if (useSupabaseStore()) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createSupabaseGenerationJobsStore } = require("../lib/generation-v2/store-supabase");
    return createSupabaseGenerationJobsStore();
  }

  const store =
    storeRegistry().get(generationId) ?? g().__generationV2DefaultStore;
  if (!store) {
    const mem = createMemoryGenerationJobsStore();
    g().__generationV2DefaultStore = mem;
    return mem;
  }
  return store;
}

function providersFromJob(job: GenerationJobRecord): GenerationProviders {
  assertFakeOnlyProviders();
  // Scenario / fail budget / delay are read from job.request by fake providers.
  return createFakeProviders();
}

function resolveProviders(
  generationId: string,
  job: GenerationJobRecord | null,
): GenerationProviders {
  const registered = providersRegistry().get(generationId);
  if (registered) return registered;
  if (job) return providersFromJob(job);
  assertFakeOnlyProviders();
  return createFakeProviders();
}

async function imageStep(generationId: string): Promise<void> {
  "use step";
  const store = resolveStore(generationId);
  const job = await store.getById(generationId);
  const providers = resolveProviders(generationId, job);
  await generationWorkflowSteps.runImageStage(
    { store, providers, workflowRunId: null },
    generationId,
  );
}

async function videoStep(generationId: string): Promise<void> {
  "use step";
  const store = resolveStore(generationId);
  const job = await store.getById(generationId);
  const providers = resolveProviders(generationId, job);
  await generationWorkflowSteps.runVideoStage(
    { store, providers, workflowRunId: null },
    generationId,
  );
}

async function persistStep(generationId: string): Promise<void> {
  "use step";
  const store = resolveStore(generationId);
  const job = await store.getById(generationId);
  const providers = resolveProviders(generationId, job);
  await generationWorkflowSteps.runPersistStage(
    { store, providers, workflowRunId: null },
    generationId,
  );
}

/**
 * Durable workflow orchestrator.
 * `"use workflow"` is recognized by the Workflow SDK compiler when configured.
 */
export async function commercialGenerationWorkflow(
  generationId: string,
): Promise<{ generationId: string }> {
  "use workflow";

  await imageStep(generationId);
  await videoStep(generationId);
  await persistStep(generationId);

  return { generationId };
}

/**
 * Enqueue via Workflow SDK `start()`. Returns immediately with a run id.
 * Does not fall back to sync execution — Workflow is the canonical path.
 */
export async function startCommercialGenerationWorkflow(
  generationId: string,
): Promise<string> {
  const { start } = await import("workflow/api");
  const run = await start(commercialGenerationWorkflow, [generationId]);
  return String(
    (run as { runId?: string; id?: string }).runId ??
      (run as { runId?: string; id?: string }).id ??
      `workflow:${generationId}`,
  );
}
