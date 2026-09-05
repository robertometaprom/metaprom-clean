/**
 * Phase 1B Preview-only test controls.
 *
 * Enabled only when GENERATION_V2_PHASE1B=1 (Preview).
 * Never enables paid providers. Scenario lives on the job request so
 * durable Workflow steps can reconstruct fake providers without process memory.
 */

import type { FakeProviderScenario } from "./providers/fake";
import type { GenerationRequestV2 } from "./types";

export const PHASE1B_PROFILE_KEY = "__generationV2Phase1b" as const;

export type Phase1bTestControls = {
  scenario: FakeProviderScenario;
  failTimesBeforeSuccess: number;
  delayMs: number;
};

const SCENARIOS: ReadonlySet<string> = new Set([
  "success",
  "image_fail_retryable",
  "image_fail_terminal",
  "image_timeout",
  "video_fail_retryable",
  "video_fail_terminal",
  "video_timeout",
  "video_malformed",
  "video_empty",
  "storage_fail",
  "db_fail",
  "persist_inconsistency",
]);

export function isPhase1bEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const v = env.GENERATION_V2_PHASE1B?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function parsePhase1bControls(
  raw: unknown,
): Phase1bTestControls | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as Record<string, unknown>;
  const scenarioRaw =
    typeof body.scenario === "string" ? body.scenario.trim() : "success";
  if (!SCENARIOS.has(scenarioRaw)) return null;

  const failTimes =
    typeof body.failTimesBeforeSuccess === "number" &&
    Number.isFinite(body.failTimesBeforeSuccess)
      ? Math.max(0, Math.floor(body.failTimesBeforeSuccess))
      : 2;
  const delayMs =
    typeof body.delayMs === "number" && Number.isFinite(body.delayMs)
      ? Math.max(0, Math.floor(body.delayMs))
      : 0;

  return {
    scenario: scenarioRaw as FakeProviderScenario,
    failTimesBeforeSuccess: failTimes,
    delayMs,
  };
}

export function readPhase1bControls(
  request: GenerationRequestV2,
): Phase1bTestControls | null {
  const profile = request.productionProfile;
  if (!profile || typeof profile !== "object") return null;
  return parsePhase1bControls(profile[PHASE1B_PROFILE_KEY]);
}

export function attachPhase1bControls(
  request: GenerationRequestV2,
  controls: Phase1bTestControls,
): GenerationRequestV2 {
  return {
    ...request,
    productionProfile: {
      ...(request.productionProfile ?? {}),
      [PHASE1B_PROFILE_KEY]: controls,
    },
  };
}

/** Hard gate: Generation V2 Phase 1B never wires paid providers. */
export function assertFakeOnlyProviders(
  env: NodeJS.ProcessEnv = process.env,
): void {
  const provider = env.GENERATION_V2_PROVIDER?.trim().toLowerCase();
  if (
    provider &&
    provider !== "fake" &&
    provider !== "none" &&
    provider !== ""
  ) {
    throw new Error(
      `GENERATION_V2_PROVIDER=${provider} forbidden; Phase 1B is fake-only`,
    );
  }
}
