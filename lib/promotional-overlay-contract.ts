import {
  PROMOTIONAL_OVERLAY_TIMING_OR_LAYOUT_VALUES,
  type PromotionalOverlays,
  type PromotionalOverlayTimingOrLayout,
} from "@/lib/commercial-production-profile";

const KEYS = new Set([
  "headline", "call_to_action", "url", "phone", "price_or_promotion",
  "logo_required", "metaprom_watermark_required", "timing_or_layout",
]);
const TEXT_KEYS = ["headline", "call_to_action", "url", "phone", "price_or_promotion"] as const;

export function parsePromotionalOverlays(value: unknown): PromotionalOverlays | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("promotional_overlays must be an object or null.");
  }
  const source = value as Record<string, unknown>;
  const unknown = Object.keys(source).filter((key) => !KEYS.has(key));
  if (unknown.length) throw new Error(`promotional_overlays contains unknown properties: ${unknown.join(", ")}.`);

  const result: PromotionalOverlays = {};
  for (const key of TEXT_KEYS) {
    const raw = source[key];
    if (raw === undefined) continue;
    if (typeof raw !== "string") throw new Error(`promotional_overlays.${key} must be a string.`);
    const normalized = raw.trim().replace(/\r\n?/g, "\n");
    if (normalized) result[key] = normalized;
  }
  for (const key of ["logo_required", "metaprom_watermark_required"] as const) {
    const raw = source[key];
    if (raw !== undefined && typeof raw !== "boolean") {
      throw new Error(`promotional_overlays.${key} must be boolean.`);
    }
  }
  const legacy = source.logo_required as boolean | undefined;
  const explicit = source.metaprom_watermark_required as boolean | undefined;
  if (legacy !== undefined && explicit !== undefined && legacy !== explicit) {
    throw new Error("promotional_overlays has conflicting Metaprom watermark requirements.");
  }
  if (explicit !== undefined || legacy !== undefined) {
    result.metaprom_watermark_required = explicit ?? legacy;
  }

  if (source.timing_or_layout !== undefined) {
    if (typeof source.timing_or_layout !== "string" ||
        !PROMOTIONAL_OVERLAY_TIMING_OR_LAYOUT_VALUES.includes(source.timing_or_layout as PromotionalOverlayTimingOrLayout)) {
      throw new Error("promotional_overlays.timing_or_layout is not one of the 9 supported presets.");
    }
    result.timing_or_layout = source.timing_or_layout as PromotionalOverlayTimingOrLayout;
  }
  return result;
}

export function requiresMetapromWatermark(overlays?: PromotionalOverlays | null): boolean {
  return overlays?.metaprom_watermark_required === true || overlays?.logo_required === true;
}
