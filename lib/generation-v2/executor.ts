/**
 * Durable execution entrypoints.
 *
 * Canonical path (when Generation V2 is enabled): Workflow via
 * `start(commercialGenerationWorkflow, ...)`.
 *
 * Sync executor remains an explicit local/unit-test helper only
 * (`GENERATION_V2_EXECUTOR=sync`). It must not be the production default.
 */

import { runCommercialGeneration, type RunnerDeps } from "./runner";
import type { GenerationJobRecord } from "./types";

export type GenerationExecutorMode = "sync" | "workflow";

export function resolveGenerationExecutorMode(
  env: NodeJS.ProcessEnv = process.env,
): GenerationExecutorMode {
  const raw = env.GENERATION_V2_EXECUTOR?.trim().toLowerCase();
  // Opt-in sync for unit tests / local helpers only.
  if (raw === "sync") return "sync";
  return "workflow";
}

/**
 * Start durable execution for an existing generation_jobs row.
 * Workflow mode enqueues and returns immediately (canonical path).
 * Sync mode awaits completion (explicit test helper only).
 */
export async function startGenerationExecution(input: {
  generationId: string;
  deps: RunnerDeps;
  mode?: GenerationExecutorMode;
}): Promise<
  | { mode: "sync"; job: GenerationJobRecord }
  | { mode: "workflow"; runId: string }
> {
  const mode = input.mode ?? resolveGenerationExecutorMode();

  if (mode === "workflow") {
    const {
      startCommercialGenerationWorkflow,
      registerGenerationJobStore,
      registerGenerationProviders,
    } = await import("../../workflows/commercial-generation");
    registerGenerationJobStore(input.generationId, input.deps.store);
    registerGenerationProviders(input.generationId, input.deps.providers);
    const runId = await startCommercialGenerationWorkflow(input.generationId);
    await input.deps.store.update(input.generationId, {
      workflowRunId: runId,
    });
    return { mode: "workflow", runId };
  }

  const job = await runCommercialGeneration(input.generationId, {
    ...input.deps,
    workflowRunId: input.deps.workflowRunId ?? `sync:${input.generationId}`,
  });
  return { mode: "sync", job };
}
