/**
 * Generation Pipeline V2 — product contracts (Phase 1).
 * Parallel to legacy; Studio is not wired yet.
 */

import type { Mode } from "../prompts";
import type { StudioDestination } from "../studio-destination";
import type { CreativeRecipeV1 } from "../creative-recipe";

export const GENERATION_V2_CREATION_MODE = "commercial" as const;

/** Canonical durable stages (Architecture Freeze §8). */
export type GenerationJobStatus =
  | "created"
  | "image_generating"
  | "image_ready"
  | "video_generating"
  | "video_ready"
  | "persisting"
  | "ready"
  | "failed";

export type GenerationJobRollup = "RUNNING" | "READY" | "FAILED";

export type GenerationFailureClass =
  | "invalid_input"
  | "image_provider"
  | "image_timeout"
  | "video_provider"
  | "video_timeout"
  | "malformed_provider_response"
  | "empty_video"
  | "storage"
  | "db"
  | "persistence_inconsistency"
  | "internal";

export type GenerationFailureRetryability = "retryable" | "non_retryable";

export type OwnershipContext =
  | { kind: "authenticated"; userId: string }
  | { kind: "anonymous"; sessionId: string };

export type VisualGenerationIntentV2 = {
  visualEvents: string;
  spokenCopy?: string | null;
};

export type GenerationRequestV2 = {
  idempotencyKey: string;
  sourceImageRef: string;
  customerIntent: string;
  visualGenerationIntent: VisualGenerationIntentV2;
  creationMode: typeof GENERATION_V2_CREATION_MODE;
  destination: StudioDestination;
  productMode: Mode;
  ownershipContext: OwnershipContext;
  productionProfile?: Record<string, unknown> | null;
  promotionalOverlays?: Record<string, unknown> | null;
  overlayStyle?: string | null;
  requiredNarrativeBeats?: string[] | null;
  workflowId?: string | null;
  industry?: string | null;
};

export type GenerationJobError = {
  class: GenerationFailureClass;
  retryability: GenerationFailureRetryability;
  message: string;
  userMessage: string;
  attempt: number;
  atStatus: GenerationJobStatus;
  detail?: string | null;
};

export type GenerationJobArtifacts = {
  enhancedImagePath: string | null;
  enhancedImageHash: string | null;
  teaserPath: string | null;
  teaserHash: string | null;
  creativeRecipe: CreativeRecipeV1 | null;
  shareSlug: string | null;
  draftResumeToken: string | null;
  assetId: number | null;
  projectId: number | null;
};

export type GenerationJobRecord = {
  id: string;
  ownershipScope: string;
  idempotencyKey: string;
  status: GenerationJobStatus;
  attemptImage: number;
  attemptVideo: number;
  attemptPersist: number;
  request: GenerationRequestV2;
  artifacts: GenerationJobArtifacts;
  error: GenerationJobError | null;
  workflowRunId: string | null;
  createdAt: string;
  updatedAt: string;
  readyAt: string | null;
  failedAt: string | null;
};

export type GenerationResultV2 = {
  generationId: string;
  status: "ready";
  ownershipScope: string;
  assetId: number | null;
  projectId: number | null;
  draftResumeToken: string | null;
  originalPath: string;
  enhancedImagePath: string;
  teaserPath: string;
  creativeRecipe: CreativeRecipeV1;
  shareSlug: string | null;
  workflowRunId: string | null;
  createdAt: string;
  readyAt: string;
};

export type GenerationJobPublicView = {
  generationId: string;
  status: GenerationJobStatus;
  rollup: GenerationJobRollup;
  currentStage: GenerationJobStatus;
  error: GenerationJobError | null;
  result: GenerationResultV2 | null;
  workflowRunId: string | null;
  createdAt: string;
  updatedAt: string;
};

export function ownershipScopeOf(ctx: OwnershipContext): string {
  return ctx.kind === "authenticated"
    ? `authenticated:${ctx.userId}`
    : `anonymous:${ctx.sessionId}`;
}

export function rollupOf(status: GenerationJobStatus): GenerationJobRollup {
  if (status === "ready") return "READY";
  if (status === "failed") return "FAILED";
  return "RUNNING";
}

export function emptyArtifacts(): GenerationJobArtifacts {
  return {
    enhancedImagePath: null,
    enhancedImageHash: null,
    teaserPath: null,
    teaserHash: null,
    creativeRecipe: null,
    shareSlug: null,
    draftResumeToken: null,
    assetId: null,
    projectId: null,
  };
}
