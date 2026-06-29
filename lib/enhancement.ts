import OpenAI from "openai";
import type { Response } from "openai/resources/responses/responses";
import { buildPrompt, type Mode } from "@/lib/prompts";

const DEFAULT_MODEL = process.env.OPENAI_ENHANCEMENT_MODEL ?? "gpt-4.1";
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 750;

const IMAGE_TOOL_DIRECTIVE =
  "You must invoke the image generation tool and return a finished advertising image. Do not respond with text-only creative direction, questions, or confirmation requests.";

export type EnhancementAttemptLog = {
  attempt: number;
  latencyMs: number;
  model: string;
  outcome:
    | "success"
    | "text_only"
    | "tool_failed"
    | "empty_result"
    | "api_error";
  imageCallCount: number;
  message?: string;
};

export type GenerateEnhancedImageInput = {
  normalizedJpegBuffer: Buffer;
  mode: Mode;
  aiInstructions?: string;
  openai?: OpenAI;
};

export type GenerateEnhancedImageResult = {
  imageBase64: string;
  model: string;
  attempts: EnhancementAttemptLog[];
};

function getOpenAIClient(existing?: OpenAI): OpenAI {
  if (existing) return existing;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return new OpenAI({ apiKey });
}

function buildAttemptPrompt(
  mode: Mode,
  aiInstructions: string | undefined,
  attempt: number,
): string {
  const base = buildPrompt(mode, aiInstructions);

  if (attempt === 1) {
    return `${base}\n\n${IMAGE_TOOL_DIRECTIVE}`;
  }

  return `${base}\n\n${IMAGE_TOOL_DIRECTIVE}\n\nRetry ${attempt}: produce the image now using the uploaded photo as reference. No text reply.`;
}

type ParsedImageOutput = {
  outcome: EnhancementAttemptLog["outcome"];
  imageBase64?: string;
  message?: string;
  imageCallCount: number;
};

function extractGeneratedImage(response: Response): ParsedImageOutput {
  const calls =
    response.output?.filter((item) => item.type === "image_generation_call") ??
    [];

  if (calls.length === 0) {
    const text = response.output_text?.trim();
    return {
      outcome: "text_only",
      imageCallCount: 0,
      message: text
        ? text.slice(0, 240)
        : "Model completed without image_generation_call output.",
    };
  }

  for (const call of calls) {
    if (call.status === "failed") {
      return {
        outcome: "tool_failed",
        imageCallCount: calls.length,
        message: "image_generation_call status failed",
      };
    }

    if (call.result) {
      return {
        outcome: "success",
        imageBase64: call.result,
        imageCallCount: calls.length,
      };
    }
  }

  return {
    outcome: "empty_result",
    imageCallCount: calls.length,
    message: "image_generation_call completed without result payload",
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableOutcome(outcome: EnhancementAttemptLog["outcome"]): boolean {
  return (
    outcome === "text_only" ||
    outcome === "tool_failed" ||
    outcome === "empty_result"
  );
}

export async function generateEnhancedImage(
  input: GenerateEnhancedImageInput,
): Promise<GenerateEnhancedImageResult> {
  const client = getOpenAIClient(input.openai);
  const base64Image = input.normalizedJpegBuffer.toString("base64");
  const attempts: EnhancementAttemptLog[] = [];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const promptText = buildAttemptPrompt(
      input.mode,
      input.aiInstructions,
      attempt,
    );

    const startedAt = Date.now();

    try {
      const response = await client.responses.create({
        model: DEFAULT_MODEL,
        tool_choice: { type: "image_generation" },
        tools: [
          {
            type: "image_generation",
            action: "auto",
          },
        ],
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: promptText },
              {
                type: "input_image",
                image_url: `data:image/jpeg;base64,${base64Image}`,
                detail: "low",
              },
            ],
          },
        ],
      });

      const latencyMs = Date.now() - startedAt;
      const parsed = extractGeneratedImage(response);

      attempts.push({
        attempt,
        latencyMs,
        model: response.model ?? DEFAULT_MODEL,
        outcome: parsed.outcome,
        imageCallCount: parsed.imageCallCount,
        message: parsed.message,
      });

      if (parsed.outcome === "success" && parsed.imageBase64) {
        return {
          imageBase64: parsed.imageBase64,
          model: response.model ?? DEFAULT_MODEL,
          attempts,
        };
      }

      console.error(
        "Enhancement attempt failed:",
        JSON.stringify({
          attempt,
          latencyMs,
          outcome: parsed.outcome,
          imageCallCount: parsed.imageCallCount,
          message: parsed.message,
          promptLen: promptText.length,
        }),
      );

      if (attempt < MAX_ATTEMPTS && isRetryableOutcome(parsed.outcome)) {
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }

      throw new Error(mapOutcomeToError(parsed.outcome));
    } catch (error) {
      const latencyMs = Date.now() - startedAt;

      if (
        error instanceof Error &&
        error.message !== "No image generated" &&
        error.message !== "Image generation was blocked" &&
        error.message !== "Enhancement failed"
      ) {
        attempts.push({
          attempt,
          latencyMs,
          model: DEFAULT_MODEL,
          outcome: "api_error",
          imageCallCount: 0,
          message: error.message,
        });

        console.error(
          "Enhancement API error:",
          JSON.stringify({ attempt, latencyMs, message: error.message }),
        );

        if (attempt < MAX_ATTEMPTS) {
          await sleep(RETRY_DELAY_MS * attempt);
          continue;
        }
      }

      throw error instanceof Error ? error : new Error("Enhancement failed");
    }
  }

  throw new Error("No image generated");
}

function mapOutcomeToError(outcome: EnhancementAttemptLog["outcome"]): string {
  switch (outcome) {
    case "tool_failed":
      return "Image generation was blocked";
    default:
      return "No image generated";
  }
}
