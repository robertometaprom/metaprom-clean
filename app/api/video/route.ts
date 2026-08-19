import { mapCreationError } from "@/lib/creation-errors";
import {
  logDestinationGenerationDebug,
  parseStudioDestinationFromFormData,
  resolveVeoGenerationParams,
} from "@/lib/destination-generation";
import {
  generateCommercialVideo,
  isPublicTeaserWorkflow,
  isVertexVideoConfigured,
  normalizeImageForVeo,
  PUBLIC_VIDEO_PREMIUM_FORBIDDEN,
  resolveVideoWorkflowFromRequest,
  resolveWorkflow,
} from "@/lib/video";

export const runtime = "nodejs";
export const maxDuration = 300;

const supportedImageTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function GET() {
  return Response.json({
    ready: isVertexVideoConfigured(),
  });
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const uploadedFile = formData.get("image") as File | null;
    const prompt = (formData.get("prompt") as string | null)?.trim() ?? "";
    const rawTier = (formData.get("tier") as string | null)?.trim() ?? "teaser";
    const rawWorkflow = (formData.get("workflow") as string | null)?.trim() ?? null;
    const requestedWorkflow = resolveVideoWorkflowFromRequest({
      workflow: rawWorkflow,
      tier: rawTier,
    });

    if (!isPublicTeaserWorkflow(requestedWorkflow)) {
      return jsonError(PUBLIC_VIDEO_PREMIUM_FORBIDDEN, 403);
    }

    if (!isVertexVideoConfigured()) {
      return jsonError(
        "No pudimos crear tu comercial en este momento. Intenta de nuevo en unos minutos.",
        500,
      );
    }

    const workflow = "preview" as const;
    const workflowConfig = resolveWorkflow(workflow);
    const destination = parseStudioDestinationFromFormData(formData);
    const veoParams = resolveVeoGenerationParams(destination);

    if (!uploadedFile) {
      return jsonError("No image uploaded.", 400);
    }

    if (!prompt) {
      return jsonError("Prompt is required.", 400);
    }

    const mimeType = uploadedFile.type;
    if (mimeType && !supportedImageTypes.has(mimeType)) {
      return jsonError(
        "Unsupported image format. Please upload JPEG, PNG, or WEBP.",
        415,
      );
    }

    const uploadBuffer = Buffer.from(await uploadedFile.arrayBuffer());

    let normalizedBuffer: Buffer;
    try {
      normalizedBuffer = await normalizeImageForVeo(uploadBuffer);
    } catch (error) {
      console.error("Image normalization failed:", error);
      return jsonError(
        "Unable to normalize the uploaded image. Please try a different photo.",
        415,
      );
    }

    const generation = await generateCommercialVideo({
      workflow,
      prompt,
      imageBuffer: normalizedBuffer,
      aspectRatio: veoParams.aspectRatio,
    });

    logDestinationGenerationDebug({
      stage: "video",
      destination,
      veoParams,
      finalPrompt: prompt,
      generationParameters: {
        workflow,
        tier: generation.tier,
        vertexModel: generation.vertexModel,
        aspectRatio: veoParams.aspectRatio,
        requestedAspectRatio: veoParams.requestedAspectRatio,
        durationSeconds: Number(
          process.env.VEO_VERTEX_DURATION_SECONDS ?? 4,
        ),
        provider: "vertex-veo",
      },
    });

    return new Response(new Uint8Array(generation.buffer), {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(generation.buffer.length),
        "Cache-Control": "no-store",
        "X-Metaprom-Workflow": workflow,
        "X-Metaprom-Tier": workflowConfig.tier,
        "X-Metaprom-Processed": generation.processed ? "true" : "false",
        "X-Metaprom-Provider": "vertex-veo",
        "X-Metaprom-Model": generation.vertexModel,
        "X-Metaprom-Premium-Model": resolveWorkflow("premium").vertexModel,
      },
    });
  } catch (error) {
    console.error("Video generation failed:", error);

    const message =
      error instanceof Error ? error.message : "Video generation failed.";

    return jsonError(
      mapCreationError(message) || "No pudimos crear tu comercial.",
      500,
    );
  }
}
