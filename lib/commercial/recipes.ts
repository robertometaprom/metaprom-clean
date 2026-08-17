/**
 * Commercial recipe registry — Phase 1 skeleton.
 *
 * Exactly one production recipe is registered: `veo_native`.
 * It delegates to the existing commercial video function and does not
 * reimplement Vertex/Veo or post-processing behavior.
 *
 * Not wired into `/api/video` or Premium fulfillment.
 */

import "server-only";

import {
  generateCommercialVideo,
  type GenerateCommercialVideoInput,
  type GenerateCommercialVideoResult,
} from "@/lib/video/generate-commercial-video";

export const VEO_NATIVE_RECIPE_ID = "veo_native" as const;

export type CommercialRecipeId = typeof VEO_NATIVE_RECIPE_ID;

export type CommercialRecipe = {
  readonly id: CommercialRecipeId;
  readonly version: string;
  execute(
    input: GenerateCommercialVideoInput,
  ): Promise<GenerateCommercialVideoResult>;
};

async function executeVeoNative(
  input: GenerateCommercialVideoInput,
): Promise<GenerateCommercialVideoResult> {
  return generateCommercialVideo(input);
}

const veoNativeRecipe: CommercialRecipe = {
  id: VEO_NATIVE_RECIPE_ID,
  version: "1",
  execute: executeVeoNative,
};

const RECIPE_REGISTRY: Record<CommercialRecipeId, CommercialRecipe> = {
  veo_native: veoNativeRecipe,
};

export function listCommercialRecipeIds(): CommercialRecipeId[] {
  return [VEO_NATIVE_RECIPE_ID];
}

export function getCommercialRecipe(
  recipeId: CommercialRecipeId,
): CommercialRecipe {
  return RECIPE_REGISTRY[recipeId];
}
