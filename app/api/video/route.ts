import type { CommercialTier } from "@/lib/commercial/tiers";
import { mapCreationError } from "@/lib/creation-errors";
import {
  logDestinationGenerationDebug,
  parseStudioDestinationFromFormData,
  resolveVeoGenerationParams,
} from "@/lib/destination-generation";
import {
  generateVertexVideo,
  getVertexVideoStatus,
  isVertexVideoConfigured,
  normalizeImageForVeo,
} from "@/lib/video";
import { processCommercialVideo } from "@/lib/video-processing";

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
  return Response.json(getVertexVideoStatus());
}

export async function POST(req: Request) {
  try {
    if (!isVertexVideoConfigured()) {
      return jsonError(
        "No pudimos crear tu comercial en este momento. Intenta de nuevo en unos minutos.",
        500,
      );
    }

    const formData = await req.formData();
    const uploadedFile = formData.get("image") as File | null;
    const prompt = (formData.get("prompt") as string | null)?.trim() ?? "";
    const rawTier = (formData.get("tier") as string | null)?.trim() ?? "teaser";
    const tier: CommercialTier = rawTier === "premium" ? "premium" : "teaser";
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

    const videoBuffer = await generateVertexVideo({
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
        tier,
        aspectRatio: veoParams.aspectRatio,
        requestedAspectRatio: veoParams.requestedAspectRatio,
        durationSeconds: Number(
          process.env.VEO_VERTEX_DURATION_SECONDS ?? 4,
        ),
        provider: "vertex-veo",
      },
    });

    const { buffer: processedBuffer, processed } = await processCommercialVideo({
      buffer: videoBuffer,
      tier,
    });

    return new Response(new Uint8Array(processedBuffer), {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(processedBuffer.length),
        "Cache-Control": "no-store",
        "X-Metaprom-Tier": tier,
        "X-Metaprom-Processed": processed ? "true" : "false",
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
