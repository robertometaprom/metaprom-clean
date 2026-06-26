import { GoogleGenAI } from "@google/genai";
import { mkdtemp, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import sharp from "sharp";

export const runtime = "nodejs";
export const maxDuration = 300;

const DEFAULT_VEO_MODEL = "veo-3.1-lite-generate-preview";
const VEO_MODEL = process.env.VEO_MODEL ?? DEFAULT_VEO_MODEL;
const POLL_INTERVAL_MS = 10_000;
const MAX_POLL_ATTEMPTS = 60;

const supportedImageTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  return new GoogleGenAI({ apiKey });
}

export async function GET() {
  const configured = Boolean(process.env.GEMINI_API_KEY?.trim());

  return Response.json({
    veoIntegration: configured ? "ready" : "missing_api_key",
    geminiApiKeyConfigured: configured,
    veoModel: VEO_MODEL,
  });
}

async function normalizeImage(uploadBuffer: Buffer): Promise<{
  buffer: Buffer;
  mimeType: "image/jpeg";
}> {
  const buffer = await sharp(uploadBuffer)
    .rotate()
    .toColorspace("srgb")
    .jpeg({ quality: 90, force: true })
    .toBuffer();

  return { buffer, mimeType: "image/jpeg" };
}

export async function POST(req: Request) {
  let tempDir: string | null = null;

  try {
    const ai = getGeminiClient();

    if (!ai) {
      return jsonError(
        "GEMINI_API_KEY is not configured. Add it to your environment variables.",
        500,
      );
    }

    const formData = await req.formData();
    const uploadedFile = formData.get("image") as File | null;
    const prompt = (formData.get("prompt") as string | null)?.trim() ?? "";

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

    let normalizedImage: { buffer: Buffer; mimeType: "image/jpeg" };
    try {
      normalizedImage = await normalizeImage(uploadBuffer);
    } catch (error) {
      console.error("Image normalization failed:", error);
      return jsonError(
        "Unable to normalize the uploaded image. Please try a different photo.",
        415,
      );
    }

    let operation = await ai.models.generateVideos({
      model: VEO_MODEL,
      prompt,
      image: {
        imageBytes: normalizedImage.buffer.toString("base64"),
        mimeType: normalizedImage.mimeType,
      },
      config: {
        numberOfVideos: 1,
      },
    });

    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      if (operation.done) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      operation = await ai.operations.getVideosOperation({ operation });
    }

    if (!operation.done) {
      return jsonError(
        "Video generation timed out. Try again or use a shorter prompt.",
        504,
      );
    }

    const generatedVideo = operation.response?.generatedVideos?.[0]?.video;

    if (!generatedVideo) {
      const filteredReasons = operation.response?.raiMediaFilteredReasons;
      const message =
        filteredReasons && filteredReasons.length > 0
          ? `Video generation blocked: ${filteredReasons.join(", ")}`
          : "No video was generated.";

      return jsonError(message, 500);
    }

    tempDir = await mkdtemp(join(tmpdir(), "metaprom-veo-"));
    const downloadPath = join(tempDir, "output.mp4");

    await ai.files.download({
      file: generatedVideo,
      downloadPath,
    });

    const videoBuffer = await readFile(downloadPath);

    return new Response(videoBuffer, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(videoBuffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Video generation failed:", error);

    const message =
      error instanceof Error ? error.message : "Video generation failed.";

    return jsonError(message, 500);
  } finally {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}
