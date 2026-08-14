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
import { isCreativeRecipeV1, type CreativeRecipeV1 } from "@/lib/creative-recipe";

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
  },
): Promise<Buffer> {
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
  });

  return generation.buffer;
}

/**
 * After payment is verified (`assets.payment_status = paid`), produce and store
 * the premium HD commercial. Safe to call from authenticated API or webhook.
 */
export async function fulfillPremiumVideoAfterPayment(
  supabase: SupabaseClient,
  assetId: string,
  options?: { requireUserId?: string },
): Promise<PremiumFulfillmentResult> {
  const { data: asset, error: assetError } = await supabase
    .from("assets")
    .select(
      "id, project_id, image_url, image_path, ai_instructions, payment_status, premium_video_path, creative_recipe",
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

      if (
        options?.requireUserId &&
        fallback.data.user_id !== options.requireUserId
      ) {
        return { status: "failed", reason: "Asset not found.", assetId };
      }

      return fulfillWithProject(supabase, asset, {
        id: fallback.data.id,
        user_id: fallback.data.user_id,
        destination: null,
      });
    }

    return { status: "failed", reason: "Project not found.", assetId };
  }

  if (options?.requireUserId && project.user_id !== options.requireUserId) {
    return { status: "failed", reason: "Asset not found.", assetId };
  }

  return fulfillWithProject(supabase, asset, project);
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
  },
  project: {
    id: string | number;
    user_id: string;
    destination?: unknown;
  },
): Promise<PremiumFulfillmentResult> {
  const assetId = String(asset.id);

  if (asset.payment_status !== "paid") {
    return {
      status: "skipped",
      reason: "Premium video requires completed payment.",
      assetId,
    };
  }

  if (asset.premium_video_path) {
    return { status: "ready", assetId, alreadyReady: true };
  }

  let imageBuffer: Buffer | null = null;
  const recipe = isCreativeRecipeV1(asset.creative_recipe)
    ? (asset.creative_recipe as CreativeRecipeV1)
    : null;
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

    const videoBuffer = await generatePremiumVideoBuffer(
      imageBuffer,
      {
        prompt:
          recipe?.premium_prompt ??
          buildStudioVideoPrompt(asset.ai_instructions ?? "", "premium", destination),
        destination,
        model: recipe?.generation.premium_video.model,
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
      .upload(path, videoBuffer, {
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

    const { error: updateError } = await supabase
      .from("assets")
      .update({
        premium_video_path: path,
        payment_status: "paid",
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
