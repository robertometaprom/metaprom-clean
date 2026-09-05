/**
 * Generation Pipeline V2 — public surface (Phase 1).
 */

export type {
  GenerationJobStatus,
  GenerationJobRollup,
  GenerationRequestV2,
  GenerationResultV2,
  GenerationJobRecord,
  GenerationJobPublicView,
  GenerationJobError,
  OwnershipContext,
} from "./types";

export {
  GENERATION_V2_CREATION_MODE,
  ownershipScopeOf,
  rollupOf,
  emptyArtifacts,
} from "./types";

export {
  canTransition,
  assertTransition,
  isTerminalStatus,
  nextStageAfterSuccess,
  GENERATION_JOB_STATUSES,
} from "./state-machine";

export {
  failurePolicy,
  shouldRetry,
  buildJobError,
  GenerationProviderError,
} from "./failures";

export { validateGenerationRequestV2 } from "./validate";
export { createGenerationJob, toPublicView, toGenerationResultV2 } from "./create";
export { createMemoryGenerationJobsStore } from "./store-memory";
export type { GenerationJobsStore } from "./store";
export { createFakeProviders } from "./providers";
export type { FakeProviderScenario, FakeProviderOptions } from "./providers";
export { runCommercialGeneration, generationWorkflowSteps } from "./runner";
export {
  startGenerationExecution,
  resolveGenerationExecutorMode,
} from "./executor";
export {
  isPhase1bEnabled,
  parsePhase1bControls,
  readPhase1bControls,
  attachPhase1bControls,
  assertFakeOnlyProviders,
  PHASE1B_PROFILE_KEY,
} from "./phase1b";
export type { Phase1bTestControls } from "./phase1b";
