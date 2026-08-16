import {
  buildNarrativeBeatsPromptBlock,
  type RequiredNarrativeBeats,
} from "./narrative-beats-contract";

export const PROTECTED_REASON_VALUES = [
  "packaging",
  "label",
  "logo",
  "typography",
  "identity_critical_shape",
] as const;

export type ProtectedReason = (typeof PROTECTED_REASON_VALUES)[number];

export type CommercialProductionProfile = {
  fidelity_class: "protected" | "flexible";
  preserve_product_identity: boolean;
  protected_reasons: ProtectedReason[];
  veo_copy_policy: "deterministic_overlay_only";
};

export const PROMOTIONAL_OVERLAY_TIMING_OR_LAYOUT_VALUES = [
  "standard_full",
  "top_full",
  "bottom_full",
  "standard_intro",
  "top_intro",
  "bottom_intro",
  "standard_outro",
  "top_outro",
  "bottom_outro",
] as const;

export type PromotionalOverlayTimingOrLayout =
  (typeof PROMOTIONAL_OVERLAY_TIMING_OR_LAYOUT_VALUES)[number];

export type PromotionalOverlays = {
  headline?: string;
  call_to_action?: string;
  url?: string;
  phone?: string;
  price_or_promotion?: string;
  /** @deprecated Legacy name. It has always meant the canonical Metaprom watermark. */
  logo_required?: boolean;
  metaprom_watermark_required?: boolean;
  timing_or_layout?: PromotionalOverlayTimingOrLayout;
};

const PRODUCTION_PROFILE_KEYS = new Set([
  "fidelity_class",
  "preserve_product_identity",
  "protected_reasons",
  "veo_copy_policy",
]);

export function parseCommercialProductionProfile(
  value: unknown,
): CommercialProductionProfile {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("production_profile must be an object.");
  }
  const profile = value as Record<string, unknown>;
  const unknown = Object.keys(profile).filter((key) => !PRODUCTION_PROFILE_KEYS.has(key));
  if (unknown.length) throw new Error(`production_profile contains unknown properties: ${unknown.join(", ")}.`);
  if (profile.fidelity_class !== "protected" && profile.fidelity_class !== "flexible") {
    throw new Error("production_profile.fidelity_class is invalid.");
  }
  if (typeof profile.preserve_product_identity !== "boolean") {
    throw new Error("production_profile.preserve_product_identity must be boolean.");
  }
  if (profile.veo_copy_policy !== "deterministic_overlay_only") {
    throw new Error("production_profile.veo_copy_policy is invalid.");
  }
  if (!Array.isArray(profile.protected_reasons) || !profile.protected_reasons.every(
    (reason) => typeof reason === "string" && PROTECTED_REASON_VALUES.includes(reason as ProtectedReason),
  )) {
    throw new Error("production_profile.protected_reasons is invalid.");
  }
  return {
    fidelity_class: profile.fidelity_class,
    preserve_product_identity: profile.preserve_product_identity,
    protected_reasons: [...profile.protected_reasons] as ProtectedReason[],
    veo_copy_policy: profile.veo_copy_policy,
  };
}

export const DEFAULT_COMMERCIAL_PRODUCTION_PROFILE: CommercialProductionProfile = {
  fidelity_class: "protected",
  preserve_product_identity: true,
  protected_reasons: ["packaging", "label", "logo", "typography"],
  veo_copy_policy: "deterministic_overlay_only",
};

export function normalizeCommercialProductionProfile(
  profile?: CommercialProductionProfile | null,
): CommercialProductionProfile {
  if (!profile || profile.fidelity_class !== "flexible") {
    return {
      ...DEFAULT_COMMERCIAL_PRODUCTION_PROFILE,
      protected_reasons: profile?.protected_reasons?.length
        ? profile.protected_reasons.filter((reason) =>
            PROTECTED_REASON_VALUES.includes(reason),
          )
        : [...DEFAULT_COMMERCIAL_PRODUCTION_PROFILE.protected_reasons],
    };
  }

  return {
    fidelity_class: "flexible",
    preserve_product_identity: profile.preserve_product_identity === true,
    protected_reasons: profile.protected_reasons.filter((reason) =>
      PROTECTED_REASON_VALUES.includes(reason),
    ),
    veo_copy_policy: "deterministic_overlay_only",
  };
}

const PROMOTIONAL_COPY_SIGNAL =
  /\b(?:slogan|tagline|headline|call[ -]?to[ -]?action|cta|website|web site|url|phone|telephone|tel[eé]fono|precio|price|promotion|promoci[oó]n|offer|oferta|discount|descuento|logo|logotipo|title card|typography|tipograf[ií]a|texto|text on screen|on-screen text)\b|https?:\/\/|www\.|\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b|\$\s?\d|\b\d{2,}[ -]?\d{3,}[ -]?\d{3,}\b/i;

export function stripPromotionalCopyFromVeoIntent(intent: string): string {
  return intent
    .split(/(?<=[.!?])\s+|\r?\n+/)
    .map((segment) => segment.trim())
    .filter((segment) => segment && !PROMOTIONAL_COPY_SIGNAL.test(segment))
    .join(" ")
    .trim();
}

export function buildCommercialVideoPromptCore(input: {
  visualIntent: string;
  tier: "teaser" | "premium";
  destinationBlock?: string;
  productionProfile?: CommercialProductionProfile | null;
  requiredNarrativeBeats?: RequiredNarrativeBeats | null;
}): string {
  const vision = stripPromotionalCopyFromVeoIntent(input.visualIntent);
  const profile = normalizeCommercialProductionProfile(input.productionProfile);
  const durationSeconds = input.tier === "premium" ? 8 : 4;
  const narrativeBeatsBlock = buildNarrativeBeatsPromptBlock(input.requiredNarrativeBeats);
  const sceneBlock = vision
    ? `Visual scene to create (promotional graphics are handled separately):\n${vision}`
    : "Visual scene to create:\nA cinematic, aspirational environment built around the reference product as the hero subject.";
  const qualityHint =
    input.tier === "premium"
      ? "Broadcast-quality HD commercial with rich detail and smooth motion."
      : "Social teaser quality — punchy, scroll-stopping, medium fidelity.";
  const fidelityPolicy =
    profile.fidelity_class === "protected"
      ? `Protected-product fidelity policy:
- Treat the supplied Premium/reference image as the identity source of truth.
- Preserve product shape, proportions, colors, packaging, branding, labels, typography, and identity-critical visual details as faithfully as possible.
- Keep the product visually stable and recognizable.
- Avoid aggressive product rotation or orbit, deformation, morphing, disassembly, reconstruction, transformation, or inventing unseen product surfaces.
- People may hold or use the protected product when an essential narrative beat requires it; interaction must never deform, reconstruct, relabel, or change the protected asset.
- The protected asset only needs to appear when narratively appropriate; fidelity applies whenever it is visible.
- Actors, phones, environments, camera, lighting, transitions, sound, secondary objects, and scene design remain creatively free around the protected asset and mandatory beats.`
      : `Flexible-scene fidelity policy:
- Broader visual and camera motion is allowed, while keeping the reference subject recognizable when it appears.`;

  return `Create ${durationSeconds === 8 ? "an" : "a"} ${durationSeconds}-second professional social media / TV commercial.

${sceneBlock}
${input.destinationBlock ? `\n${input.destinationBlock}\n` : ""}
${fidelityPolicy}
${narrativeBeatsBlock ? `\n${narrativeBeatsBlock}\n` : ""}

Deterministic graphics policy (always required):
- Do not generate or render promotional typography, title cards, logos, URLs, prices, phone numbers, slogans, headlines, offers, or calls to action.
- Promotional copy and brand graphics are reserved for deterministic composition outside Veo.
- Reserve compositionally appropriate negative/safe space for later overlays when the scene calls for promotional copy or branding.

Requirements:
- ${qualityHint}
- Real advertising quality — like a commercial produced for Instagram, TikTok, or television
- Use cinematic camera and environmental motion consistent with the fidelity policy
- Professional lighting, depth of field, and color grading
- When the protected product appears, it must be clearly visible, recognizable, and exact
- Create a living scene with motion, atmosphere, and story

Strictly avoid:
- Ken Burns effect on a static image
- Slideshow-style motion or subtle photo wobble
- Product floating on a plain background with no scene`;
}
