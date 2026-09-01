import { parseClosedCommercialProposal } from "../creative-director/proposal-contract";
import type { CommercialProposal } from "../creative-director/types";

export const DIRECTOR_V2_DRY_RUN_QUERY_PARAM = "directorV2DryRun";
export const DIRECTOR_V2_DRY_RUN_QUERY_VALUE = "1";

export const CREATIVE_DIRECTOR_V1_API_PATH = "/api/creative-director";
export const CREATIVE_DIRECTOR_V2_API_PATH = "/api/creative-director-v2";

export const DIRECTOR_V2_DRY_RUN_VALID_MESSAGE = "V2 propuesta válida";
export const DIRECTOR_V2_DRY_RUN_INVALID_MESSAGE = "V2 propuesta inválida";

export function isDirectorV2DryRunSearchParam(
  params: URLSearchParams | string,
): boolean {
  const searchParams =
    typeof params === "string" ? new URLSearchParams(params) : params;
  return (
    searchParams.get(DIRECTOR_V2_DRY_RUN_QUERY_PARAM) ===
    DIRECTOR_V2_DRY_RUN_QUERY_VALUE
  );
}

export function readDirectorV2DryRunFromLocation(): boolean {
  if (typeof window === "undefined") return false;
  return isDirectorV2DryRunSearchParam(window.location.search);
}

export function resolveCreativeDirectorApiPath(directorV2DryRun: boolean): string {
  return directorV2DryRun
    ? CREATIVE_DIRECTOR_V2_API_PATH
    : CREATIVE_DIRECTOR_V1_API_PATH;
}

export function validateDirectorV2DryRunProposal(
  proposal: CommercialProposal,
): { valid: boolean; message: string } {
  const parsed = parseClosedCommercialProposal(proposal);
  if ("proposal" in parsed) {
    return { valid: true, message: DIRECTOR_V2_DRY_RUN_VALID_MESSAGE };
  }
  return { valid: false, message: DIRECTOR_V2_DRY_RUN_INVALID_MESSAGE };
}
