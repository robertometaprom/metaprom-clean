import sharp from "sharp";
import { mapCreationError } from "@/lib/creation-errors";
import {
  logDestinationGenerationDebug,
  parseStudioDestinationFromFormData,
} from "@/lib/destination-generation";
import {
  assertAdvertisingImageGenerationAllowed,
  isAdvertisingImagePurpose,
} from "@/lib/entitlements/assert-advertising-generation";
import { generateEnhancedImage } from "@/lib/enhancement";
import type { Mode } from "@/lib/prompts";
import {
  ENHANCEMENT_ADVERTISING_RATE_LIMIT,
  ENHANCEMENT_PREVIEW_RATE_LIMIT,
  MAX_GENERATION_FORM_BYTES,
  MAX_GENERATION_PROMPT_CHARS,
  MAX_ORIGINAL_FILE_BYTES,
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

export const maxDuration = 300;

const supportedImageTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export async function POST(req: Request) {
  try {
    try {
      assertContentLengthWithin(req, MAX_GENERATION_FORM_BYTES);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Request body is too large.";
      const status = error instanceof BodyTooLargeError ? 413 : 400;
      return Response.json({ error: message }, { status });
    }

    const formData = await req.formData();

    let advertisingUserId: string | null = null;

    // Advertising Image only — Commercial enhancement path stays unchanged.
    if (isAdvertisingImagePurpose(formData)) {
      const gate = await assertAdvertisingImageGenerationAllowed();
      if (!gate.ok) {
        return Response.json(
          {
            error: gate.message,
            code: gate.code,
            planesHref: gate.planesHref,
          },
          { status: gate.status },
        );
      }
      advertisingUserId = gate.userId;
    }

    const uploadedFile = formData.get("image") as File;

    if (!uploadedFile) {
      return Response.json({ error: "No image uploaded" }, { status: 400 });
    }

    const mimeType = uploadedFile.type;
    if (mimeType && !supportedImageTypes.has(mimeType)) {
      return Response.json(
        {
          error:
            "Unsupported image format. Please upload JPEG, PNG, WEBP, HEIC, or HEIF.",
        },
        { status: 415 },
      );
    }

    const rawMode = (formData.get("mode") as string | null) ?? "amazon";
    const mode = (rawMode as Mode) ?? "amazon";
    const aiInstructions = (formData.get("aiInstructions") as string) ?? "";
    const destination = parseStudioDestinationFromFormData(formData);

    if (mode === "custom" && aiInstructions.trim().length === 0) {
      return Response.json(
        { error: "Custom mode requires AI Instructions." },
        { status: 400 },
      );
    }

    try {
      assertFileWithinLimit(uploadedFile, MAX_ORIGINAL_FILE_BYTES);
      assertPromptLength(aiInstructions, MAX_GENERATION_PROMPT_CHARS);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid request.";
      const status = /too long|too large|exceeds/i.test(message) ? 413 : 400;
      return Response.json({ error: message }, { status });
    }

    const userId = advertisingUserId ?? (await getOptionalUserId());
    const rateLimited = await enforcePaidProviderCostControl({
      request: req,
      userId,
      endpointClass: advertisingUserId
        ? "enhancement-advertising"
        : "enhancement-preview",
      limit: advertisingUserId
        ? ENHANCEMENT_ADVERTISING_RATE_LIMIT
        : ENHANCEMENT_PREVIEW_RATE_LIMIT,
    });
    if (rateLimited) return rateLimited;

    const uploadBuffer = Buffer.from(await uploadedFile.arrayBuffer());

    let normalizedBuffer: Buffer;
    try {
      normalizedBuffer = await sharp(uploadBuffer)
        .rotate()
        .toColorspace("srgb")
        .jpeg({ quality: 90, force: true })
        .toBuffer();
    } catch (sharpError) {
      console.error("Image normalization failed:", sharpError);
      return Response.json(
        {
          error:
            "Unable to normalize the uploaded image. Please try a different photo.",
        },
        { status: 415 },
      );
    }

    const result = await generateEnhancedImage({
      normalizedJpegBuffer: normalizedBuffer,
      mode,
      aiInstructions,
    });

    logDestinationGenerationDebug({
      stage: "image",
      destination,
      finalPrompt: aiInstructions,
      generationParameters: {
        mode,
        provider: "openai-image-generation",
        destination: destination
          ? {
              platform: destination.platform,
              aspectRatio: destination.aspectRatio,
            }
          : null,
      },
    });

    return Response.json({
      image: `data:image/png;base64,${result.imageBase64}`,
      provider: "openai-responses-image-generation",
      model: result.model,
    });
  } catch (error) {
    console.error(
      "Enhancement route error:",
      error instanceof Error ? error.message : error,
    );

    const message =
      error instanceof Error ? error.message : "Enhancement failed";

    return Response.json(
      {
        error:
          mapCreationError(message) || "No pudimos preparar tu escena comercial.",
      },
      { status: 500 },
    );
  }
}
