import type { StudioDestination } from "@/lib/studio-destination";
import {
  parseCommercialProductionProfile,
  type CommercialProductionProfile,
  type PromotionalOverlays,
} from "@/lib/commercial-production-profile";
import { parsePromotionalOverlays, requiresMetapromWatermark } from "@/lib/promotional-overlay-contract";
import { parseOverlayStyle, type OverlayStyle } from "@/lib/overlay-style-contract";
import {
  assertRequiredNarrativeBeatsInPrompt,
  parseRequiredNarrativeBeats,
  type RequiredNarrativeBeats,
} from "@/lib/narrative-beats-contract";

export const CREATIVE_RECIPE_SCHEMA_VERSION = 1 as const;
export const PROMPT_BUILDER_VERSION = "studio-prompts-v1.8";
export const VIDEO_PROCESSING_VERSION = "commercial-video-processing-v8";

export const CANONICAL_LOGO_SOURCE = {
  kind: "bundled_brand_asset",
  path: "public/brand/metaprom-logo-light.png",
  sha256: "3cfb0c8caeb79f9f23f1407a90e577e3c94f6025e07bc9f8a5376da5b681b2d2",
} as const;

export type ExactLogoSource = {
  kind: "bundled_brand_asset";
  path: string;
  sha256: string;
};

export type PremiumProcessingManifest = {
  processing_version: string;
  overlays_required: boolean;
  overlays_applied: boolean;
  processed: boolean;
  raw_artifact: { kind: "veo_raw"; stored: false; sha256: string };
  final_artifact: { kind: "composed_premium" | "transcoded_premium"; path: string; sha256: string };
};

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
  /** Reserved for deterministic composition. Never rendered by generative providers. */
  promotional_overlays?: PromotionalOverlays | null;
  production_profile?: CommercialProductionProfile | null;
  required_narrative_beats?: RequiredNarrativeBeats | null;
  /** Final resolved closed style, including the winning user/brand/director origin. */
  overlay_style?: OverlayStyle | null;
  /** @deprecated Legacy name for the canonical Metaprom watermark source. */
  exact_logo_source?: ExactLogoSource | null;
  /** Immutable canonical Metaprom artwork reference. Never a customer logo. */
  metaprom_watermark_source?: ExactLogoSource | null;
  premium_processing_manifest?: PremiumProcessingManifest | null;
};

export function buildCreativeRecipeV1(
  input: Omit<CreativeRecipeV1, "schema_version" | "frozen_at"> & {
    frozenAt?: string;
  },
): CreativeRecipeV1 {
  const { frozenAt, ...recipe } = input;
  const promotionalOverlays = parsePromotionalOverlays(recipe.promotional_overlays);
  const productionProfile = recipe.production_profile == null
    ? null
    : parseCommercialProductionProfile(recipe.production_profile);
  const overlayStyle = recipe.overlay_style == null ? null : parseOverlayStyle(recipe.overlay_style);
  const requiredNarrativeBeats = recipe.required_narrative_beats == null
    ? null
    : parseRequiredNarrativeBeats(recipe.required_narrative_beats);
  assertRequiredNarrativeBeatsInPrompt(recipe.premium_prompt, requiredNarrativeBeats);
  const candidate: CreativeRecipeV1 = {
    ...recipe,
    promotional_overlays: promotionalOverlays,
    production_profile: productionProfile,
    overlay_style: overlayStyle,
    required_narrative_beats: requiredNarrativeBeats,
    schema_version: CREATIVE_RECIPE_SCHEMA_VERSION,
    frozen_at: frozenAt ?? new Date().toISOString(),
  };
  const parsed = parseCreativeRecipeV1(candidate);
  if (!parsed) throw new Error("Creative recipe failed strict validation.");
  return parsed;
}

export function isCreativeRecipeV1(value: unknown): value is CreativeRecipeV1 {
  return parseCreativeRecipeV1(value) !== null;
}

function isCanonicalMetapromSource(value: unknown): value is ExactLogoSource {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const source = value as Record<string, unknown>;
  return Object.keys(source).length === 3 &&
    source.kind === CANONICAL_LOGO_SOURCE.kind && source.path === CANONICAL_LOGO_SOURCE.path &&
    source.sha256 === CANONICAL_LOGO_SOURCE.sha256;
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function parsePremiumProcessingManifest(value: unknown): PremiumProcessingManifest | null {
  if (value == null) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid Premium processing manifest.");
  const manifest = value as Record<string, unknown>;
  const raw = manifest.raw_artifact as Record<string, unknown> | undefined;
  const final = manifest.final_artifact as Record<string, unknown> | undefined;
  if (manifest.processing_version !== VIDEO_PROCESSING_VERSION ||
      typeof manifest.overlays_required !== "boolean" ||
      typeof manifest.overlays_applied !== "boolean" ||
      manifest.processed !== true ||
      !raw || raw.kind !== "veo_raw" || raw.stored !== false || !isSha256(raw.sha256) ||
      !final || (final.kind !== "composed_premium" && final.kind !== "transcoded_premium") ||
      typeof final.path !== "string" || !final.path || !isSha256(final.sha256) ||
      (manifest.overlays_required === true && (manifest.overlays_applied !== true || final.kind !== "composed_premium"))) {
    throw new Error("Invalid Premium processing manifest.");
  }
  return value as PremiumProcessingManifest;
}

export function parseCreativeRecipeV1(value: unknown): CreativeRecipeV1 | null {
  if (!value || typeof value !== "object") return null;
  const recipe = value as Partial<CreativeRecipeV1>;
  const baseValid = (
    recipe.schema_version === CREATIVE_RECIPE_SCHEMA_VERSION &&
    typeof recipe.reference_image_path === "string" &&
    Boolean(recipe.reference_image_path) &&
    typeof recipe.premium_prompt === "string" &&
    Boolean(recipe.premium_prompt) &&
    typeof recipe.preview_path === "string" &&
    Boolean(recipe.preview_path) &&
    typeof recipe.generation?.premium_video?.model === "string"
  );
  if (!baseValid) return null;
  try {
    const overlays = parsePromotionalOverlays(recipe.promotional_overlays);
    const productionProfile = recipe.production_profile == null
      ? null
      : parseCommercialProductionProfile(recipe.production_profile);
    const overlayStyle = recipe.overlay_style == null ? null : parseOverlayStyle(recipe.overlay_style);
    const requiredNarrativeBeats = recipe.required_narrative_beats == null
      ? null
      : parseRequiredNarrativeBeats(recipe.required_narrative_beats);
    assertRequiredNarrativeBeatsInPrompt(recipe.premium_prompt!, requiredNarrativeBeats);
    const premiumProcessingManifest = parsePremiumProcessingManifest(recipe.premium_processing_manifest);
    const currentSource = recipe.metaprom_watermark_source;
    const legacySource = recipe.exact_logo_source;
    if (currentSource != null && !isCanonicalMetapromSource(currentSource)) return null;
    if (legacySource != null && !isCanonicalMetapromSource(legacySource)) return null;
    const watermarkSource = currentSource ?? legacySource ?? null;
    if (requiresMetapromWatermark(overlays) && !watermarkSource) return null;
    return {
      ...(recipe as CreativeRecipeV1),
      promotional_overlays: overlays,
      production_profile: productionProfile,
      overlay_style: overlayStyle,
      required_narrative_beats: requiredNarrativeBeats,
      premium_processing_manifest: premiumProcessingManifest,
      metaprom_watermark_source: watermarkSource,
    };
  } catch {
    return null;
  }
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
