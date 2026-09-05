/**
 * Validate GenerationRequestV2 before job create.
 */

import type { Mode } from "../prompts";
import type { GenerationRequestV2, OwnershipContext } from "./types";
import { GENERATION_V2_CREATION_MODE } from "./types";
import { GenerationProviderError } from "./failures";

const MODES: ReadonlySet<Mode> = new Set([
  "amazon",
  "mercado-libre",
  "premium",
  "social",
  "custom",
  "enhancement",
]);

function assertNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new GenerationProviderError(
      "invalid_input",
      `Invalid ${field}`,
      `${field} must be a non-empty string`,
    );
  }
  return value.trim();
}

function parseOwnership(raw: unknown): OwnershipContext {
  if (!raw || typeof raw !== "object") {
    throw new GenerationProviderError(
      "invalid_input",
      "Invalid ownershipContext",
    );
  }
  const ctx = raw as Record<string, unknown>;
  if (ctx.kind === "authenticated") {
    return {
      kind: "authenticated",
      userId: assertNonEmptyString(ctx.userId, "ownershipContext.userId"),
    };
  }
  if (ctx.kind === "anonymous") {
    return {
      kind: "anonymous",
      sessionId: assertNonEmptyString(
        ctx.sessionId,
        "ownershipContext.sessionId",
      ),
    };
  }
  throw new GenerationProviderError(
    "invalid_input",
    "Invalid ownershipContext.kind",
  );
}

export function validateGenerationRequestV2(
  raw: unknown,
): GenerationRequestV2 {
  if (!raw || typeof raw !== "object") {
    throw new GenerationProviderError("invalid_input", "Request body required");
  }

  const body = raw as Record<string, unknown>;
  const idempotencyKey = assertNonEmptyString(
    body.idempotencyKey,
    "idempotencyKey",
  );
  const sourceImageRef = assertNonEmptyString(
    body.sourceImageRef,
    "sourceImageRef",
  );
  const customerIntent = assertNonEmptyString(
    body.customerIntent,
    "customerIntent",
  );

  const vgiRaw = body.visualGenerationIntent;
  if (!vgiRaw || typeof vgiRaw !== "object") {
    throw new GenerationProviderError(
      "invalid_input",
      "visualGenerationIntent required",
    );
  }
  const vgi = vgiRaw as Record<string, unknown>;
  const visualEvents = assertNonEmptyString(
    vgi.visualEvents,
    "visualGenerationIntent.visualEvents",
  );

  if (body.creationMode !== GENERATION_V2_CREATION_MODE) {
    throw new GenerationProviderError(
      "invalid_input",
      "creationMode must be commercial",
    );
  }

  const destination = body.destination;
  if (!destination || typeof destination !== "object") {
    throw new GenerationProviderError("invalid_input", "destination required");
  }
  const dest = destination as Record<string, unknown>;
  const platform = assertNonEmptyString(dest.platform, "destination.platform");
  const aspectRatio = assertNonEmptyString(
    dest.aspectRatio,
    "destination.aspectRatio",
  );

  const productMode = body.productMode;
  if (typeof productMode !== "string" || !MODES.has(productMode as Mode)) {
    throw new GenerationProviderError("invalid_input", "Invalid productMode");
  }

  return {
    idempotencyKey,
    sourceImageRef,
    customerIntent,
    visualGenerationIntent: {
      visualEvents,
      spokenCopy:
        typeof vgi.spokenCopy === "string" ? vgi.spokenCopy : null,
    },
    creationMode: GENERATION_V2_CREATION_MODE,
    destination: {
      platform,
      aspectRatio,
      width: typeof dest.width === "number" ? dest.width : undefined,
      height: typeof dest.height === "number" ? dest.height : undefined,
    },
    productMode: productMode as Mode,
    ownershipContext: parseOwnership(body.ownershipContext),
    productionProfile:
      body.productionProfile && typeof body.productionProfile === "object"
        ? (body.productionProfile as Record<string, unknown>)
        : null,
    promotionalOverlays:
      body.promotionalOverlays && typeof body.promotionalOverlays === "object"
        ? (body.promotionalOverlays as Record<string, unknown>)
        : null,
    overlayStyle:
      typeof body.overlayStyle === "string" ? body.overlayStyle : null,
    requiredNarrativeBeats: Array.isArray(body.requiredNarrativeBeats)
      ? body.requiredNarrativeBeats.filter(
          (b): b is string => typeof b === "string",
        )
      : null,
    workflowId: typeof body.workflowId === "string" ? body.workflowId : null,
    industry: typeof body.industry === "string" ? body.industry : null,
  };
}
