export const OVERLAY_TYPOGRAPHY_TREATMENTS = ["clean", "bold", "refined", "cinematic"] as const;
export const OVERLAY_PALETTE_PRESETS = ["light", "dark", "warm", "cool"] as const;
export const OVERLAY_TEXT_ALIGNMENTS = ["left", "center", "right"] as const;
export const OVERLAY_CTA_TREATMENTS = ["pill", "panel", "text_only"] as const;
export const OVERLAY_PROMOTION_TREATMENTS = ["emphasis", "badge"] as const;
export const OVERLAY_STYLE_ORIGINS = ["user", "brand", "director"] as const;

export type OverlayTypographyTreatment = (typeof OVERLAY_TYPOGRAPHY_TREATMENTS)[number];
export type OverlayPalettePreset = (typeof OVERLAY_PALETTE_PRESETS)[number];
export type OverlayTextAlignment = (typeof OVERLAY_TEXT_ALIGNMENTS)[number];
export type OverlayCtaTreatment = (typeof OVERLAY_CTA_TREATMENTS)[number];
export type OverlayPromotionTreatment = (typeof OVERLAY_PROMOTION_TREATMENTS)[number];
export type OverlayStyleOrigin = (typeof OVERLAY_STYLE_ORIGINS)[number];

export type OverlayStyle = {
  typography_treatment: OverlayTypographyTreatment;
  palette_preset: OverlayPalettePreset;
  text_alignment: OverlayTextAlignment;
  cta_treatment: OverlayCtaTreatment;
  promotion_treatment: OverlayPromotionTreatment;
  origin: OverlayStyleOrigin;
};

/** Exact v6 visual behavior. Used only when a recipe predates overlay_style. */
export const V6_OVERLAY_STYLE: OverlayStyle = {
  typography_treatment: "bold",
  palette_preset: "dark",
  text_alignment: "center",
  cta_treatment: "pill",
  promotion_treatment: "emphasis",
  origin: "director",
};

const KEYS = new Set([
  "typography_treatment", "palette_preset", "text_alignment",
  "cta_treatment", "promotion_treatment", "origin",
]);

function requiredToken<T extends string>(
  source: Record<string, unknown>,
  key: string,
  values: readonly T[],
): T {
  const value = source[key];
  if (typeof value !== "string" || !values.includes(value as T)) {
    throw new Error(`overlay_style.${key} is not a supported token.`);
  }
  return value as T;
}

export function parseOverlayStyle(value: unknown): OverlayStyle {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("overlay_style must be an object.");
  }
  const source = value as Record<string, unknown>;
  const unknown = Object.keys(source).filter((key) => !KEYS.has(key));
  if (unknown.length) throw new Error(`overlay_style contains unknown properties: ${unknown.join(", ")}.`);
  return {
    typography_treatment: requiredToken(source, "typography_treatment", OVERLAY_TYPOGRAPHY_TREATMENTS),
    palette_preset: requiredToken(source, "palette_preset", OVERLAY_PALETTE_PRESETS),
    text_alignment: requiredToken(source, "text_alignment", OVERLAY_TEXT_ALIGNMENTS),
    cta_treatment: requiredToken(source, "cta_treatment", OVERLAY_CTA_TREATMENTS),
    promotion_treatment: requiredToken(source, "promotion_treatment", OVERLAY_PROMOTION_TREATMENTS),
    origin: requiredToken(source, "origin", OVERLAY_STYLE_ORIGINS),
  };
}

export function resolveOverlayStyle(value?: OverlayStyle | null): OverlayStyle {
  return value == null ? { ...V6_OVERLAY_STYLE } : parseOverlayStyle(value);
}
