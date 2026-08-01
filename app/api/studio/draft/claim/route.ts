import { NextResponse } from "next/server";
import { claimStudioDraftServer } from "@/lib/studio-draft/server";
import { createClient } from "@/lib/supabase/server";
import { MAX_JSON_BODY_BYTES } from "@/lib/security/limits";
import { isValidResumeToken, readJsonBodyWithLimit } from "@/lib/security/validation";

export const runtime = "nodejs";
export const maxDuration = 120;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("Authentication required.", 401);
  }

  let body: unknown;

  try {
    body = await readJsonBodyWithLimit(request, MAX_JSON_BODY_BYTES);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid request body.";
    const status = error instanceof Error && error.name === "BodyTooLargeError"
      ? 413
      : 400;
    return jsonError(message, status);
  }

  const token =
    typeof body === "object" &&
    body !== null &&
    "token" in body &&
    typeof (body as { token?: unknown }).token === "string"
      ? (body as { token: string }).token.trim()
      : "";

  if (!token) {
    return jsonError("token is required.", 400);
  }

  if (!isValidResumeToken(token)) {
    return jsonError("Invalid token.", 400);
  }

  try {
    const result = await claimStudioDraftServer(token, user.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/studio/draft/claim failed", error);
    const message =
      error instanceof Error
        ? error.message
        : "No pudimos vincular tu borrador a tu cuenta.";
    return jsonError(message, 500);
  }
}
