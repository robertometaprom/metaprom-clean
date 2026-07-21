import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GoogleGenAI } from "@google/genai";
import { Storage } from "@google-cloud/storage";
import sharp from "sharp";
import type { VeoAspectRatio } from "@/lib/destination-generation";
import { resolveWorkflow } from "@/lib/video/workflows";
const DEFAULT_LOCATION = "global";
const DEFAULT_POLL_INTERVAL_MS = 15_000;
const DEFAULT_MAX_POLL_ATTEMPTS = 40;
const DEFAULT_SUBMIT_RETRIES = 6;
const DEFAULT_SUBMIT_RETRY_MS = 60_000;
const DEFAULT_DURATION_SECONDS = 4;
const DEFAULT_ASPECT_RATIO = "16:9";

export type VertexVideoGenerateInput = {
  prompt: string;
  imageBuffer: Buffer;
  aspectRatio?: VeoAspectRatio;
  durationSeconds?: number;
  model: string;
};

type ServiceAccountCredentials = {
  client_email: string;
  private_key: string;
  project_id?: string;
};

type ResolvedVertexConfig = {
  projectId: string;
  location: string;
  outputGcsUri: string;
  pollIntervalMs: number;
  maxPollAttempts: number;
  submitRetries: number;
  submitRetryDelayMs: number;
  durationSeconds: number;
  aspectRatio: string;
  credentials: ServiceAccountCredentials;
};

let credentialsPath: string | null = null;

function parseServiceAccountJson(raw: string): ServiceAccountCredentials {
  const parsed = JSON.parse(raw) as ServiceAccountCredentials;

  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("Service account JSON is missing client_email or private_key.");
  }

  return parsed;
}

function resolveCredentials(): ServiceAccountCredentials | null {
  const inlineJson = process.env.VERTEX_SERVICE_ACCOUNT_JSON?.trim();
  if (inlineJson) {
    return parseServiceAccountJson(inlineJson);
  }

  const configuredPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (configuredPath && existsSync(configuredPath)) {
    return parseServiceAccountJson(readFileSync(configuredPath, "utf8"));
  }

  return null;
}

function ensureApplicationDefaultCredentials(
  credentials: ServiceAccountCredentials,
): string {
  if (credentialsPath && existsSync(credentialsPath)) {
    return credentialsPath;
  }

  const tempPath = join(tmpdir(), "metaprom-vertex-sa.json");
  writeFileSync(tempPath, JSON.stringify(credentials), {
    encoding: "utf8",
    mode: 0o600,
  });
  process.env.GOOGLE_APPLICATION_CREDENTIALS = tempPath;
  credentialsPath = tempPath;
  return tempPath;
}

function resolveVertexConfig(): ResolvedVertexConfig | null {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT?.trim();
  const outputGcsUri = process.env.VERTEX_OUTPUT_GCS_URI?.trim();
  const credentials = resolveCredentials();

  if (!projectId || !outputGcsUri || !credentials) {
    return null;
  }

  if (!outputGcsUri.startsWith("gs://") || outputGcsUri.split("/").length < 4) {
    return null;
  }

  return {
    projectId,
    location: process.env.GOOGLE_CLOUD_LOCATION?.trim() || DEFAULT_LOCATION,
    outputGcsUri: outputGcsUri.endsWith("/") ? outputGcsUri : `${outputGcsUri}/`,
    pollIntervalMs: Number(process.env.VERTEX_POLL_MS ?? DEFAULT_POLL_INTERVAL_MS),
    maxPollAttempts: Number(process.env.VERTEX_MAX_POLLS ?? DEFAULT_MAX_POLL_ATTEMPTS),
    submitRetries: Number(process.env.VERTEX_SUBMIT_RETRIES ?? DEFAULT_SUBMIT_RETRIES),
    submitRetryDelayMs: Number(
      process.env.VERTEX_SUBMIT_RETRY_MS ?? DEFAULT_SUBMIT_RETRY_MS,
    ),
    durationSeconds: Number(
      process.env.VEO_VERTEX_DURATION_SECONDS ?? DEFAULT_DURATION_SECONDS,
    ),
    aspectRatio: process.env.VEO_VERTEX_ASPECT_RATIO?.trim() || DEFAULT_ASPECT_RATIO,
    credentials,
  };
}

export function isVertexVideoConfigured(): boolean {
  return resolveVertexConfig() !== null;
}

export function getVertexVideoStatus() {
  const config = resolveVertexConfig();
  const preview = resolveWorkflow("preview");
  const premium = resolveWorkflow("premium");
  const enterprise = resolveWorkflow("enterprise");

  return {
    veoIntegration: config ? "ready" : "missing_config",
    vertexConfigured: Boolean(config),
    provider: "vertex" as const,
    modelSelection: "workflow" as const,
    workflows: {
      preview: preview.vertexModel,
      premium: premium.vertexModel,
      enterprise: enterprise.vertexModel,
    },
    projectId: config?.projectId ?? null,
    location: config?.location ?? DEFAULT_LOCATION,
  };
}

export async function normalizeImageForVeo(uploadBuffer: Buffer): Promise<Buffer> {
  return sharp(uploadBuffer)
    .rotate()
    .toColorspace("srgb")
    .jpeg({ quality: 90, force: true })
    .toBuffer();
}

function parseGcsUri(uri: string): { bucket: string; object: string } {
  const match = uri.match(/^gs:\/\/([^/]+)\/(.+)$/);
  if (!match) {
    throw new Error(`Invalid GCS URI: ${uri}`);
  }

  return { bucket: match[1], object: match[2] };
}

function extractVideoUri(
  operation: Awaited<ReturnType<GoogleGenAI["models"]["generateVideos"]>>,
): string | undefined {
  const fromSdk = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (fromSdk) return fromSdk;

  const response = operation.response as
    | { videos?: Array<{ gcsUri?: string; uri?: string }> }
    | undefined;

  return response?.videos?.[0]?.gcsUri ?? response?.videos?.[0]?.uri;
}

function isServiceAgentProvisioningError(error: unknown): boolean {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error);

  return message.includes("Service agents are being provisioned");
}

async function pollVideoOperation(
  ai: GoogleGenAI,
  operation: Awaited<ReturnType<GoogleGenAI["models"]["generateVideos"]>>,
  config: ResolvedVertexConfig,
) {
  for (let attempt = 0; attempt < config.maxPollAttempts; attempt++) {
    if (operation.done) break;

    await new Promise((resolve) => setTimeout(resolve, config.pollIntervalMs));
    operation = await ai.operations.get({ operation });
  }

  return operation;
}

async function downloadFromGcs(
  gcsUri: string,
  config: ResolvedVertexConfig,
): Promise<Buffer> {
  const { bucket, object } = parseGcsUri(gcsUri);
  const storage = new Storage({
    projectId: config.projectId,
    credentials: config.credentials,
  });

  const [contents] = await storage.bucket(bucket).file(object).download();
  return contents;
}

function createVertexClient(config: ResolvedVertexConfig): GoogleGenAI {
  ensureApplicationDefaultCredentials(config.credentials);
  process.env.GOOGLE_GENAI_USE_ENTERPRISE = "true";

  return new GoogleGenAI({
    vertexai: true,
    project: config.projectId,
    location: config.location,
  });
}

export async function generateVertexVideo(
  input: VertexVideoGenerateInput,
): Promise<Buffer> {
  const config = resolveVertexConfig();

  if (!config) {
    throw new Error(
      "Vertex video is not configured. Set GOOGLE_CLOUD_PROJECT, VERTEX_OUTPUT_GCS_URI, " +
        "and VERTEX_SERVICE_ACCOUNT_JSON (or GOOGLE_APPLICATION_CREDENTIALS).",
    );
  }

  const ai = createVertexClient(config);
  const requestPrefix = `${config.outputGcsUri}${randomUUID()}/`;
  const imageBuffer = await normalizeImageForVeo(input.imageBuffer);
  const aspectRatio = input.aspectRatio ?? config.aspectRatio;
  const durationSeconds = input.durationSeconds ?? config.durationSeconds;
  const model = input.model.trim();

  if (!model) {
    throw new Error("Vertex video model is required. Resolve it from the workflow registry.");
  }

  if (aspectRatio !== "9:16" && aspectRatio !== "16:9") {
    throw new Error(
      `Unsupported Veo aspect ratio "${aspectRatio}". Veo supports 9:16 and 16:9 only.`,
    );
  }

  let operation: Awaited<ReturnType<GoogleGenAI["models"]["generateVideos"]>> | null =
    null;

  for (let attempt = 1; attempt <= config.submitRetries; attempt++) {
    operation = await ai.models.generateVideos({
      model,
      prompt: input.prompt,
      image: {
        imageBytes: imageBuffer.toString("base64"),
        mimeType: "image/jpeg",
      },
      config: {
        aspectRatio,
        numberOfVideos: 1,
        durationSeconds,
        outputGcsUri: requestPrefix,
      },
    });

    operation = await pollVideoOperation(ai, operation, config);

    if (operation.error && isServiceAgentProvisioningError(operation.error)) {
      if (attempt === config.submitRetries) break;
      await new Promise((resolve) => setTimeout(resolve, config.submitRetryDelayMs));
      continue;
    }

    break;
  }

  if (!operation) {
    throw new Error("Video generation failed before submission.");
  }

  if (!operation.done) {
    throw new Error(
      `Video generation timed out after ${config.maxPollAttempts} polls.`,
    );
  }

  if (operation.error) {
    if (isServiceAgentProvisioningError(operation.error)) {
      throw new Error(
        "Video generation failed: Vertex service agents are still provisioning. Try again shortly.",
      );
    }

    throw new Error(`Video generation failed: ${JSON.stringify(operation.error)}`);
  }

  const videoUri = extractVideoUri(operation);

  if (!videoUri) {
    const filtered = operation.response?.raiMediaFilteredReasons;
    throw new Error(
      filtered?.length
        ? `Video blocked by safety filters: ${filtered.join(", ")}`
        : "No video was generated.",
    );
  }

  return downloadFromGcs(videoUri, config);
}
