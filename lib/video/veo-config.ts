/**
 * Official Veo 3.1 clip lengths per Vertex AI model documentation:
 * https://cloud.google.com/vertex-ai/generative-ai/docs/models/veo/3-1-generate
 */
export const VEO_OFFICIAL_DURATION_SECONDS = [4, 6, 8] as const;

export type VeoOfficialDurationSeconds =
  (typeof VEO_OFFICIAL_DURATION_SECONDS)[number];

export const VEO_MAX_DURATION_SECONDS: VeoOfficialDurationSeconds = Math.max(
  ...VEO_OFFICIAL_DURATION_SECONDS,
) as VeoOfficialDurationSeconds;

/** Premium requests the longest officially supported Veo clip length. */
export function resolvePremiumVeoDurationSeconds(): VeoOfficialDurationSeconds {
  return VEO_MAX_DURATION_SECONDS;
}
