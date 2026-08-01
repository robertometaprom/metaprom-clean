import { NextResponse } from "next/server";
import {
  getStudioDraftServer,
  saveStudioDraftServer,
} from "@/lib/studio-draft/server";
import type { StudioDraftPayload } from "@/lib/studio-draft/types";
import {
  ALLOWED_DRAFT_IMAGE_TYPES,
  ALLOWED_DRAFT_TEASER_TYPES,
  ANON_DRAFT_READ_RATE_LIMIT,
  ANON_DRAFT_SAVE_RATE_LIMIT,
  MAX_DRAFT_FORM_BYTES,
  MAX_ENHANCED_FILE_BYTES,
  MAX_ORIGINAL_FILE_BYTES,
  MAX_TEASER_FILE_BYTES,
} from "@/lib/security/limits";
import {
  assertValidResumeToken,
  isValidResumeToken,
  sanitizeConversationHistory,
} from "@/lib/security/validation";
import {
  buildRateLimitKey,
  checkRateLimit,
} from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function enforceRateLimit(
  request: Request,
  scope: string,
  limit: number,
): NextResponse | null {
  const result = checkRateLimit(buildRateLimitKey(scope, request), limit);

  if (!result.allowed) {
    return jsonError(
      "Demasiadas solicitudes. Espera un momento e intenta de nuevo.",
      429,
    );
  }

  return null;
}

function parsePayload(value: FormDataEntryValue | null): StudioDraftPayload {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Invalid draft payload.");
  }

  if (value.length > 256 * 1024) {
    throw new Error("Draft payload is too large.");
  }

  const parsed = JSON.parse(value) as StudioDraftPayload;

  if (parsed.resumeToken?.trim()) {
    parsed.resumeToken = assertValidResumeToken(
      parsed.resumeToken,
      "resumeToken",
    );
  }

  sanitizeConversationHistory(parsed.conversationHistory ?? []);

  return parsed;
}

function validateDraftFile(
  file: File,
  allowedTypes: Set<string>,
  maxBytes: number,
  label: string,
): void {
  if (file.size > maxBytes) {
    throw new Error(`${label} exceeds the maximum allowed size.`);
  }

  const contentType = file.type || "application/octet-stream";

  if (!allowedTypes.has(contentType)) {
    throw new Error(`${label} has an unsupported file type.`);
  }
}

export async function GET(request: Request) {
  const rateLimited = enforceRateLimit(
    request,
    "studio-draft-read",
    ANON_DRAFT_READ_RATE_LIMIT,
  );

  if (rateLimited) return rateLimited;

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token")?.trim();

  if (!token) {
    return jsonError("token is required.", 400);
  }

  if (!isValidResumeToken(token)) {
    return jsonError("Invalid token.", 400);
  }

  try {
    const draft = await getStudioDraftServer(token);

    if (!draft) {
      return jsonError("Draft not found or expired.", 404);
    }

    return NextResponse.json(draft);
  } catch (error) {
    console.error("GET /api/studio/draft failed", error);
    return jsonError("No pudimos recuperar tu borrador.", 500);
  }
}

export async function POST(request: Request) {
  const rateLimited = enforceRateLimit(
    request,
    "studio-draft-save",
    ANON_DRAFT_SAVE_RATE_LIMIT,
  );

  if (rateLimited) return rateLimited;

  const contentLength = request.headers.get("content-length");

  if (contentLength) {
    const length = Number.parseInt(contentLength, 10);

    if (Number.isFinite(length) && length > MAX_DRAFT_FORM_BYTES) {
      return jsonError("Request body is too large.", 413);
    }
  }

  try {
    const formData = await request.formData();
    const payload = parsePayload(formData.get("payload"));
    const originalFile = formData.get("original");
    const enhancedFile = formData.get("enhanced");
    const teaserFile = formData.get("teaser");

    if (originalFile instanceof File) {
      validateDraftFile(
        originalFile,
        ALLOWED_DRAFT_IMAGE_TYPES,
        MAX_ORIGINAL_FILE_BYTES,
        "Original image",
      );
    }

    if (enhancedFile instanceof File) {
      validateDraftFile(
        enhancedFile,
        ALLOWED_DRAFT_IMAGE_TYPES,
        MAX_ENHANCED_FILE_BYTES,
        "Enhanced image",
      );
    }

    if (teaserFile instanceof File) {
      validateDraftFile(
        teaserFile,
        ALLOWED_DRAFT_TEASER_TYPES,
        MAX_TEASER_FILE_BYTES,
        "Teaser video",
      );
    }

    const result = await saveStudioDraftServer({
      payload,
      originalFile: originalFile instanceof File ? originalFile : null,
      enhancedBuffer:
        enhancedFile instanceof File
          ? Buffer.from(await enhancedFile.arrayBuffer())
          : null,
      enhancedContentType:
        enhancedFile instanceof File
          ? enhancedFile.type || "image/png"
          : undefined,
      teaserBuffer:
        teaserFile instanceof File
          ? Buffer.from(await teaserFile.arrayBuffer())
          : null,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/studio/draft failed", error);
    const message =
      error instanceof Error
        ? error.message
        : "No pudimos guardar tu borrador.";
    const status = /too large|unsupported file type/i.test(message) ? 413 : 500;
    return jsonError(message, status);
  }
}
