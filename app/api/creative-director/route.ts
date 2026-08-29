import { mapCreationError } from "@/lib/creation-errors";
import {
  createCreativeProposal,
  CreativeDirectorError,
} from "@/lib/creative-director";
import { recordDirectorHttp200 } from "@/lib/creative-director/diagnostics";
import type { CreateCreativeProposalInput } from "@/lib/creative-director";
import { createClient } from "@/lib/supabase/server";
import {
  buildPostGenerationAnonymousGuard,
  evaluateAnonymousDirectorGuard,
} from "@/lib/security/anonymous-director";
import {
  ANON_DIRECTOR_RATE_LIMIT,
  AUTH_DIRECTOR_RATE_LIMIT,
  DIRECTOR_SESSION_MAX_USER_INTERACTIONS,
  MAX_JSON_BODY_BYTES,
} from "@/lib/security/limits";
import { enforceSoftCostControl } from "@/lib/security/cost-control";
import {
  assertCustomerMessageLength,
  BodyTooLargeError,
  readJsonBodyWithLimit,
  sanitizeProjectContext,
} from "@/lib/security/validation";
import {
  countDirectorUserInteractions,
  DIRECTOR_SESSION_LIMIT_CODE,
  getDirectorSessionCopy,
} from "@/lib/studio/director-session";

export const runtime = "nodejs";
export const maxDuration = 300;

function jsonError(message: string, status: number, code?: string) {
  return Response.json(code ? { error: message, code } : { error: message }, {
    status,
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRequestBody(
  body: unknown,
):
  | { ok: true; input: CreateCreativeProposalInput }
  | { ok: false; error: string; status?: number } {
  if (!isPlainObject(body)) {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const { customerMessage, projectContext } = body;

  if (customerMessage === undefined || customerMessage === null) {
    return { ok: false, error: "customerMessage is required." };
  }

  if (typeof customerMessage !== "string") {
    return { ok: false, error: "customerMessage must be a string." };
  }

  try {
    const sanitizedMessage = assertCustomerMessageLength(customerMessage);
    const sanitizedContext = sanitizeProjectContext(projectContext);

    return {
      ok: true,
      input: {
        customerMessage: sanitizedMessage,
        projectContext: sanitizedContext,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Invalid request body.",
      status: 400,
    };
  }
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthenticated = Boolean(user);

  let body: unknown;

  try {
    body = await readJsonBodyWithLimit(req, MAX_JSON_BODY_BYTES);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid request body.";
    const status = error instanceof BodyTooLargeError ? 413 : 400;
    return jsonError(message, status);
  }

  const parsed = parseRequestBody(body);

  if (!parsed.ok) {
    return jsonError(parsed.error, parsed.status ?? 400);
  }

  const userInteractions = countDirectorUserInteractions(
    parsed.input.projectContext?.conversationHistory ?? [],
  );

  if (userInteractions >= DIRECTOR_SESSION_MAX_USER_INTERACTIONS) {
    const copy = getDirectorSessionCopy("es");
    return jsonError(
      `${copy.limitTitle} ${copy.limitBody} ${copy.newSessionContext}`,
      400,
      DIRECTOR_SESSION_LIMIT_CODE,
    );
  }

  const preGuard = evaluateAnonymousDirectorGuard({
    isAuthenticated,
    projectContext: parsed.input.projectContext,
  });

  if (preGuard.action === "respond") {
    return Response.json({
      ...preGuard.response,
      requiresRegistration: preGuard.requiresRegistration,
    });
  }

  const rateLimited = await enforceSoftCostControl({
    request: req,
    userId: user?.id ?? null,
    endpointClass: "director",
    limit: isAuthenticated ? AUTH_DIRECTOR_RATE_LIMIT : ANON_DIRECTOR_RATE_LIMIT,
    kind: isAuthenticated ? "director-auth" : "director-anon",
  });
  if (rateLimited) return rateLimited;

  try {
    const response = await createCreativeProposal(parsed.input, {
      anonymousMode: preGuard.anonymousMode,
    });

    const postGuard = buildPostGenerationAnonymousGuard({
      isAuthenticated,
      anonymousMode: preGuard.anonymousMode,
      response,
      projectContext: parsed.input.projectContext,
    });

    if (postGuard?.action === "respond") {
      recordDirectorHttp200({
        proposalPresent: Boolean(postGuard.response.proposal),
        needsClarification: postGuard.response.needsClarification === true,
        anonymousMode: preGuard.anonymousMode,
        postGuardReplaced: true,
      });
      return Response.json({
        ...postGuard.response,
        requiresRegistration: postGuard.requiresRegistration,
      });
    }

    recordDirectorHttp200({
      proposalPresent: Boolean(response.proposal),
      needsClarification: response.needsClarification === true,
      anonymousMode: preGuard.anonymousMode,
      postGuardReplaced: false,
    });
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
