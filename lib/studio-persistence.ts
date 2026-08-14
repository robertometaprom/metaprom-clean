import {
  buildAutoProjectName,
  createBibliotecaProject,
  fetchBibliotecaAssetById,
  saveBibliotecaAssets,
  updateBibliotecaAsset,
  updateBibliotecaProject,
  type BibliotecaAsset,
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
  PROMPT_BUILDER_VERSION,
  VIDEO_PROCESSING_VERSION,
  buildCreativeRecipeV1,
} from "@/lib/creative-recipe";
import { buildStudioVideoPrompt } from "@/lib/studio-prompts";
import { resolveVeoGenerationParams } from "@/lib/destination-generation";
import { resolvePremiumVeoDurationSeconds } from "@/lib/video/veo-config";

export type PersistStudioCreationInput = {
  userId: string;
  originalFile: File;
  enhancedDataUrl: string;
  teaserVideoBlob?: Blob;
  imagePrompt: string;
  videoPrompt: string;
  customerIntent: string;
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
): Promise<BibliotecaAsset> {
  if (existingShareSlug || !updates.share_slug) {
    try {
      return await updateBibliotecaAsset(assetId, updates);
    } catch (error) {
      if (!isSchemaColumnMissingError(error) || !updates.share_slug) {
        throw error;
      }

      onStage?.("asset update:share fields unavailable, continuing", {
        assetId,
      });
      return updateBibliotecaAsset(assetId, withoutShareFields(updates));
    }
  }

  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      return await updateBibliotecaAsset(assetId, updates);
    } catch (error) {
      if (isSchemaColumnMissingError(error)) {
        onStage?.("asset update:share fields unavailable, continuing", {
          assetId,
        });
        return updateBibliotecaAsset(assetId, withoutShareFields(updates));
      }

      if (!isShareSlugUniqueViolation(error)) {
        throw error;
      }

      updates = {
        ...updates,
        share_slug: generateShareSlug(),
      };
    }
  }

  throw new Error("Unable to assign a unique share slug.");
}

export async function persistStudioCreation(
  input: PersistStudioCreationInput,
): Promise<PersistStudioCreationResult> {
  let projectId = input.existingProjectId ?? null;
  let assetId = input.existingAssetId ?? null;

  if (!projectId) {
    input.onStage?.("project insert:start");
    const project = await createBibliotecaProject(
      buildAutoProjectName(input.customerIntent),
      input.projectMetadata,
    );
    projectId = project.id;
    input.onStage?.("project insert:success", { projectId });
  } else {
    input.onStage?.("project update:start", { projectId });
    await updateBibliotecaProject(projectId, input.projectMetadata);
    input.onStage?.("project update:success", { projectId });
  }

  const originalExtension =
    inferExtensionFromMime(input.originalFile.type || "image/jpeg") || "jpg";

  if (!assetId) {
    input.onStage?.("asset insert:start", { projectId });
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
    ]);
    assetId = asset.id;
    input.onStage?.("asset insert:success", { assetId, projectId });
  }

  input.onStage?.("storage upload:start", {
    kind: "original",
    projectId,
    assetId,
  });
  const originalUpload = await uploadLibraryObject({
    userId: input.userId,
    projectId,
    assetId,
    kind: "original",
    file: input.originalFile,
    contentType: input.originalFile.type || "image/jpeg",
    extension: originalExtension,
  });
  input.onStage?.("storage upload:success", {
    kind: "original",
    path: originalUpload.path,
  });

  const enhancedBlob = dataUrlToBlob(input.enhancedDataUrl);
  input.onStage?.("storage upload:start", {
    kind: "enhanced",
    projectId,
    assetId,
  });
  const enhancedUpload = await uploadLibraryObject({
    userId: input.userId,
    projectId,
    assetId,
    kind: "enhanced",
    file: enhancedBlob,
    contentType: enhancedBlob.type || "image/png",
    extension: inferExtensionFromMime(enhancedBlob.type || "image/png"),
  });
  input.onStage?.("storage upload:success", {
    kind: "enhanced",
    path: enhancedUpload.path,
  });

  let teaserUpdates: Partial<BibliotecaAsset> = {
    original_path: originalUpload.path,
    image_path: enhancedUpload.path,
    image_url: input.enhancedDataUrl,
    image_prompt: input.imagePrompt,
    video_prompt: input.videoPrompt,
    ai_instructions: input.customerIntent || null,
  };

  let existingShareSlug: string | null | undefined;

  if (input.teaserVideoBlob) {
    input.onStage?.("storage upload:start", {
      kind: "teaser",
      projectId,
      assetId,
    });
    const teaserUpload = await uploadLibraryObject({
      userId: input.userId,
      projectId,
      assetId,
      kind: "teaser",
      file: input.teaserVideoBlob,
      contentType: "video/mp4",
      extension: "mp4",
    });
    input.onStage?.("storage upload:success", {
      kind: "teaser",
      path: teaserUpload.path,
    });

    const existingAsset = await fetchBibliotecaAssetById(assetId);
    existingShareSlug = existingAsset?.share_slug;
    const shareSlug = resolveShareSlug(existingShareSlug);
    const destination = input.projectMetadata.destination ?? null;
    const recipe = buildCreativeRecipeV1({
      reference_image_path: enhancedUpload.path,
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
      preview_path: teaserUpload.path,
    });

    teaserUpdates = {
      ...teaserUpdates,
      teaser_video_path: teaserUpload.path,
      share_slug: shareSlug,
      visibility: "public",
      creative_recipe: recipe,
    };
  } else {
    // Advertising Image (no teaser): assign share_slug so REVIEW can use
    // the existing /p/[share_slug] public preview + WhatsApp handoff.
    const existingAsset = await fetchBibliotecaAssetById(assetId);
    existingShareSlug = existingAsset?.share_slug;
    const shareSlug = resolveShareSlug(existingShareSlug);

    teaserUpdates = {
      ...teaserUpdates,
      share_slug: shareSlug,
      visibility: "public",
    };
  }

  input.onStage?.("asset update:start", { assetId });
  const asset = await updateAssetWithShareSlugRetry(
    assetId,
    teaserUpdates,
    existingShareSlug,
    input.onStage,
  );
  input.onStage?.("asset update:success", { assetId });

  return { projectId, assetId, asset };
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
