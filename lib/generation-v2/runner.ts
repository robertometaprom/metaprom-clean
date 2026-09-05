/**
 * Stage runner — image → video → persist.
 *
 * Workflow-shaped: each stage is a discrete unit that can be wrapped in
 * `"use step"` later. Stress harness runs this in-process (fake providers).
 */

import {
  GenerationProviderError,
  buildJobError,
  shouldRetry,
} from "./failures";
import type { GenerationProviders } from "./providers";
import { assertTransition } from "./state-machine";
import type { GenerationJobsStore } from "./store";
import type {
  GenerationFailureClass,
  GenerationJobRecord,
  GenerationJobStatus,
} from "./types";

export type RunnerDeps = {
  store: GenerationJobsStore;
  providers: GenerationProviders;
  /** Optional workflow run correlation id */
  workflowRunId?: string | null;
};

async function loadJob(
  store: GenerationJobsStore,
  id: string,
): Promise<GenerationJobRecord> {
  const job = await store.getById(id);
  if (!job) throw new Error(`generation_jobs not found: ${id}`);
  return job;
}

async function transition(
  store: GenerationJobsStore,
  job: GenerationJobRecord,
  to: GenerationJobStatus,
  patch: Parameters<GenerationJobsStore["update"]>[1] = {},
): Promise<GenerationJobRecord> {
  assertTransition(job.status, to);
  return store.update(job.id, { ...patch, status: to });
}

async function markFailed(
  store: GenerationJobsStore,
  job: GenerationJobRecord,
  input: {
    class: GenerationFailureClass;
    message: string;
    attempt: number;
    detail?: string | null;
  },
): Promise<GenerationJobRecord> {
  if (job.status === "failed" || job.status === "ready") {
    return job;
  }
  const error = buildJobError({
    class: input.class,
    message: input.message,
    attempt: input.attempt,
    atStatus: job.status,
    detail: input.detail,
  });
  assertTransition(job.status, "failed");
  return store.update(job.id, {
    status: "failed",
    error,
    failedAt: new Date().toISOString(),
  });
}

function asProviderError(err: unknown): {
  class: GenerationFailureClass;
  message: string;
  detail: string | null;
} {
  // Duck-type: Workflow step bundles can duplicate the Error class, breaking instanceof.
  if (
    err instanceof GenerationProviderError ||
    (typeof err === "object" &&
      err !== null &&
      "failureClass" in err &&
      typeof (err as { failureClass: unknown }).failureClass === "string")
  ) {
    const e = err as {
      failureClass: GenerationFailureClass;
      message: string;
      detail?: string | null;
    };
    return {
      class: e.failureClass,
      message: e.message,
      detail: e.detail ?? null,
    };
  }
  return {
    class: "internal",
    message: err instanceof Error ? err.message : "Unknown error",
    detail: null,
  };
}

async function runImageStage(
  deps: RunnerDeps,
  generationId: string,
): Promise<GenerationJobRecord> {
  let job = await loadJob(deps.store, generationId);

  if (job.status === "ready" || job.status === "failed") return job;
  if (
    job.status === "image_ready" ||
    job.status === "video_generating" ||
    job.status === "video_ready" ||
    job.status === "persisting"
  ) {
    return job;
  }

  if (job.status === "created") {
    job = await transition(deps.store, job, "image_generating", {
      workflowRunId: deps.workflowRunId ?? job.workflowRunId,
    });
  }

  while (job.status === "image_generating") {
    const attempt = job.attemptImage + 1;
    job = await deps.store.update(job.id, { attemptImage: attempt });

    try {
      const image = await deps.providers.enhanceImage({
        job,
        request: job.request,
      });
      job = await transition(deps.store, job, "image_ready", {
        artifacts: {
          enhancedImagePath: image.path,
          enhancedImageHash: image.hash,
        },
        error: null,
      });
      return job;
    } catch (err) {
      const parsed = asProviderError(err);
      if (shouldRetry({ class: parsed.class, attempt })) {
        continue;
      }
      return markFailed(deps.store, job, {
        class: parsed.class,
        message: parsed.message,
        attempt,
        detail: parsed.detail,
      });
    }
  }

  return job;
}

async function runVideoStage(
  deps: RunnerDeps,
  generationId: string,
): Promise<GenerationJobRecord> {
  let job = await loadJob(deps.store, generationId);

  if (job.status === "ready" || job.status === "failed") return job;
  if (job.status === "video_ready" || job.status === "persisting") return job;

  if (job.status === "image_ready") {
    job = await transition(deps.store, job, "video_generating");
  }

  if (job.status !== "video_generating") {
    return job;
  }

  const enhancedImagePath = job.artifacts.enhancedImagePath;
  if (!enhancedImagePath) {
    return markFailed(deps.store, job, {
      class: "persistence_inconsistency",
      message: "Missing enhanced image before video",
      attempt: job.attemptVideo,
    });
  }

  while (job.status === "video_generating") {
    const attempt = job.attemptVideo + 1;
    job = await deps.store.update(job.id, { attemptVideo: attempt });

    try {
      const video = await deps.providers.generateVideo({
        job,
        request: job.request,
        enhancedImagePath,
      });
      if (!video.bytes || video.bytes.byteLength === 0) {
        throw new GenerationProviderError("empty_video", "Empty video bytes");
      }
      job = await transition(deps.store, job, "video_ready", {
        artifacts: {
          teaserPath: video.path,
          teaserHash: video.hash,
        },
        error: null,
      });
      return job;
    } catch (err) {
      const parsed = asProviderError(err);
      if (shouldRetry({ class: parsed.class, attempt })) {
        continue;
      }
      return markFailed(deps.store, job, {
        class: parsed.class,
        message: parsed.message,
        attempt,
        detail: parsed.detail,
      });
    }
  }

  return job;
}

async function runPersistStage(
  deps: RunnerDeps,
  generationId: string,
): Promise<GenerationJobRecord> {
  let job = await loadJob(deps.store, generationId);

  if (job.status === "ready" || job.status === "failed") return job;

  if (job.status === "video_ready") {
    job = await transition(deps.store, job, "persisting");
  }

  if (job.status !== "persisting") {
    return job;
  }

  const enhancedImagePath = job.artifacts.enhancedImagePath;
  const enhancedImageHash = job.artifacts.enhancedImageHash;
  const teaserPath = job.artifacts.teaserPath;
  const teaserHash = job.artifacts.teaserHash;

  if (
    !enhancedImagePath ||
    !enhancedImageHash ||
    !teaserPath ||
    !teaserHash
  ) {
    return markFailed(deps.store, job, {
      class: "persistence_inconsistency",
      message: "Missing artifacts before persist",
      attempt: job.attemptPersist,
    });
  }

  while (job.status === "persisting") {
    const attempt = job.attemptPersist + 1;
    job = await deps.store.update(job.id, { attemptPersist: attempt });

    try {
      const persisted = await deps.providers.persist({
        job,
        request: job.request,
        enhancedImagePath,
        enhancedImageHash,
        teaserPath,
        teaserHash,
      });

      const isAuth = job.request.ownershipContext.kind === "authenticated";
      if (isAuth && !persisted.shareSlug) {
        throw new GenerationProviderError(
          "persistence_inconsistency",
          "Authenticated READY requires share_slug",
        );
      }
      if (!isAuth && persisted.shareSlug) {
        throw new GenerationProviderError(
          "persistence_inconsistency",
          "Anonymous READY requires share_slug null",
        );
      }
      if (!persisted.creativeRecipe) {
        throw new GenerationProviderError(
          "persistence_inconsistency",
          "READY requires CreativeRecipeV1",
        );
      }

      job = await transition(deps.store, job, "ready", {
        artifacts: {
          creativeRecipe: persisted.creativeRecipe,
          shareSlug: persisted.shareSlug,
          draftResumeToken: persisted.draftResumeToken,
          assetId: persisted.assetId,
          projectId: persisted.projectId,
        },
        error: null,
        readyAt: new Date().toISOString(),
      });
      return job;
    } catch (err) {
      const parsed = asProviderError(err);
      if (shouldRetry({ class: parsed.class, attempt })) {
        continue;
      }
      return markFailed(deps.store, job, {
        class: parsed.class,
        message: parsed.message,
        attempt,
        detail: parsed.detail,
      });
    }
  }

  return job;
}

/**
 * Full durable pipeline for one job. Idempotent on resume: skips completed stages.
 */
export async function runCommercialGeneration(
  generationId: string,
  deps: RunnerDeps,
): Promise<GenerationJobRecord> {
  let job = await loadJob(deps.store, generationId);

  if (deps.workflowRunId && !job.workflowRunId) {
    job = await deps.store.update(job.id, {
      workflowRunId: deps.workflowRunId,
    });
  }

  job = await runImageStage(deps, generationId);
  if (job.status === "failed") return job;

  job = await runVideoStage(deps, generationId);
  if (job.status === "failed") return job;

  job = await runPersistStage(deps, generationId);
  return job;
}

/** Step-shaped exports for Workflow SDK wrapping. */
export const generationWorkflowSteps = {
  runImageStage,
  runVideoStage,
  runPersistStage,
};
