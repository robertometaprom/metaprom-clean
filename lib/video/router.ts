/**
 * Production router — Phase 1 skeleton.
 *
 * Always resolves to `veo_native`. No heuristics, cost routing, locale
 * routing, quota routing, fallback, environment routing, feature flags,
 * or Kling eligibility.
 *
 * Architectural scaffolding only. Not wired into `/api/video` or
 * Premium fulfillment.
 */

import "server-only";

import { VEO_NATIVE_RECIPE_ID } from "@/lib/commercial/recipes";
import type { ProductionBrief } from "@/lib/commercial/production-brief";

export type ProductionRouterInput = {
  brief?: ProductionBrief;
};

export type ProductionRoute = {
  recipeId: typeof VEO_NATIVE_RECIPE_ID;
};

export function resolveProductionRecipe(
  _input?: ProductionRouterInput,
): ProductionRoute {
  return { recipeId: VEO_NATIVE_RECIPE_ID };
}
