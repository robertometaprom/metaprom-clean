import type {
  CommercialProposal,
  CreativeDirectorResponse,
} from "./types";

export const DIRECTOR_REVISION_APPLY_FAILED_MESSAGE =
  "No pude aplicar el cambio de forma segura en la propuesta. Vuelve a enviar la corrección para actualizarla. No usaré la versión anterior como si ya estuviera corregida.";

export const DIRECTOR_REVISION_RETRY_ACTION = "Reintentar corrección";

export const DIRECTOR_REVISION_RETRY_INSTRUCTION =
  "A completed proposal already exists. Return the full updated valid proposal with the customer's correction applied.";

export type DirectorRevisionOutcome = "applied" | "clarification" | "failed";

export function hasCompletedProposal(
  proposal: CommercialProposal | null | undefined,
): boolean {
  return Boolean(proposal?.narrative?.trim());
}

export function resolveDirectorRevisionOutcome(input: {
  lastCompletedProposal?: CommercialProposal | null;
  response: Pick<
    CreativeDirectorResponse,
    "proposal" | "needsClarification" | "revisionApplyFailed"
  >;
}): DirectorRevisionOutcome | null {
  if (!hasCompletedProposal(input.lastCompletedProposal)) {
    return null;
  }

  if (input.response.needsClarification) return "clarification";
  if (input.response.proposal) return "applied";
  return "failed";
}

/**
 * After a completed proposal, every customer revision must be A, B, or C.
 * Never attach a prior proposal as though it already contains the correction.
 */
export function resolveDirectorRevisionResponse(input: {
  lastCompletedProposal?: CommercialProposal | null;
  response: CreativeDirectorResponse;
}): CreativeDirectorResponse {
  const outcome = resolveDirectorRevisionOutcome(input);
  if (outcome === null) {
    return input.response;
  }

  if (outcome === "clarification") {
    const { proposal: _dropped, revisionApplyFailed: _failed, ...rest } =
      input.response;
    return {
      ...rest,
      needsClarification: true,
    };
  }

  if (outcome === "applied") {
    const { revisionApplyFailed: _failed, ...rest } = input.response;
    return rest;
  }

  return {
    message: DIRECTOR_REVISION_APPLY_FAILED_MESSAGE,
    needsClarification: false,
    revisionApplyFailed: true,
  };
}

export function directorTurnBlocksProposalActions(message: {
  needsClarification?: boolean;
  revisionApplyFailed?: boolean;
} | null | undefined): boolean {
  return Boolean(message?.needsClarification || message?.revisionApplyFailed);
}
