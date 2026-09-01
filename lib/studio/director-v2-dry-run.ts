import { parseClosedCommercialProposal } from "../creative-director/proposal-contract";
import type { CommercialProposal } from "../creative-director/types";

export const DIRECTOR_V2_DRY_RUN_QUERY_PARAM = "directorV2DryRun";
export const DIRECTOR_V2_DRY_RUN_QUERY_VALUE = "1";

export const DIRECTOR_V2_QUERY_PARAM = "directorV2";
export const DIRECTOR_V2_QUERY_VALUE = "1";

export const CREATIVE_DIRECTOR_V1_API_PATH = "/api/creative-director";
export const CREATIVE_DIRECTOR_V2_API_PATH = "/api/creative-director-v2";

export const DIRECTOR_V2_DRY_RUN_VALID_MESSAGE = "V2 propuesta válida";
export const DIRECTOR_V2_DRY_RUN_INVALID_MESSAGE = "V2 propuesta inválida";

export type DirectorV2Mode = {
  /** Route Director traffic to /api/creative-director-v2. */
  useV2Api: boolean;
  /** Block proposal handoff and show dry-run indicator. */
  dryRun: boolean;
};

function toSearchParams(params: URLSearchParams | string): URLSearchParams {
  return typeof params === "string" ? new URLSearchParams(params) : params;
}

export function isDirectorV2DryRunSearchParam(
  params: URLSearchParams | string,
): boolean {
  const searchParams = toSearchParams(params);
  return (
    searchParams.get(DIRECTOR_V2_DRY_RUN_QUERY_PARAM) ===
    DIRECTOR_V2_DRY_RUN_QUERY_VALUE
  );
}

export function isDirectorV2SearchParam(params: URLSearchParams | string): boolean {
  const searchParams = toSearchParams(params);
  return searchParams.get(DIRECTOR_V2_QUERY_PARAM) === DIRECTOR_V2_QUERY_VALUE;
}

export function resolveDirectorV2Mode(params: URLSearchParams | string): DirectorV2Mode {
  const dryRun = isDirectorV2DryRunSearchParam(params);
  const realV2 = isDirectorV2SearchParam(params);
  return {
    useV2Api: dryRun || realV2,
    dryRun,
  };
}

export function readDirectorV2ModeFromLocation(): DirectorV2Mode {
  if (typeof window === "undefined") {
    return { useV2Api: false, dryRun: false };
  }
  return resolveDirectorV2Mode(window.location.search);
}

/** @deprecated Use readDirectorV2ModeFromLocation().dryRun */
export function readDirectorV2DryRunFromLocation(): boolean {
  return readDirectorV2ModeFromLocation().dryRun;
}

export function resolveCreativeDirectorApiPath(useDirectorV2Api: boolean): string {
  return useDirectorV2Api
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
