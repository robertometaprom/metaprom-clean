/**
 * Phase 1 provider ports + deterministic fake implementations.
 */

import { createHash, randomUUID } from "node:crypto";

import { GenerationProviderError } from "../failures";
import { readPhase1bControls } from "../phase1b";
import type {
  GenerationFailureClass,
  GenerationJobRecord,
  GenerationRequestV2,
} from "../types";
import type { CreativeRecipeV1 } from "../../creative-recipe";
import {
  CANONICAL_LOGO_SOURCE,
  CREATIVE_RECIPE_SCHEMA_VERSION,
  PROMPT_BUILDER_VERSION,
  VIDEO_PROCESSING_VERSION,
} from "../../creative-recipe";

export type ImageProviderResult = {
  path: string;
  hash: string;
  bytes: Uint8Array;
};

export type VideoProviderResult = {
  path: string;
  hash: string;
  bytes: Uint8Array;
};

export type PersistProviderResult = {
  creativeRecipe: CreativeRecipeV1;
  shareSlug: string | null;
  draftResumeToken: string | null;
  assetId: number | null;
  projectId: number | null;
};

export type GenerationProviders = {
  enhanceImage(input: {
    job: GenerationJobRecord;
    request: GenerationRequestV2;
  }): Promise<ImageProviderResult>;
  generateVideo(input: {
    job: GenerationJobRecord;
    request: GenerationRequestV2;
    enhancedImagePath: string;
  }): Promise<VideoProviderResult>;
  persist(input: {
    job: GenerationJobRecord;
    request: GenerationRequestV2;
    enhancedImagePath: string;
    enhancedImageHash: string;
    teaserPath: string;
    teaserHash: string;
  }): Promise<PersistProviderResult>;
};

export type FakeProviderScenario =
  | "success"
  | "image_fail_retryable"
  | "image_fail_terminal"
  | "image_timeout"
  | "video_fail_retryable"
  | "video_fail_terminal"
  | "video_timeout"
  | "video_malformed"
  | "video_empty"
  | "storage_fail"
  | "db_fail"
  | "persist_inconsistency";

export type FakeProviderOptions = {
  /** Global default; per-job override via job.request metadata not used — use map. */
  scenario?: FakeProviderScenario;
  /** jobId → scenario for mixed stress runs */
  scenarioByJobId?: Map<string, FakeProviderScenario>;
  /** Succeed after N failures for retryable scenarios (default: maxAttempts-1). */
  failTimesBeforeSuccess?: number;
  delayMs?: number;
};

function hashBytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function tinyPng(): Uint8Array {
  // 1x1 PNG
  return Uint8Array.from(
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    ),
  );
}

function tinyMp4(): Uint8Array {
  // Minimal non-empty placeholder bytes (not a real MP4; Phase 1 fake only)
  return new TextEncoder().encode("ftypisomfake-mp4-v2");
}

function resolveScenario(
  job: GenerationJobRecord,
  options: FakeProviderOptions,
): FakeProviderScenario {
  return (
    options.scenarioByJobId?.get(job.id) ??
    options.scenario ??
    readPhase1bControls(job.request)?.scenario ??
    "success"
  );
}

function resolveFailBudget(
  job: GenerationJobRecord,
  options: FakeProviderOptions,
): number {
  if (typeof options.failTimesBeforeSuccess === "number") {
    return options.failTimesBeforeSuccess;
  }
  const fromJob = readPhase1bControls(job.request)?.failTimesBeforeSuccess;
  if (typeof fromJob === "number") return fromJob;
  // default: fail twice then succeed on 3rd → within maxAttempts=3
  return 2;
}

function resolveDelayMs(
  job: GenerationJobRecord,
  options: FakeProviderOptions,
): number {
  if (typeof options.delayMs === "number" && options.delayMs > 0) {
    return options.delayMs;
  }
  return readPhase1bControls(job.request)?.delayMs ?? 0;
}

/**
 * Prefer durable job attempt counters (survive Workflow isolate boundaries).
 * Fall back to process-local failCounts for in-process unit tests that do not
 * bump attempt fields before provider calls.
 */
function resolveAttempt(
  job: GenerationJobRecord,
  stage: "image" | "video" | "persist",
  localCount: number,
): number {
  const fromJob =
    stage === "image"
      ? job.attemptImage
      : stage === "video"
        ? job.attemptVideo
        : job.attemptPersist;
  if (fromJob > 0) return fromJob;
  return localCount;
}

function buildFrozenRecipe(input: {
  request: GenerationRequestV2;
  enhancedImagePath: string;
  teaserPath: string;
}): CreativeRecipeV1 {
  const frozenAt = new Date().toISOString();
  const vgi = input.request.visualGenerationIntent;
  const teaserPrompt = [
    vgi.visualEvents,
    vgi.spokenCopy?.trim() ? `Spoken: ${vgi.spokenCopy.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    schema_version: CREATIVE_RECIPE_SCHEMA_VERSION,
    frozen_at: frozenAt,
    reference_image_path: input.enhancedImagePath,
    customer_intention: input.request.customerIntent,
    teaser_prompt: teaserPrompt,
    premium_prompt: teaserPrompt,
    destination: input.request.destination,
    aspect_ratio: input.request.destination.aspectRatio,
    preview_duration_seconds: 4,
    premium_target_duration_seconds: 8,
    workflow_id: input.request.workflowId ?? null,
    generation: {
      image: { provider: "fake", model: "fake-enhance-v1" },
      preview_video: {
        provider: "fake",
        model: "fake-veo-v1",
        workflow: "preview",
      },
      premium_video: {
        provider: "fake",
        model: "fake-veo-v1",
        workflow: "premium",
      },
    },
    prompt_builder_version: PROMPT_BUILDER_VERSION,
    video_processing_version: VIDEO_PROCESSING_VERSION,
    preview_path: input.teaserPath,
    promotional_overlays: null,
    production_profile: null,
    required_narrative_beats: null,
    overlay_style: null,
    exact_logo_source: CANONICAL_LOGO_SOURCE,
    metaprom_watermark_source: CANONICAL_LOGO_SOURCE,
    premium_processing_manifest: null,
  };
}

export function createFakeProviders(
  options: FakeProviderOptions = {},
): GenerationProviders {
  const failCounts = new Map<string, number>();

  async function maybeDelay(job: GenerationJobRecord) {
    const delayMs = resolveDelayMs(job, options);
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  function bumpFail(key: string): number {
    const n = (failCounts.get(key) ?? 0) + 1;
    failCounts.set(key, n);
    return n;
  }

  function throwClass(
    cls: GenerationFailureClass,
    message: string,
    detail?: string,
  ): never {
    throw new GenerationProviderError(cls, message, detail ?? null);
  }

  return {
    async enhanceImage({ job, request }) {
      await maybeDelay(job);
      const scenario = resolveScenario(job, options);
      const failBudget = resolveFailBudget(job, options);
      const key = `${job.id}:image`;
      const attempt = resolveAttempt(job, "image", bumpFail(key));

      switch (scenario) {
        case "image_fail_terminal":
          throwClass("malformed_provider_response", "Image provider malformed");
        case "image_timeout": {
          if (attempt <= failBudget) throwClass("image_timeout", "Image timed out");
          break;
        }
        case "image_fail_retryable": {
          if (attempt <= failBudget) {
            throwClass("image_provider", "Transient image failure");
          }
          break;
        }
        default:
          break;
      }

      void request;
      const bytes = tinyPng();
      const hash = hashBytes(bytes);
      return {
        path: `v2/${job.id}/enhanced/${hash}.png`,
        hash,
        bytes,
      };
    },

    async generateVideo({ job, request, enhancedImagePath }) {
      await maybeDelay(job);
      const scenario = resolveScenario(job, options);
      const failBudget = resolveFailBudget(job, options);
      const key = `${job.id}:video`;
      const attempt = resolveAttempt(job, "video", bumpFail(key));

      switch (scenario) {
        case "video_fail_terminal":
          throwClass("video_provider", "Video provider hard fail");
        case "video_malformed":
          throwClass(
            "malformed_provider_response",
            "Malformed video response",
          );
        case "video_empty":
          throwClass("empty_video", "Empty video bytes");
        case "video_timeout": {
          if (attempt <= failBudget) throwClass("video_timeout", "Video timed out");
          break;
        }
        case "video_fail_retryable": {
          if (attempt <= failBudget) {
            throwClass("video_provider", "Transient video failure");
          }
          break;
        }
        default:
          break;
      }

      void enhancedImagePath;
      void request;
      const bytes = tinyMp4();
      if (bytes.byteLength === 0) {
        throwClass("empty_video", "Empty video bytes");
      }
      const hash = hashBytes(bytes);
      return {
        path: `v2/${job.id}/teaser/${hash}.mp4`,
        hash,
        bytes,
      };
    },

    async persist({
      job,
      request,
      enhancedImagePath,
      enhancedImageHash,
      teaserPath,
      teaserHash,
    }) {
      await maybeDelay(job);
      const scenario = resolveScenario(job, options);
      const failBudget = resolveFailBudget(job, options);
      const key = `${job.id}:persist`;
      const attempt = resolveAttempt(job, "persist", bumpFail(key));

      switch (scenario) {
        case "storage_fail": {
          if (attempt <= failBudget) throwClass("storage", "Storage write failed");
          break;
        }
        case "db_fail": {
          if (attempt <= failBudget) throwClass("db", "DB write failed");
          break;
        }
        case "persist_inconsistency": {
          if (attempt <= failBudget) {
            throwClass(
              "persistence_inconsistency",
              "Partial persist detected",
            );
          }
          break;
        }
        default:
          break;
      }

      void enhancedImageHash;
      void teaserHash;

      const recipe = buildFrozenRecipe({
        request,
        enhancedImagePath,
        teaserPath,
      });

      const isAuth = request.ownershipContext.kind === "authenticated";
      const shareSlug = isAuth
        ? `g${job.id.replace(/-/g, "").slice(0, 12)}`
        : null;
      const draftResumeToken = isAuth ? null : `draft_${randomUUID()}`;

      return {
        creativeRecipe: recipe,
        shareSlug,
        draftResumeToken,
        assetId: isAuth ? 1 : null,
        projectId: isAuth ? 1 : null,
      };
    },
  };
}
