import { GoogleGenAI } from "@google/genai";
import { mkdtemp, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import sharp from "sharp";
import { buildStudioVideoPrompt } from "@/lib/studio-prompts";
import { updateAssetPremiumVideoServer } from "@/lib/library-storage-server";
import { createClient } from "@/lib/supabase/server";
import { processCommercialVideo } from "@/lib/video-processing";

export const runtime = "nodejs";
export const maxDuration = 300;

const DEFAULT_VEO_MODEL = "veo-3.1-lite-generate-preview";
const VEO_MODEL = process.env.VEO_MODEL ?? DEFAULT_VEO_MODEL;
const POLL_INTERVAL_MS = 10_000;
const MAX_POLL_ATTEMPTS = 60;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

async function generatePremiumVideoBuffer(
  imageBuffer: Buffer,
  customerIntent: string,
): Promise<Buffer> {
  const ai = getGeminiClient();

  if (!ai) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const prompt = buildStudioVideoPrompt(customerIntent, "premium");
  const normalized = await sharp(imageBuffer)
    .rotate()
    .toColorspace("srgb")
    .jpeg({ quality: 90, force: true })
    .toBuffer();

  let operation = await ai.models.generateVideos({
    model: VEO_MODEL,
    prompt,
    image: {
      imageBytes: normalized.toString("base64"),
      mimeType: "image/jpeg",
    },
    config: { numberOfVideos: 1 },
  });

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    if (operation.done) break;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    operation = await ai.operations.getVideosOperation({ operation });
  }

  if (!operation.done) {
    throw new Error("Premium video generation timed out.");
  }

  const generatedVideo = operation.response?.generatedVideos?.[0]?.video;

  if (!generatedVideo) {
    throw new Error("No premium video was generated.");
  }

  let tempDir: string | null = null;

  try {
    tempDir = await mkdtemp(join(tmpdir(), "metaprom-premium-"));
    const downloadPath = join(tempDir, "premium.mp4");

    await ai.files.download({
      file: generatedVideo,
      downloadPath,
    });

    const rawBuffer = await readFile(downloadPath);
    const { buffer } = await processCommercialVideo({
      buffer: rawBuffer,
      tier: "premium",
    });

    return buffer;
  } finally {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
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
    .select("id")
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
      error instanceof Error ? error.message : "Premium video generation failed.",
      500,
    );
  }
}
