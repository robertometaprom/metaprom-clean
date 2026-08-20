import type { ConversationMessage, ProjectContext } from "@/lib/creative-director/types";
import { MAX_BATCH_SOURCE_FILES } from "@/lib/instant-capture";
import {
  MAX_CONVERSATION_HISTORY_MESSAGES,
  MAX_CONVERSATION_MESSAGE_LENGTH,
  MAX_CUSTOMER_MESSAGE_LENGTH,
} from "@/lib/security/limits";

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidResumeToken(token: string): boolean {
  return UUID_V4_REGEX.test(token.trim());
}

export function assertValidResumeToken(
  token: string,
  label = "token",
): string {
  const trimmed = token.trim();

  if (!trimmed) {
    throw new Error(`${label} is required.`);
  }

  if (!isValidResumeToken(trimmed)) {
    throw new Error(`Invalid ${label}.`);
  }

  return trimmed;
}

export function assertContentLengthWithin(
  request: Request,
  maxBytes: number,
): void {
  const contentLength = request.headers.get("content-length");

  if (!contentLength) return;

  const length = Number.parseInt(contentLength, 10);

  if (Number.isFinite(length) && length > maxBytes) {
    throw new BodyTooLargeError(maxBytes);
  }
}

export function assertPromptLength(prompt: string, maxChars: number): string {
  if (prompt.length > maxChars) {
    throw new Error("Prompt is too long.");
  }

  return prompt;
}

export function assertFileWithinLimit(file: File, maxBytes: number): void {
  if (file.size > maxBytes) {
    throw new Error("Image exceeds the maximum allowed size.");
  }
}

export async function readJsonBodyWithLimit(
  request: Request,
  maxBytes: number,
): Promise<unknown> {
  assertContentLengthWithin(request, maxBytes);

  const raw = await request.text();

  if (raw.length > maxBytes) {
    throw new BodyTooLargeError(maxBytes);
  }

  if (!raw.trim()) {
    throw new Error("Request body is required.");
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new Error("Invalid request body.");
  }
}

export class BodyTooLargeError extends Error {
  readonly maxBytes: number;

  constructor(maxBytes: number) {
    super(`Request body exceeds ${maxBytes} bytes.`);
    this.name = "BodyTooLargeError";
    this.maxBytes = maxBytes;
  }
}

export function assertCustomerMessageLength(message: string): string {
  const trimmed = message.trim();

  if (!trimmed) {
    throw new Error("customerMessage is required.");
  }

  if (trimmed.length > MAX_CUSTOMER_MESSAGE_LENGTH) {
    throw new Error(
      `customerMessage must be at most ${MAX_CUSTOMER_MESSAGE_LENGTH} characters.`,
    );
  }

  return trimmed;
}

export function sanitizeConversationHistory(
  history: unknown,
): ConversationMessage[] | undefined {
  if (history === undefined || history === null) {
    return undefined;
  }

  if (!Array.isArray(history)) {
    throw new Error("conversationHistory must be an array.");
  }

  if (history.length > MAX_CONVERSATION_HISTORY_MESSAGES) {
    throw new Error(
      `conversationHistory must contain at most ${MAX_CONVERSATION_HISTORY_MESSAGES} messages.`,
    );
  }

  return history.map((entry, index) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new Error(`conversationHistory[${index}] must be an object.`);
    }

    const record = entry as Record<string, unknown>;
    const role = record.role;

    if (role !== "customer" && role !== "director") {
      throw new Error(`conversationHistory[${index}].role is invalid.`);
    }

    if (typeof record.content !== "string") {
      throw new Error(`conversationHistory[${index}].content must be a string.`);
    }

    const content = record.content.trim();

    if (!content) {
      throw new Error(`conversationHistory[${index}].content is required.`);
    }

    if (content.length > MAX_CONVERSATION_MESSAGE_LENGTH) {
      throw new Error(
        `conversationHistory[${index}].content exceeds ${MAX_CONVERSATION_MESSAGE_LENGTH} characters.`,
      );
    }

    const message: ConversationMessage = {
      role,
      content,
    };

    if (
      record.timestamp !== undefined &&
      typeof record.timestamp === "string"
    ) {
      message.timestamp = record.timestamp;
    }

    return message;
  });
}

export function sanitizeProjectContext(
  projectContext: unknown,
): ProjectContext | undefined {
  if (projectContext === undefined || projectContext === null) {
    return undefined;
  }

  if (typeof projectContext !== "object" || Array.isArray(projectContext)) {
    throw new Error("projectContext must be an object.");
  }

  const record = projectContext as Record<string, unknown>;
  const next: ProjectContext = {};

  if (record.currentImage !== undefined && record.currentImage !== null) {
    if (typeof record.currentImage !== "object" || Array.isArray(record.currentImage)) {
      throw new Error("projectContext.currentImage must be an object.");
    }

    const image = record.currentImage as Record<string, unknown>;
    next.currentImage = {};

    if (typeof image.url === "string" && image.url.trim()) {
      next.currentImage.url = image.url.trim().slice(0, 2_048);
    }

    if (typeof image.description === "string" && image.description.trim()) {
      next.currentImage.description = image.description
        .trim()
        .slice(0, MAX_CONVERSATION_MESSAGE_LENGTH);
    }
  }

  if (
    typeof record.sourcePhotoCount === "number" &&
    Number.isFinite(record.sourcePhotoCount) &&
    record.sourcePhotoCount > 0
  ) {
    next.sourcePhotoCount = Math.min(
      MAX_BATCH_SOURCE_FILES,
      Math.floor(record.sourcePhotoCount),
    );
  }

  if (
    typeof record.currentCommercialDescription === "string" &&
    record.currentCommercialDescription.trim()
  ) {
    next.currentCommercialDescription = record.currentCommercialDescription
      .trim()
      .slice(0, MAX_CUSTOMER_MESSAGE_LENGTH);
  }

  if (record.destination !== undefined && record.destination !== null) {
    if (typeof record.destination !== "object" || Array.isArray(record.destination)) {
      throw new Error("projectContext.destination must be an object.");
    }

    const destination = record.destination as Record<string, unknown>;
    next.destination = {};

    for (const key of ["platform", "aspectRatio"] as const) {
      if (typeof destination[key] === "string" && destination[key]) {
        next.destination[key] = (destination[key] as string).trim().slice(0, 120);
      }
    }

    for (const key of ["width", "height"] as const) {
      if (typeof destination[key] === "number" && Number.isFinite(destination[key])) {
        next.destination[key] = destination[key] as number;
      }
    }
  }

  if (typeof record.workflow === "string" && record.workflow.trim()) {
    next.workflow = record.workflow.trim().slice(0, 120);
  }

  if (record.previousPreview !== undefined && record.previousPreview !== null) {
    if (
      typeof record.previousPreview !== "object" ||
      Array.isArray(record.previousPreview)
    ) {
      throw new Error("projectContext.previousPreview must be an object.");
    }

    const preview = record.previousPreview as Record<string, unknown>;
    next.previousPreview = {};

    if (typeof preview.url === "string" && preview.url.trim()) {
      next.previousPreview.url = preview.url.trim().slice(0, 2_048);
    }

    if (typeof preview.description === "string" && preview.description.trim()) {
      next.previousPreview.description = preview.description
        .trim()
        .slice(0, MAX_CONVERSATION_MESSAGE_LENGTH);
    }
  }

  if (record.conversationHistory !== undefined) {
    next.conversationHistory = sanitizeConversationHistory(
      record.conversationHistory,
    );
  }

  return next;
}

export function projectContextHasImage(context: ProjectContext | undefined): boolean {
  const image = context?.currentImage;
  return Boolean(image?.url?.trim() || image?.description?.trim());
}
