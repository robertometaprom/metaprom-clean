/**
 * Idempotent job create + public view helpers.
 */

import { randomUUID } from "node:crypto";

import type { GenerationJobsStore } from "./store";
import {
  ownershipScopeOf,
  rollupOf,
  type GenerationJobPublicView,
  type GenerationJobRecord,
  type GenerationRequestV2,
  type GenerationResultV2,
} from "./types";

export type CreateGenerationJobResult = {
  job: GenerationJobRecord;
  created: boolean;
};

export async function createGenerationJob(input: {
  store: GenerationJobsStore;
  request: GenerationRequestV2;
  id?: string;
}): Promise<CreateGenerationJobResult> {
  const ownershipScope = ownershipScopeOf(input.request.ownershipContext);
  const inserted = await input.store.insert({
    id: input.id ?? randomUUID(),
    ownershipScope,
    idempotencyKey: input.request.idempotencyKey,
    request: input.request,
  });

  return {
    job: inserted.job,
    created: inserted.kind === "created",
  };
}

export function toGenerationResultV2(
  job: GenerationJobRecord,
): GenerationResultV2 | null {
  if (job.status !== "ready") return null;
  const { artifacts, request } = job;
  if (
    !artifacts.enhancedImagePath ||
    !artifacts.teaserPath ||
    !artifacts.creativeRecipe ||
    !job.readyAt
  ) {
    return null;
  }

  const isAuth = request.ownershipContext.kind === "authenticated";
  if (isAuth && !artifacts.shareSlug) return null;
  if (!isAuth && artifacts.shareSlug) return null;
  if (!isAuth && !artifacts.draftResumeToken) return null;

  return {
    generationId: job.id,
    status: "ready",
    ownershipScope: job.ownershipScope,
    assetId: artifacts.assetId,
    projectId: artifacts.projectId,
    draftResumeToken: artifacts.draftResumeToken,
    originalPath: request.sourceImageRef,
    enhancedImagePath: artifacts.enhancedImagePath,
    teaserPath: artifacts.teaserPath,
    creativeRecipe: artifacts.creativeRecipe,
    shareSlug: artifacts.shareSlug,
    workflowRunId: job.workflowRunId,
    createdAt: job.createdAt,
    readyAt: job.readyAt,
  };
}

export function toPublicView(job: GenerationJobRecord): GenerationJobPublicView {
  return {
    generationId: job.id,
    status: job.status,
    rollup: rollupOf(job.status),
    currentStage: job.status,
    error: job.error,
    result: toGenerationResultV2(job),
    workflowRunId: job.workflowRunId,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}
