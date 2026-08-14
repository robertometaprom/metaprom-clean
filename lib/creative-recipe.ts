import type { StudioDestination } from "@/lib/studio-destination";

export const CREATIVE_RECIPE_SCHEMA_VERSION = 1 as const;
export const PROMPT_BUILDER_VERSION = "studio-prompts-v1";
export const VIDEO_PROCESSING_VERSION = "commercial-video-processing-v1";

export type CreativeRecipeV1 = {
  schema_version: 1;
  frozen_at: string;
  reference_image_path: string;
  customer_intention: string;
  teaser_prompt: string;
  premium_prompt: string;
  destination: StudioDestination | null;
  aspect_ratio: string;
  preview_duration_seconds: number;
  premium_target_duration_seconds: number;
  workflow_id: string | null;
  generation: {
    image: { provider: string; model: string };
    preview_video: { provider: string; model: string; workflow: "preview" };
    premium_video: { provider: string; model: string; workflow: "premium" };
  };
  prompt_builder_version: string;
  video_processing_version: string;
  preview_path: string;
};

export function buildCreativeRecipeV1(
  input: Omit<CreativeRecipeV1, "schema_version" | "frozen_at"> & {
    frozenAt?: string;
  },
): CreativeRecipeV1 {
  const { frozenAt, ...recipe } = input;
  return {
    ...recipe,
    schema_version: CREATIVE_RECIPE_SCHEMA_VERSION,
    frozen_at: frozenAt ?? new Date().toISOString(),
  };
}

export function isCreativeRecipeV1(value: unknown): value is CreativeRecipeV1 {
  if (!value || typeof value !== "object") return false;
  const recipe = value as Partial<CreativeRecipeV1>;
  return (
    recipe.schema_version === CREATIVE_RECIPE_SCHEMA_VERSION &&
    typeof recipe.reference_image_path === "string" &&
    Boolean(recipe.reference_image_path) &&
    typeof recipe.premium_prompt === "string" &&
    Boolean(recipe.premium_prompt) &&
    typeof recipe.preview_path === "string" &&
    Boolean(recipe.preview_path) &&
    typeof recipe.generation?.premium_video?.model === "string"
  );
}

export function isCommercialUnlockEligible(asset: {
  teaser_video_path?: string | null;
  teaser_video_url?: string | null;
  video_url?: string | null;
  premium_video_path?: string | null;
  premium_video_url?: string | null;
  payment_status?: string | null;
}): boolean {
  return Boolean(
    (asset.teaser_video_path || asset.teaser_video_url || asset.video_url) &&
      !asset.premium_video_path &&
      !asset.premium_video_url &&
      asset.payment_status !== "paid",
  );
}
