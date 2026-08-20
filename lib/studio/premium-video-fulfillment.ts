import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { buildStudioVideoPrompt } from "@/lib/studio-prompts";
import {
  logDestinationGenerationDebug,
  parseStudioDestination,
  resolveVeoGenerationParams,
} from "@/lib/destination-generation";
import {
  LIBRARY_BUCKET,
  buildLibraryObjectPath,
} from "@/lib/library-storage";
import type { StudioDestination } from "@/lib/studio-destination";
import {
  generateCommercialVideo,
  isVertexVideoConfigured,
  resolveWorkflow,
} from "@/lib/video";
import { resolvePremiumVeoDurationSeconds } from "@/lib/video/veo-config";
import { parseCreativeRecipeV1, type CreativeRecipeV1 } from "@/lib/creative-recipe";
import {
  isCommercialWorkflowAsset,
  resolvePremiumAuthorization,
} from "@/lib/payments/purchase-integrity";
import { assertRequiredPremiumComposition } from "@/lib/promotional-overlay";
import { assertRequiredNarrativeBeatsInPrompt } from "@/lib/narrative-beats-contract";
import { VIDEO_PROCESSING_VERSION, type PremiumProcessingManifest } from "@/lib/creative-recipe";

export type PremiumFulfillmentResult =
  | { status: "ready"; assetId: string; alreadyReady?: boolean; legacyFallback?: boolean }
  | { status: "skipped"; reason: string; assetId: string }
  | { status: "failed"; reason: string; assetId: string };

function isMissingSchemaColumnError(
  error: { code?: string; message?: string } | null | undefined,
): boolean {
  if (!error) return false;

  if (error.code === "42703" || error.code === "PGRST204") {
    return true;
  }

  return (
    typeof error.message === "string" &&
    (error.message.includes("does not exist") ||
      (error.message.includes("Could not find the") &&
        error.message.includes("column")))
  );
}

async function generatePremiumVideoBuffer(
  imageBuffer: Buffer,
  input: {
    prompt: string;
    destination: StudioDestination | null;
    model?: string;
    promotionalOverlays?: CreativeRecipeV1["promotional_overlays"];
    exactLogoSource?: CreativeRecipeV1["exact_logo_source"];
    overlayStyle?: CreativeRecipeV1["overlay_style"];
  },
): Promise<{ buffer: Buffer; manifest: Omit<PremiumProcessingManifest["final_artifact"], "path"> & {
  processing_version: string;
  overlays_required: boolean;
  overlays_applied: boolean;
  processed: boolean;
  raw_sha256: string;
} }> {
  if (!isVertexVideoConfigured()) {
    throw new Error(
      "Vertex video is not configured. Set GOOGLE_CLOUD_PROJECT, VERTEX_OUTPUT_GCS_URI, " +
        "and VERTEX_SERVICE_ACCOUNT_JSON (or GOOGLE_APPLICATION_CREDENTIALS).",
    );
  }

  const workflow = "premium" as const;
  const workflowConfig = resolveWorkflow(workflow);
  const { prompt, destination } = input;
  const veoParams = resolveVeoGenerationParams(destination);
  const durationSeconds = resolvePremiumVeoDurationSeconds();

  logDestinationGenerationDebug({
    stage: "premium-video",
    destination,
    veoParams,
    finalPrompt: prompt,
    generationParameters: {
      workflow,
      tier: workflowConfig.tier,
      vertexModel: input.model ?? workflowConfig.vertexModel,
      aspectRatio: veoParams.aspectRatio,
      requestedAspectRatio: veoParams.requestedAspectRatio,
      durationSeconds,
      provider: "vertex-veo",
      veoRequestPayload: {
        model: input.model ?? workflowConfig.vertexModel,
        config: {
          aspectRatio: veoParams.aspectRatio,
          numberOfVideos: 1,
          durationSeconds,
        },
      },
    },
  });

  const generation = await generateCommercialVideo({
    workflow,
    prompt,
    imageBuffer,
    aspectRatio: veoParams.aspectRatio,
    model: input.model,
    promotionalOverlays: input.promotionalOverlays,
    exactLogoSource: input.exactLogoSource,
    overlayStyle: input.overlayStyle,
  });

  assertRequiredPremiumComposition(input.promotionalOverlays, generation.processed);

  return {
    buffer: generation.buffer,
    manifest: {
      processing_version: VIDEO_PROCESSING_VERSION,
      overlays_required: generation.overlaysRequired,
      overlays_applied: generation.overlaysApplied,
      processed: generation.processed,
      raw_sha256: generation.rawSha256,
      kind: generation.overlaysRequired ? "composed_premium" : "transcoded_premium",
      sha256: generation.finalSha256,
    },
  };
}

/**
 * After a trusted commercial authorization exists, produce and store the
 * premium HD commercial. Safe to call from authenticated API or webhook.
 *
 * `payment_status` is not authorization. Client-writable asset columns must
 * not be enough to start generation.
 */
export async function fulfillPremiumVideoAfterPayment(
  supabase: SupabaseClient,
  assetId: string,
  options: { requireUserId: string; paidPurchaseId?: string | number | null },
): Promise<PremiumFulfillmentResult> {
  const { data: asset, error: assetError } = await supabase
    .from("assets")
    .select(
      "id, project_id, image_url, image_path, ai_instructions, payment_status, premium_video_path, creative_recipe, teaser_video_path, teaser_video_url, video_url",
    )
    .eq("id", assetId)
    .maybeSingle();

  if (assetError || !asset) {
    return { status: "failed", reason: "Asset not found.", assetId };
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, user_id, destination")
    .eq("id", asset.project_id)
    .maybeSingle();

  if (projectError || !project) {
    if (projectError && isMissingSchemaColumnError(projectError)) {
      const fallback = await supabase
        .from("projects")
        .select("id, user_id")
        .eq("id", asset.project_id)
        .maybeSingle();

      if (!fallback.data) {
        return { status: "failed", reason: "Project not found.", assetId };
      }

      if (fallback.data.user_id !== options.requireUserId) {
        return { status: "failed", reason: "Asset not found.", assetId };
      }

      return fulfillWithProject(supabase, asset, {
        id: fallback.data.id,
        user_id: fallback.data.user_id,
        destination: null,
      }, options);
    }

    return { status: "failed", reason: "Project not found.", assetId };
  }

  if (project.user_id !== options.requireUserId) {
    return { status: "failed", reason: "Asset not found.", assetId };
  }

  return fulfillWithProject(supabase, asset, project, options);
}

async function fulfillWithProject(
  supabase: SupabaseClient,
  asset: {
    id: string | number;
    project_id: string | number;
    image_url?: string | null;
    image_path?: string | null;
    ai_instructions?: string | null;
    payment_status?: string | null;
    premium_video_path?: string | null;
    creative_recipe?: unknown;
    teaser_video_path?: string | null;
    teaser_video_url?: string | null;
    video_url?: string | null;
  },
  project: {
    id: string | number;
    user_id: string;
    destination?: unknown;
  },
  options: { requireUserId: string; paidPurchaseId?: string | number | null },
): Promise<PremiumFulfillmentResult> {
  const assetId = String(asset.id);

  if (asset.premium_video_path) {
    return { status: "ready", assetId, alreadyReady: true };
  }

  if (
    !isCommercialWorkflowAsset({
      teaser_video_path: asset.teaser_video_path,
      teaser_video_url: asset.teaser_video_url,
      video_url: asset.video_url,
    })
  ) {
    return {
      status: "skipped",
      reason: "Premium video requires a Commercial preview asset.",
      assetId,
    };
  }

  const authorization = await resolvePremiumAuthorization(supabase, {
    userId: options.requireUserId,
    assetId,
    paidPurchaseId: options.paidPurchaseId,
  });

  if (!authorization.authorized) {
    return {
      status: "skipped",
      reason: authorization.reason,
      assetId,
    };
  }

  let imageBuffer: Buffer | null = null;
  const recipe = parseCreativeRecipeV1(asset.creative_recipe);
  if (asset.creative_recipe && !recipe) {
    return {
      status: "failed",
      reason: "Creative recipe is invalid; Premium fulfillment can be retried after repair.",
      assetId,
    };
  }
  const referenceImagePath = recipe?.reference_image_path ?? asset.image_path;

  if (!recipe && asset.image_url?.startsWith("data:")) {
    const base64 = asset.image_url.split(",")[1];
    imageBuffer = Buffer.from(base64, "base64");
  } else if (referenceImagePath) {
    const { data, error } = await supabase.storage
      .from(LIBRARY_BUCKET)
      .download(referenceImagePath);

    if (error || !data) {
      return {
        status: "failed",
        reason: "Unable to load enhanced image.",
        assetId,
      };
    }

    imageBuffer = Buffer.from(await data.arrayBuffer());
  }

  if (!imageBuffer) {
    return {
      status: "failed",
      reason: "Enhanced image unavailable.",
      assetId,
    };
  }

  try {
    const destination = recipe?.destination ?? parseStudioDestination(project.destination);
    if (recipe) {
      assertRequiredNarrativeBeatsInPrompt(recipe.premium_prompt, recipe.required_narrative_beats);
    }

    const generated = await generatePremiumVideoBuffer(
      imageBuffer,
      {
        prompt:
          recipe?.premium_prompt ??
          buildStudioVideoPrompt(asset.ai_instructions ?? "", "premium", destination),
        destination,
        model: recipe?.generation.premium_video.model,
        promotionalOverlays: recipe?.promotional_overlays,
        exactLogoSource: recipe?.metaprom_watermark_source ?? recipe?.exact_logo_source,
        overlayStyle: recipe?.overlay_style,
      },
    );

    const path = buildLibraryObjectPath({
      userId: project.user_id,
      projectId: String(project.id),
      assetId,
      kind: "premium",
      extension: "mp4",
    });

    const { error: uploadError } = await supabase.storage
      .from(LIBRARY_BUCKET)
      .upload(path, generated.buffer, {
        upsert: true,
        contentType: "video/mp4",
      });

    if (uploadError) {
      return {
        status: "failed",
        reason: `Premium upload failed: ${uploadError.message}`,
        assetId,
      };
    }

    const updatedRecipe = recipe ? {
      ...recipe,
      premium_processing_manifest: {
        processing_version: generated.manifest.processing_version,
        overlays_required: generated.manifest.overlays_required,
        overlays_applied: generated.manifest.overlays_applied,
        processed: generated.manifest.processed,
        raw_artifact: { kind: "veo_raw" as const, stored: false as const, sha256: generated.manifest.raw_sha256 },
        final_artifact: { kind: generated.manifest.kind, path, sha256: generated.manifest.sha256 },
      },
    } : null;
    const { error: updateError } = await supabase
      .from("assets")
      .update({
        premium_video_path: path,
        payment_status: "paid",
        ...(updatedRecipe ? { creative_recipe: updatedRecipe } : {}),
      })
      .eq("id", assetId);

    if (updateError) {
      return {
        status: "failed",
        reason: `Asset update failed: ${updateError.message}`,
        assetId,
      };
    }

    return { status: "ready", assetId, legacyFallback: !recipe };
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "Premium video generation failed.";
    console.error("[premium-fulfillment]", assetId, reason);
    return { status: "failed", reason, assetId };
  }
}
