import { readVisitorIdFromRequest } from "@/lib/analytics/cookies";
import { readCreationRunId } from "@/lib/analytics/creation-run";
import {
  recordCreationCompleted,
  recordCreationStarted,
} from "@/lib/analytics/record";
import { mapCreationError } from "@/lib/creation-errors";
import {
  logDestinationGenerationDebug,
  parseStudioDestinationFromFormData,
  resolveVeoGenerationParams,
} from "@/lib/destination-generation";
import {
  MAX_GENERATION_FORM_BYTES,
  MAX_GENERATION_PROMPT_CHARS,
  MAX_ORIGINAL_FILE_BYTES,
  VIDEO_TEASER_RATE_LIMIT,
} from "@/lib/security/limits";
import {
  enforcePaidProviderCostControl,
  getOptionalUserId,
} from "@/lib/security/cost-control";
import {
  assertContentLengthWithin,
  assertFileWithinLimit,
  assertPromptLength,
  BodyTooLargeError,
} from "@/lib/security/validation";
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
    try {
      assertContentLengthWithin(req, MAX_GENERATION_FORM_BYTES);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Request body is too large.";
      const status = error instanceof BodyTooLargeError ? 413 : 400;
      return jsonError(message, status);
    }

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

    if (!uploadedFile) {
      return jsonError("No image uploaded.", 400);
    }

    if (!prompt) {
      return jsonError("Prompt is required.", 400);
    }

    try {
      assertFileWithinLimit(uploadedFile, MAX_ORIGINAL_FILE_BYTES);
      assertPromptLength(prompt, MAX_GENERATION_PROMPT_CHARS);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid request.";
      const status = /too long|too large|exceeds/i.test(message) ? 413 : 400;
      return jsonError(message, status);
    }

    const mimeType = uploadedFile.type;
    if (mimeType && !supportedImageTypes.has(mimeType)) {
      return jsonError(
        "Unsupported image format. Please upload JPEG, PNG, or WEBP.",
        415,
      );
    }

    if (!isVertexVideoConfigured()) {
      return jsonError(
        "No pudimos crear tu comercial en este momento. Intenta de nuevo en unos minutos.",
        500,
      );
    }

    const userId = await getOptionalUserId();
    const rateLimited = await enforcePaidProviderCostControl({
      request: req,
      userId,
      endpointClass: "video-teaser",
      limit: VIDEO_TEASER_RATE_LIMIT,
    });
    if (rateLimited) return rateLimited;

    const workflow = "preview" as const;
    const workflowConfig = resolveWorkflow(workflow);
    const destination = parseStudioDestinationFromFormData(formData);
    const veoParams = resolveVeoGenerationParams(destination);

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

    const runId = readCreationRunId(formData);
    const visitorId = readVisitorIdFromRequest(req);
    try {
      await recordCreationStarted({
        runId,
        userId,
        visitorId,
        mode: "commercial",
      });
    } catch (analyticsError) {
      console.error("creation_started analytics failed:", analyticsError);
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

    if (generation.buffer.length > 0) {
      try {
        await recordCreationCompleted({
          runId,
          userId,
          visitorId,
          mode: "commercial",
        });
      } catch (analyticsError) {
        console.error("creation_completed analytics failed:", analyticsError);
      }
    }

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
