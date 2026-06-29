import sharp from "sharp";
import { generateEnhancedImage } from "@/lib/enhancement";
import type { Mode } from "@/lib/prompts";

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
    const formData = await req.formData();

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

    const uploadBuffer = Buffer.from(await uploadedFile.arrayBuffer());

    const rawMode = (formData.get("mode") as string | null) ?? "amazon";
    const mode = (rawMode as Mode) ?? "amazon";
    const aiInstructions = (formData.get("aiInstructions") as string) ?? "";

    if (mode === "custom" && aiInstructions.trim().length === 0) {
      return Response.json(
        { error: "Custom mode requires AI Instructions." },
        { status: 400 },
      );
    }

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

    return Response.json({
      image: `data:image/png;base64,${result.imageBase64}`,
    });
  } catch (error) {
    console.error(
      "Enhancement route error:",
      error instanceof Error ? error.message : error,
    );

    const message =
      error instanceof Error ? error.message : "Enhancement failed";

    return Response.json(
      { error: message === "OPENAI_API_KEY is not configured." ? "Enhancement failed" : message },
      { status: 500 },
    );
  }
}
