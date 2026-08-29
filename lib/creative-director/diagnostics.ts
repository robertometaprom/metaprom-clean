/**
 * Minimal Director proposal-card observability.
 * Structured Vercel logs only — no customer, prompt, or proposal content.
 */

export const DIRECTOR_DIAG_PREFIX = "[director-diag]";

export type DirectorParseOutcome =
  | "valid_proposal"
  | "missing_proposal"
  | "invalid_proposal"
  | "invalid_json"
  | "missing_message";

export type DirectorValidatorCode =
  | "string_field"
  | "beats"
  | "production_profile"
  | "overlays"
  | "overlay_style"
  | "unknown";

export type DirectorRetryReason =
  | "empty"
  | "invalid_json"
  | "invalid_proposal"
  | "missing_message";

export type DirectorProviderFinal =
  | "returned_with_proposal"
  | "returned_without_proposal"
  | "fallback_invalid_proposal"
  | "thrown";

export type DirectorParseOutcomeEvent = {
  event: "director.parse_outcome";
  outcome: DirectorParseOutcome;
  validatorCode?: DirectorValidatorCode;
};

export type DirectorProviderAttemptEvent = {
  event: "director.provider_attempt";
  attempt: 0 | 1;
  retryReason?: DirectorRetryReason;
};

export type DirectorProviderFinalEvent = {
  event: "director.provider_final";
  final: DirectorProviderFinal;
  attempt: 0 | 1;
};

export type DirectorHttp200Event = {
  event: "director.http_200";
  proposalPresent: boolean;
  needsClarification: boolean;
  anonymousMode: boolean;
  postGuardReplaced: boolean;
};

export type DirectorDiagnosticEvent =
  | DirectorParseOutcomeEvent
  | DirectorProviderAttemptEvent
  | DirectorProviderFinalEvent
  | DirectorHttp200Event;

const PARSE_OUTCOMES = new Set<DirectorParseOutcome>([
  "valid_proposal",
  "missing_proposal",
  "invalid_proposal",
  "invalid_json",
  "missing_message",
]);

const VALIDATOR_CODES = new Set<DirectorValidatorCode>([
  "string_field",
  "beats",
  "production_profile",
  "overlays",
  "overlay_style",
  "unknown",
]);

const RETRY_REASONS = new Set<DirectorRetryReason>([
  "empty",
  "invalid_json",
  "invalid_proposal",
  "missing_message",
]);

const PROVIDER_FINALS = new Set<DirectorProviderFinal>([
  "returned_with_proposal",
  "returned_without_proposal",
  "fallback_invalid_proposal",
  "thrown",
]);

function allowlistDirectorDiagnostic(
  event: DirectorDiagnosticEvent,
): Record<string, unknown> | null {
  switch (event.event) {
    case "director.parse_outcome": {
      if (!PARSE_OUTCOMES.has(event.outcome)) return null;
      const payload: Record<string, unknown> = {
        event: "director.parse_outcome",
        outcome: event.outcome,
      };
      if (event.validatorCode && VALIDATOR_CODES.has(event.validatorCode)) {
        payload.validatorCode = event.validatorCode;
      }
      return payload;
    }
    case "director.provider_attempt": {
      if (event.attempt !== 0 && event.attempt !== 1) return null;
      const payload: Record<string, unknown> = {
        event: "director.provider_attempt",
        attempt: event.attempt,
      };
      if (event.retryReason && RETRY_REASONS.has(event.retryReason)) {
        payload.retryReason = event.retryReason;
      }
      return payload;
    }
    case "director.provider_final": {
      if (!PROVIDER_FINALS.has(event.final)) return null;
      if (event.attempt !== 0 && event.attempt !== 1) return null;
      return {
        event: "director.provider_final",
        final: event.final,
        attempt: event.attempt,
      };
    }
    case "director.http_200":
      return {
        event: "director.http_200",
        proposalPresent: event.proposalPresent === true,
        needsClarification: event.needsClarification === true,
        anonymousMode: event.anonymousMode === true,
        postGuardReplaced: event.postGuardReplaced === true,
      };
    default:
      return null;
  }
}

export function recordDirectorDiagnostic(event: DirectorDiagnosticEvent): void {
  try {
    const payload = allowlistDirectorDiagnostic(event);
    if (!payload) return;
    console.info(`${DIRECTOR_DIAG_PREFIX} ${JSON.stringify(payload)}`);
  } catch {
    // Diagnostics must never affect Director behavior.
  }
}

export function recordDirectorHttp200(fields: {
  proposalPresent: boolean;
  needsClarification: boolean;
  anonymousMode: boolean;
  postGuardReplaced: boolean;
}): void {
  recordDirectorDiagnostic({
    event: "director.http_200",
    proposalPresent: fields.proposalPresent,
    needsClarification: fields.needsClarification,
    anonymousMode: fields.anonymousMode,
    postGuardReplaced: fields.postGuardReplaced,
  });
}

export function classifyDirectorRetryReason(
  error: unknown,
): DirectorRetryReason | undefined {
  if (!error || typeof error !== "object") return undefined;
  const name = "name" in error ? error.name : undefined;
  const message = "message" in error ? error.message : undefined;
  if (name === "InvalidClosedProposalError") return "invalid_proposal";
  if (message === "Creative Director provider returned an empty response.") {
    return "empty";
  }
  if (message === "Creative Director provider returned invalid JSON.") {
    return "invalid_json";
  }
  if (
    message ===
    "Creative Director provider response missing required message field."
  ) {
    return "missing_message";
  }
  return undefined;
}
