import { mapCreationError } from "@/lib/creation-errors";
import {
  createCreativeProposal,
  CreativeDirectorError,
} from "@/lib/creative-director";
import type {
  CreateCreativeProposalInput,
  ProjectContext,
} from "@/lib/creative-director";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

type CreativeDirectorRequestBody = {
  customerMessage?: unknown;
  projectContext?: unknown;
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRequestBody(
  body: unknown,
):
  | { ok: true; input: CreateCreativeProposalInput }
  | { ok: false; error: string } {
  if (!isPlainObject(body)) {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const { customerMessage, projectContext } = body as CreativeDirectorRequestBody;

  if (customerMessage === undefined || customerMessage === null) {
    return { ok: false, error: "customerMessage is required." };
  }

  if (typeof customerMessage !== "string") {
    return { ok: false, error: "customerMessage must be a string." };
  }

  if (!customerMessage.trim()) {
    return { ok: false, error: "customerMessage is required." };
  }

  if (projectContext !== undefined && projectContext !== null) {
    if (!isPlainObject(projectContext)) {
      return { ok: false, error: "projectContext must be an object." };
    }
  }

  return {
    ok: true,
    input: {
      customerMessage,
      projectContext: projectContext as ProjectContext | undefined,
    },
  };
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("Authentication required.", 401);
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const parsed = parseRequestBody(body);

  if (!parsed.ok) {
    return jsonError(parsed.error, 400);
  }

  try {
    const response = await createCreativeProposal(parsed.input);
    return Response.json(response);
  } catch (error) {
    console.error("Creative Director route error:", error);

    if (error instanceof CreativeDirectorError) {
      if (error.message === "customerMessage is required.") {
        return jsonError(error.message, 400);
      }

      return jsonError(
        mapCreationError(error.message) ??
          "No pudimos procesar tu solicitud creativa.",
        500,
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Creative Director request failed.";

    return jsonError(
      mapCreationError(message) ??
        "No pudimos procesar tu solicitud creativa.",
      500,
    );
  }
}
