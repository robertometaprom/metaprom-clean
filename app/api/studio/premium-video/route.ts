import { buildStudioVideoPrompt } from "@/lib/studio-prompts";
import { mapCreationError } from "@/lib/creation-errors";
import {
  logDestinationGenerationDebug,
  parseStudioDestination,
  resolveVeoGenerationParams,
} from "@/lib/destination-generation";
import { updateAssetPremiumVideoServer } from "@/lib/library-storage-server";
import { createClient } from "@/lib/supabase/server";
import {
  generateCommercialVideo,
  isVertexVideoConfigured,
  resolveWorkflow,
} from "@/lib/video";
import type { StudioDestination } from "@/lib/studio-destination";

export const runtime = "nodejs";
export const maxDuration = 300;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

async function generatePremiumVideoBuffer(
  imageBuffer: Buffer,
  customerIntent: string,
  destination: StudioDestination | null,
): Promise<Buffer> {
  if (!isVertexVideoConfigured()) {
    throw new Error(
      "Vertex video is not configured. Set GOOGLE_CLOUD_PROJECT, VERTEX_OUTPUT_GCS_URI, " +
        "and VERTEX_SERVICE_ACCOUNT_JSON (or GOOGLE_APPLICATION_CREDENTIALS).",
    );
  }

  const workflow = "premium" as const;
  const workflowConfig = resolveWorkflow(workflow);
  const prompt = buildStudioVideoPrompt(customerIntent, "premium", destination);
  const veoParams = resolveVeoGenerationParams(destination);

  logDestinationGenerationDebug({
    stage: "premium-video",
    destination,
    veoParams,
    finalPrompt: prompt,
    generationParameters: {
      workflow,
      tier: workflowConfig.tier,
      vertexModel: workflowConfig.vertexModel,
      aspectRatio: veoParams.aspectRatio,
      requestedAspectRatio: veoParams.requestedAspectRatio,
      durationSeconds: Number(process.env.VEO_VERTEX_DURATION_SECONDS ?? 4),
      provider: "vertex-veo",
    },
  });

  const generation = await generateCommercialVideo({
    workflow,
    prompt,
    imageBuffer,
    aspectRatio: veoParams.aspectRatio,
  });

  return generation.buffer;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("Authentication required.", 401);
  }

  let body: { assetId?: string };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const assetId = body.assetId?.trim();

  if (!assetId) {
    return jsonError("assetId is required.", 400);
  }

  const { data: asset, error: assetError } = await supabase
    .from("assets")
    .select(
      "id, project_id, image_url, image_path, ai_instructions, payment_status, premium_video_path",
    )
    .eq("id", assetId)
    .maybeSingle();

  if (assetError || !asset) {
    return jsonError("Asset not found.", 404);
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, destination")
    .eq("id", asset.project_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!project) {
    return jsonError("Asset not found.", 404);
  }

  if (asset.payment_status !== "paid") {
    return jsonError("Premium video requires completed payment.", 402);
  }

  if (asset.premium_video_path) {
    return Response.json({ status: "ready", assetId });
  }

  let imageBuffer: Buffer | null = null;

  if (asset.image_url?.startsWith("data:")) {
    const base64 = asset.image_url.split(",")[1];
    imageBuffer = Buffer.from(base64, "base64");
  } else if (asset.image_path) {
    const { data, error } = await supabase.storage
      .from("library")
      .download(asset.image_path);

    if (error || !data) {
      return jsonError("Unable to load enhanced image.", 500);
    }

    imageBuffer = Buffer.from(await data.arrayBuffer());
  }

  if (!imageBuffer) {
    return jsonError("Enhanced image unavailable.", 500);
  }

  try {
    const videoBuffer = await generatePremiumVideoBuffer(
      imageBuffer,
      asset.ai_instructions ?? "",
      parseStudioDestination(project?.destination),
    );

    await updateAssetPremiumVideoServer({
      assetId,
      userId: user.id,
      projectId: asset.project_id,
      videoBuffer,
    });

    return Response.json({ status: "ready", assetId });
  } catch (error) {
    console.error("Premium video generation failed:", error);
    return jsonError(
      mapCreationError(
        error instanceof Error ? error.message : "Premium video generation failed.",
      ) || "No pudimos producir tu comercial HD.",
      500,
    );
  }
}
