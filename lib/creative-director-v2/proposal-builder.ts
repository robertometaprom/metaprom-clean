import type { CommercialProductionProfile } from "../commercial-production-profile";
import type { OverlayStyle } from "../overlay-style-contract";
import { V6_OVERLAY_STYLE } from "../overlay-style-contract";
import type { PromotionalOverlays } from "../commercial-production-profile";
import { parseRequiredNarrativeBeats } from "../narrative-beats-contract";
import type { CommercialProposal, ProjectContext } from "../creative-director/types";
import type { DirectorV2CreativeBrief, DirectorV2PromotionalOverlay } from "./types";

function buildSpokenCopyIntent(spokenCopy: string): string {
  const trimmed = spokenCopy.trim();
  return `Only the designated speaker says the exact phrase once: "${trimmed}". All other visible people remain silent. No other speech, dialogue, chanting, murmuring, vocal reactions, improvised words, or vocalizations. Normal non-vocal music, ambience, and sound effects remain allowed.`;
}

/**
 * Deterministically assembles visualGenerationIntent so every visual beat
 * appears verbatim — satisfying requiredNarrativeBeats ⊆ visualGenerationIntent
 * without asking the model to repeat schema fields.
 */
export function buildVisualGenerationIntent(
  visualEvents: string[],
  spokenCopy?: string,
): string {
  const parts = [...visualEvents];
  if (spokenCopy?.trim()) {
    parts.push(buildSpokenCopyIntent(spokenCopy));
    parts.push(spokenCopy.trim());
  }
  return parts.join(" ");
}

function mergePromotionalOverlays(
  prior: PromotionalOverlays | undefined,
  update: DirectorV2PromotionalOverlay | undefined,
): PromotionalOverlays {
  const merged: PromotionalOverlays = { ...(prior ?? {}) };
  if (!update) return merged;

  const textKeys = [
    "headline",
    "call_to_action",
    "url",
    "phone",
    "price_or_promotion",
  ] as const;
  for (const key of textKeys) {
    const value = update[key];
    if (value !== undefined && value.trim()) {
      merged[key] = value.trim();
    }
  }

  if (update.timing_or_layout) {
    merged.timing_or_layout = update.timing_or_layout;
  }

  return merged;
}

function resolveProductionProfile(
  brief: DirectorV2CreativeBrief,
  projectContext: ProjectContext,
  prior?: CommercialProductionProfile,
): CommercialProductionProfile {
  const hasSourcePhoto =
    typeof projectContext.sourcePhotoCount === "number" &&
    projectContext.sourcePhotoCount > 0;

  const fidelity =
    brief.sourceImageFidelity ??
    (hasSourcePhoto ? "protected" : prior?.fidelity_class) ??
    "flexible";

  if (fidelity === "protected") {
    return {
      fidelity_class: "protected",
      preserve_product_identity: true,
      protected_reasons: prior?.protected_reasons ?? [
        "packaging",
        "label",
        "logo",
        "typography",
      ],
      veo_copy_policy: "deterministic_overlay_only",
    };
  }

  return {
    fidelity_class: "flexible",
    preserve_product_identity: false,
    protected_reasons: [],
    veo_copy_policy: "deterministic_overlay_only",
  };
}

function resolveOverlayStyle(
  brief: DirectorV2CreativeBrief,
  prior?: OverlayStyle,
): OverlayStyle {
  const hints = brief.overlayStyle;
  if (!hints && prior) return prior;
  if (!hints) return { ...V6_OVERLAY_STYLE, origin: "director" };

  return {
    typography_treatment:
      hints.typography_treatment ??
      prior?.typography_treatment ??
      V6_OVERLAY_STYLE.typography_treatment,
    palette_preset:
      hints.palette_preset ?? prior?.palette_preset ?? V6_OVERLAY_STYLE.palette_preset,
    text_alignment:
      hints.text_alignment ?? prior?.text_alignment ?? V6_OVERLAY_STYLE.text_alignment,
    cta_treatment:
      hints.cta_treatment ?? prior?.cta_treatment ?? V6_OVERLAY_STYLE.cta_treatment,
    promotion_treatment:
      hints.promotion_treatment ??
      prior?.promotion_treatment ??
      V6_OVERLAY_STYLE.promotion_treatment,
    origin: hints.origin ?? prior?.origin ?? "director",
  };
}

export function buildCommercialProposalFromBrief(
  brief: DirectorV2CreativeBrief,
  projectContext: ProjectContext,
): CommercialProposal {
  const prior = projectContext.lastCompletedProposal;
  const visualEvents = brief.visualEvents.map((event) => event.trim()).filter(Boolean);
  const requiredNarrativeBeats = parseRequiredNarrativeBeats(visualEvents);
  const visualGenerationIntent = buildVisualGenerationIntent(
    requiredNarrativeBeats,
    brief.spokenCopy,
  );

  return {
    summary: brief.summary.trim(),
    openingHook: brief.openingHook.trim(),
    productHeroMoment: brief.productHeroMoment.trim(),
    emotionalTone: brief.emotionalTone.trim(),
    pacing: brief.pacing.trim(),
    callToAction: brief.callToAction.trim(),
    narrative: brief.narrative.trim(),
    requiredNarrativeBeats,
    visualGenerationIntent,
    productionProfile: resolveProductionProfile(brief, projectContext, prior?.productionProfile),
    promotionalOverlays: mergePromotionalOverlays(
      prior?.promotionalOverlays,
      brief.promotionalOverlay,
    ),
    overlayStyle: resolveOverlayStyle(brief, prior?.overlayStyle),
  };
}
