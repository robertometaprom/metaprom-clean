import {
  BibliotecaAuthError,
  buildAutoProjectName,
  createBibliotecaMutationContext,
  createBibliotecaProject,
  fetchBibliotecaAssetById,
  saveBibliotecaAssets,
  updateBibliotecaAsset,
  updateBibliotecaProject,
  type BibliotecaAsset,
  type BibliotecaMutationContext,
  type PersistStudioAssetInput,
  type StudioProjectMetadata,
} from "@/lib/biblioteca";
import {
  dataUrlToBlob,
  inferExtensionFromMime,
  uploadLibraryObject,
} from "@/lib/library-storage";
import { generateShareSlug, isShareSlugUniqueViolation } from "@/lib/preview/share-slug";
import {
  CANONICAL_LOGO_SOURCE,
  PROMPT_BUILDER_VERSION,
  VIDEO_PROCESSING_VERSION,
  buildCreativeRecipeV1,
} from "@/lib/creative-recipe";
import { buildStudioVideoPrompt } from "@/lib/studio-prompts";
import { resolveVeoGenerationParams } from "@/lib/destination-generation";
import { resolvePremiumVeoDurationSeconds } from "@/lib/video/veo-config";
import { parseRequiredNarrativeBeats, type RequiredNarrativeBeats } from "@/lib/narrative-beats-contract";
import type {
  CommercialProductionProfile,
  PromotionalOverlays,
} from "@/lib/commercial-production-profile";
import { parseCommercialProductionProfile } from "@/lib/commercial-production-profile";
import { parsePromotionalOverlays, requiresMetapromWatermark } from "@/lib/promotional-overlay-contract";
import { parseOverlayStyle, type OverlayStyle } from "@/lib/overlay-style-contract";
import {
  approximateSerializedBytes,
  FINAL_ASSET_UPDATE_TIMEOUT_MS,
  omitAlreadyPersistedImageUrl,
  retryFinalAssetUpdate,
  truncatePersistenceDiagnosticText,
} from "@/lib/studio-persistence-retry";

export type PersistStudioCreationInput = {
  userId: string;
  originalFile: File;
  enhancedDataUrl: string;
  teaserVideoBlob?: Blob;
  imagePrompt: string;
  videoPrompt: string;
  customerIntent: string;
  visualGenerationIntent?: string;
  promotionalOverlays?: PromotionalOverlays | null;
  productionProfile?: CommercialProductionProfile | null;
  requiredNarrativeBeats?: RequiredNarrativeBeats | null;
  overlayStyle?: OverlayStyle | null;
  mode: PersistStudioAssetInput["mode"];
  projectMetadata: StudioProjectMetadata;
  existingProjectId?: string | null;
  existingAssetId?: string | null;
  onStage?: (stage: string, details?: Record<string, unknown>) => void;
  generationMetadata?: {
    imageProvider: string;
    imageModel: string;
    videoProvider: string;
    previewVideoModel: string;
    premiumVideoModel: string;
  };
};

export type PersistStudioCreationResult = {
  projectId: string;
  assetId: string;
  asset: BibliotecaAsset;
};

export type StudioPersistenceRecovery = {
  userId: string;
  projectId: string | null;
  assetId: string | null;
  updates: Partial<BibliotecaAsset>;
  existingShareSlug: string | null;
  uploadedPaths: {
    original: string | null;
    enhanced: string | null;
    teaser: string | null;
  };
  input: PersistStudioCreationInput;
  error: Record<string, unknown> | null;
};

export class StudioPersistenceError extends Error {
  readonly recovery: StudioPersistenceRecovery;
  readonly cause: unknown;

  constructor(recovery: StudioPersistenceRecovery, cause: unknown) {
    super("No pudimos terminar de guardar tu comercial. Intenta guardar de nuevo.");
    this.name = "StudioPersistenceError";
    recovery.error = safePersistenceError(cause);
    this.recovery = recovery;
    this.cause = cause;
  }
}

function safePersistenceError(error: unknown): Record<string, unknown> {
  if (!error || typeof error !== "object") {
    return { message: truncatePersistenceDiagnosticText(String(error)) };
  }
  const candidate = error as {
    name?: unknown; code?: unknown; message?: unknown; details?: unknown;
    hint?: unknown; status?: unknown;
  };
  return Object.fromEntries(
    Object.entries({
      name: candidate.name,
      code: candidate.code,
      message: truncatePersistenceDiagnosticText(candidate.message),
      details: truncatePersistenceDiagnosticText(candidate.details),
      hint: truncatePersistenceDiagnosticText(candidate.hint),
      status: candidate.status,
    }).filter(([, value]) =>
      typeof value === "string" || typeof value === "number"
    ),
  );
}

function resolveShareSlug(
  existingShareSlug?: string | null,
): string {
  if (existingShareSlug) {
    return existingShareSlug;
  }

  return generateShareSlug();
}

function isSchemaColumnMissingError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const { code, message } = error as { code?: string; message?: string };
  return (
    code === "42703" ||
    code === "PGRST204" ||
    (typeof message === "string" &&
      (message.includes("does not exist") ||
        (message.includes("Could not find the") &&
          message.includes("column"))))
  );
}

function withoutShareFields(
  updates: Partial<BibliotecaAsset>,
): Partial<BibliotecaAsset> {
  const { share_slug: _shareSlug, visibility: _visibility, ...rest } = updates;
  return rest;
}

async function updateAssetWithShareSlugRetry(
  assetId: string,
  updates: Partial<BibliotecaAsset>,
  existingShareSlug?: string | null,
  onStage?: PersistStudioCreationInput["onStage"],
  context?: BibliotecaMutationContext,
  signal?: AbortSignal,
  onShareSlugChanged?: (shareSlug: string) => void,
): Promise<BibliotecaAsset> {
  if (existingShareSlug || !updates.share_slug) {
    try {
      return await updateBibliotecaAsset(assetId, updates, context, signal);
    } catch (error) {
      if (!isSchemaColumnMissingError(error) || !updates.share_slug) {
        throw error;
      }

      onStage?.("asset update:share fields unavailable, continuing", {
        assetId,
      });
      return updateBibliotecaAsset(assetId, withoutShareFields(updates), context, signal);
    }
  }

  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      return await updateBibliotecaAsset(assetId, updates, context, signal);
    } catch (error) {
      if (isSchemaColumnMissingError(error)) {
        onStage?.("asset update:share fields unavailable, continuing", {
          assetId,
        });
        return updateBibliotecaAsset(assetId, withoutShareFields(updates), context, signal);
      }

      if (!isShareSlugUniqueViolation(error)) {
        throw error;
      }

      const replacementShareSlug = generateShareSlug();
      updates = {
        ...updates,
        share_slug: replacementShareSlug,
      };
      onShareSlugChanged?.(replacementShareSlug);
    }
  }

  throw new Error("Unable to assign a unique share slug.");
}

async function finalizeStudioAsset(
  recovery: StudioPersistenceRecovery,
  onStage?: PersistStudioCreationInput["onStage"],
  context?: BibliotecaMutationContext,
): Promise<BibliotecaAsset> {
  if (!recovery.projectId || !recovery.assetId) {
    throw new StudioPersistenceError(
      recovery,
      new Error("Persistence recovery is missing project or asset identity."),
    );
  }
  const assetId = recovery.assetId;
  const payloadBytes = approximateSerializedBytes(recovery.updates);

  try {
    onStage?.("asset update:finalization started", { assetId, payloadBytes });
    return await retryFinalAssetUpdate({
      timeoutMs: FINAL_ASSET_UPDATE_TIMEOUT_MS,
      update: async (signal, attempt) => {
        onStage?.("asset update:patch dispatched", { assetId, attempt, payloadBytes });
        const asset = await updateAssetWithShareSlugRetry(
          assetId,
          recovery.updates,
          recovery.existingShareSlug,
          onStage,
          context,
          signal,
          (shareSlug) => {
            recovery.updates = { ...recovery.updates, share_slug: shareSlug };
          },
        );
        onStage?.("asset update:patch response", { assetId, attempt, status: "success" });
        return asset;
      },
      onTimeout: (error, attempt) => onStage?.("asset update:timeout", {
        assetId,
        attempt,
        status: "aborted",
        aborted: true,
        responseReceived: false,
        error: safePersistenceError(error),
      }),
      onRetry: (error, attempt) => onStage?.("asset update:retry", {
        assetId,
        attempt,
        error: safePersistenceError(error),
      }),
    });
  } catch (error) {
    console.error("[studio-persistence] final asset update failed", {
      projectId: recovery.projectId,
      assetId: recovery.assetId,
      uploadedPaths: recovery.uploadedPaths,
      error: safePersistenceError(error),
    });
    throw new StudioPersistenceError(recovery, error);
  }
}

export async function reconcileStudioCreation(
  recovery: StudioPersistenceRecovery,
  onStage?: PersistStudioCreationInput["onStage"],
): Promise<PersistStudioCreationResult> {
  onStage?.("persistence reconciliation:start", {
    projectId: recovery.projectId,
    assetId: recovery.assetId,
  });
  return runStudioPersistence(recovery.input, recovery, true, onStage);
}

export async function persistStudioCreation(
  input: PersistStudioCreationInput,
): Promise<PersistStudioCreationResult> {
  const recovery: StudioPersistenceRecovery = {
    userId: input.userId,
    projectId: input.existingProjectId ?? null,
    assetId: input.existingAssetId ?? null,
    updates: {},
    existingShareSlug: null,
    uploadedPaths: { original: null, enhanced: null, teaser: null },
    input,
    error: null,
  };

  return runStudioPersistence(input, recovery, false, input.onStage);
}

async function runStudioPersistence(
  input: PersistStudioCreationInput,
  recovery: StudioPersistenceRecovery,
  reconciling: boolean,
  onStage?: PersistStudioCreationInput["onStage"],
): Promise<PersistStudioCreationResult> {
  // Validate before creating projects, assets, or uploads. Required graphics fail closed.
  const promotionalOverlays = parsePromotionalOverlays(input.promotionalOverlays);
  const productionProfile = input.productionProfile == null
    ? null
    : parseCommercialProductionProfile(input.productionProfile);
  const overlayStyle = input.overlayStyle == null ? null : parseOverlayStyle(input.overlayStyle);
  const requiredNarrativeBeats = input.requiredNarrativeBeats == null
    ? null
    : parseRequiredNarrativeBeats(input.requiredNarrativeBeats);
  recovery.input = input;
  recovery.userId = input.userId;

  try {
    const context = await createBibliotecaMutationContext(input.userId);

    if (recovery.assetId && !recovery.projectId) {
      const existingAsset = await fetchBibliotecaAssetById(recovery.assetId, context);
      recovery.projectId = existingAsset?.project_id ?? null;
    }

    if (!recovery.projectId) {
      onStage?.("project insert:start");
      const project = await createBibliotecaProject(
        buildAutoProjectName(input.customerIntent),
        input.projectMetadata,
        context,
      );
      recovery.projectId = project.id;
      onStage?.("project insert:success", { projectId: recovery.projectId });
    } else if (!reconciling) {
      onStage?.("project update:start", { projectId: recovery.projectId });
      await updateBibliotecaProject(recovery.projectId, input.projectMetadata, context);
      onStage?.("project update:success", { projectId: recovery.projectId });
    }

    const projectId = recovery.projectId;
    if (!projectId) {
      throw new Error("Project identity was not preserved after creation.");
    }

  const originalExtension =
    inferExtensionFromMime(input.originalFile.type || "image/jpeg") || "jpg";

  if (!recovery.assetId) {
    onStage?.("asset insert:start", { projectId });
    const [asset] = await saveBibliotecaAssets([
      {
        project_id: projectId,
        original_name: input.originalFile.name,
        image_url: input.enhancedDataUrl,
        mode: input.mode,
        ai_instructions: input.customerIntent || null,
        image_prompt: input.imagePrompt,
        video_prompt: input.videoPrompt,
        workflow_id: input.projectMetadata.workflow_id ?? null,
        industry: input.projectMetadata.industry ?? null,
        payment_status: "none",
      },
    ], context);
    recovery.assetId = asset.id;
    onStage?.("asset insert:success", { assetId: recovery.assetId, projectId });
  }

  const assetId = recovery.assetId;
  if (!assetId) {
    throw new Error("Asset identity was not preserved after creation.");
  }

  if (!recovery.uploadedPaths.original) {
    onStage?.("storage upload:start", { kind: "original", projectId, assetId });
    const originalUpload = await uploadLibraryObject({
      userId: input.userId, projectId, assetId, kind: "original",
      file: input.originalFile,
      contentType: input.originalFile.type || "image/jpeg",
      extension: originalExtension,
    }, context.client);
    recovery.uploadedPaths.original = originalUpload.path;
    onStage?.("storage upload:success", { kind: "original", path: originalUpload.path });
  }

  const enhancedBlob = dataUrlToBlob(input.enhancedDataUrl);
  if (!recovery.uploadedPaths.enhanced) {
    onStage?.("storage upload:start", { kind: "enhanced", projectId, assetId });
    const enhancedUpload = await uploadLibraryObject({
      userId: input.userId, projectId, assetId, kind: "enhanced",
      file: enhancedBlob,
      contentType: enhancedBlob.type || "image/png",
      extension: inferExtensionFromMime(enhancedBlob.type || "image/png"),
    }, context.client);
    recovery.uploadedPaths.enhanced = enhancedUpload.path;
    onStage?.("storage upload:success", { kind: "enhanced", path: enhancedUpload.path });
  }

  let teaserUpdates: Partial<BibliotecaAsset> = omitAlreadyPersistedImageUrl({
    ...recovery.updates,
    original_path: recovery.uploadedPaths.original,
    image_path: recovery.uploadedPaths.enhanced,
    image_url: input.enhancedDataUrl,
    image_prompt: input.imagePrompt,
    video_prompt: input.videoPrompt,
    ai_instructions: input.customerIntent || null,
  });

  let existingShareSlug: string | null | undefined = recovery.existingShareSlug;

  if (input.teaserVideoBlob) {
    if (!recovery.uploadedPaths.teaser) {
      onStage?.("storage upload:start", { kind: "teaser", projectId, assetId });
      const teaserUpload = await uploadLibraryObject({
        userId: input.userId, projectId, assetId, kind: "teaser",
        file: input.teaserVideoBlob, contentType: "video/mp4", extension: "mp4",
      }, context.client);
      recovery.uploadedPaths.teaser = teaserUpload.path;
      onStage?.("storage upload:success", { kind: "teaser", path: teaserUpload.path });
    }

    if (!teaserUpdates.share_slug) {
      const existingAsset = await fetchBibliotecaAssetById(assetId, context);
      existingShareSlug = existingAsset?.share_slug;
      recovery.existingShareSlug = existingShareSlug ?? null;
    }
    const shareSlug = resolveShareSlug(
      typeof teaserUpdates.share_slug === "string"
        ? teaserUpdates.share_slug
        : existingShareSlug,
    );
    const destination = input.projectMetadata.destination ?? null;
    const recipe = buildCreativeRecipeV1({
      reference_image_path: recovery.uploadedPaths.enhanced,
      customer_intention: input.customerIntent,
      teaser_prompt: input.videoPrompt,
      premium_prompt: buildStudioVideoPrompt(
        input.customerIntent,
        "premium",
        destination,
      ),
      destination,
      aspect_ratio: resolveVeoGenerationParams(destination).aspectRatio,
      preview_duration_seconds: 4,
      premium_target_duration_seconds: resolvePremiumVeoDurationSeconds(),
      workflow_id: input.projectMetadata.workflow_id ?? null,
      generation: {
        image: {
          provider:
            input.generationMetadata?.imageProvider ??
            "openai-responses-image-generation",
          model:
            input.generationMetadata?.imageModel ?? "configured-at-generation",
        },
        preview_video: {
          provider: input.generationMetadata?.videoProvider ?? "vertex-veo",
          model:
            input.generationMetadata?.previewVideoModel ??
            "configured-at-generation",
          workflow: "preview",
        },
        premium_video: {
          provider: input.generationMetadata?.videoProvider ?? "vertex-veo",
          model:
            input.generationMetadata?.premiumVideoModel ??
            "configured-at-generation",
          workflow: "premium",
        },
      },
      prompt_builder_version: PROMPT_BUILDER_VERSION,
      video_processing_version: VIDEO_PROCESSING_VERSION,
      preview_path: recovery.uploadedPaths.teaser,
      promotional_overlays: promotionalOverlays,
      production_profile: productionProfile,
      required_narrative_beats: requiredNarrativeBeats,
      overlay_style: overlayStyle,
      metaprom_watermark_source: requiresMetapromWatermark(promotionalOverlays)
        ? CANONICAL_LOGO_SOURCE : null,
    });

    teaserUpdates = {
      ...teaserUpdates,
      teaser_video_path: recovery.uploadedPaths.teaser,
      share_slug: shareSlug,
      visibility: "public",
      creative_recipe: recipe,
    };
  } else {
    // Advertising Image (no teaser): assign share_slug so REVIEW can use
    // the existing /p/[share_slug] public preview + WhatsApp handoff.
    if (!teaserUpdates.share_slug) {
      const existingAsset = await fetchBibliotecaAssetById(assetId, context);
      existingShareSlug = existingAsset?.share_slug;
      recovery.existingShareSlug = existingShareSlug ?? null;
    }
    const shareSlug = resolveShareSlug(
      typeof teaserUpdates.share_slug === "string"
        ? teaserUpdates.share_slug
        : existingShareSlug,
    );

    teaserUpdates = {
      ...teaserUpdates,
      share_slug: shareSlug,
      visibility: "public",
    };
  }

  recovery.updates = teaserUpdates;
  recovery.existingShareSlug = existingShareSlug ?? recovery.existingShareSlug;

  onStage?.("asset update:start", { assetId });
  const asset = await finalizeStudioAsset(recovery, onStage, context);
  onStage?.("asset update:success", { assetId });

  return { projectId, assetId, asset };
  } catch (error) {
    if (error instanceof StudioPersistenceError) throw error;
    if (error instanceof BibliotecaAuthError && !recovery.projectId && !recovery.assetId) {
      throw error;
    }
    recovery.error = safePersistenceError(error);
    throw new StudioPersistenceError(recovery, error);
  }
}

export async function persistPremiumVideo(
  input: {
    userId: string;
    projectId: string;
    assetId: string;
    premiumVideoBlob: Blob;
  },
): Promise<BibliotecaAsset> {
  const premiumUpload = await uploadLibraryObject({
    userId: input.userId,
    projectId: input.projectId,
    assetId: input.assetId,
    kind: "premium",
    file: input.premiumVideoBlob,
    contentType: "video/mp4",
    extension: "mp4",
  });

  return updateBibliotecaAsset(input.assetId, {
    premium_video_path: premiumUpload.path,
    payment_status: "paid",
  });
}
