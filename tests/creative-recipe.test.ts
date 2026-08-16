import assert from "node:assert/strict";
import test from "node:test";
import {
  CANONICAL_LOGO_SOURCE,
  buildCreativeRecipeV1,
  isCommercialUnlockEligible,
  isCreativeRecipeV1,
  parseCreativeRecipeV1,
} from "../lib/creative-recipe.ts";
import { parsePromotionalOverlays } from "../lib/promotional-overlay-contract.ts";
import { DEFAULT_COMMERCIAL_PRODUCTION_PROFILE } from "../lib/commercial-production-profile.ts";
import {
  OVERLAY_CTA_TREATMENTS,
  OVERLAY_PALETTE_PRESETS,
  OVERLAY_PROMOTION_TREATMENTS,
  OVERLAY_STYLE_ORIGINS,
  OVERLAY_TEXT_ALIGNMENTS,
  OVERLAY_TYPOGRAPHY_TREATMENTS,
  parseOverlayStyle,
} from "../lib/overlay-style-contract.ts";
import { buildNarrativeBeatsPromptBlock } from "../lib/narrative-beats-contract.ts";

const frozen = buildCreativeRecipeV1({
  frozenAt: "2026-08-14T00:00:00.000Z",
  reference_image_path: "user/project/asset/enhanced.png",
  customer_intention: "Promocionar zapatos en TikTok",
  teaser_prompt: "exact teaser",
  premium_prompt: "exact premium",
  destination: { platform: "tiktok", aspectRatio: "9:16" },
  aspect_ratio: "9:16",
  preview_duration_seconds: 4,
  premium_target_duration_seconds: 8,
  workflow_id: "commercial-video",
  generation: {
    image: { provider: "openai-responses-image-generation", model: "gpt-4.1" },
    preview_video: { provider: "vertex-veo", model: "veo-preview", workflow: "preview" },
    premium_video: { provider: "vertex-veo", model: "veo-premium", workflow: "premium" },
  },
  prompt_builder_version: "studio-prompts-v1",
  video_processing_version: "commercial-video-processing-v1",
  preview_path: "user/project/asset/teaser.mp4",
  promotional_overlays: {
    headline: "Hazlo extraordinario",
    call_to_action: "Conoce más",
    url: "https://metaprom.com",
    logo_required: true,
    timing_or_layout: "top_intro",
  },
  exact_logo_source: CANONICAL_LOGO_SOURCE,
  production_profile: DEFAULT_COMMERCIAL_PRODUCTION_PROFILE,
  overlay_style: {
    typography_treatment: "cinematic",
    palette_preset: "warm",
    text_alignment: "left",
    cta_treatment: "panel",
    promotion_treatment: "badge",
    origin: "user",
  },
});

test("new commercial preview freezes a complete v1 recipe", () => {
  assert.equal(isCreativeRecipeV1(frozen), true);
  assert.equal(frozen.premium_prompt, "exact premium");
  assert.equal(frozen.generation.premium_video.model, "veo-premium");
});

test("recipe survives JSON persistence and fresh-session rehydration", () => {
  const rehydrated = JSON.parse(JSON.stringify(frozen));
  assert.equal(isCreativeRecipeV1(rehydrated), true);
  assert.deepEqual(rehydrated.destination, frozen.destination);
  assert.equal(rehydrated.preview_path, frozen.preview_path);
  assert.deepEqual(rehydrated.promotional_overlays, frozen.promotional_overlays);
  assert.equal(rehydrated.promotional_overlays.timing_or_layout, "top_intro");
  assert.deepEqual(rehydrated.exact_logo_source, CANONICAL_LOGO_SOURCE);
  assert.deepEqual(rehydrated.production_profile, DEFAULT_COMMERCIAL_PRODUCTION_PROFILE);
  assert.deepEqual(rehydrated.overlay_style, frozen.overlay_style);
});

test("overlay_style accepts every closed token and records explicit provenance", () => {
  for (const typography_treatment of OVERLAY_TYPOGRAPHY_TREATMENTS) {
    for (const palette_preset of OVERLAY_PALETTE_PRESETS) {
      for (const text_alignment of OVERLAY_TEXT_ALIGNMENTS) {
        for (const cta_treatment of OVERLAY_CTA_TREATMENTS) {
          for (const promotion_treatment of OVERLAY_PROMOTION_TREATMENTS) {
            for (const origin of OVERLAY_STYLE_ORIGINS) {
              assert.deepEqual(parseOverlayStyle({ typography_treatment, palette_preset, text_alignment, cta_treatment, promotion_treatment, origin }),
                { typography_treatment, palette_preset, text_alignment, cta_treatment, promotion_treatment, origin });
            }
          }
        }
      }
    }
  }
});

test("overlay_style rejects unknown properties, tokens, types, and invalid recipe recovery", () => {
  const style = frozen.overlay_style!;
  assert.throws(() => parseOverlayStyle({ ...style, hex: "#fff" }), /unknown properties: hex/i);
  assert.throws(() => parseOverlayStyle({ ...style, typography_treatment: "serif" }), /not a supported token/i);
  assert.throws(() => parseOverlayStyle({ ...style, origin: 42 }), /not a supported token/i);
  assert.equal(parseCreativeRecipeV1({ ...frozen, overlay_style: { ...style, shadow: "dramatic" } }), null);
});

test("promotional overlays are rebuilt field-by-field and reject open input", () => {
  assert.deepEqual(parsePromotionalOverlays({
    headline: "  Copy exacto\r\nsegunda línea  ",
    logo_required: true,
    timing_or_layout: "bottom_outro",
  }), {
    headline: "Copy exacto\nsegunda línea",
    metaprom_watermark_required: true,
    timing_or_layout: "bottom_outro",
  });
  assert.throws(() => parsePromotionalOverlays({ headline: "x", color: "red" }), /unknown properties: color/i);
  assert.throws(() => parsePromotionalOverlays({ headline: 42 }), /headline must be a string/i);
  assert.throws(() => parsePromotionalOverlays({ timing_or_layout: "somewhere" }), /9 supported presets/i);
});

test("recipe read rejects invalid overlay/source/profile contracts", () => {
  assert.equal(parseCreativeRecipeV1({ ...frozen, promotional_overlays: { headline: "x", surprise: true } }), null);
  assert.equal(parseCreativeRecipeV1({ ...frozen, promotional_overlays: { headline: "x", timing_or_layout: "free" } }), null);
  assert.equal(parseCreativeRecipeV1({ ...frozen, exact_logo_source: { ...CANONICAL_LOGO_SOURCE, sha256: "0".repeat(64) } }), null);
  assert.equal(parseCreativeRecipeV1({ ...frozen, production_profile: { ...DEFAULT_COMMERCIAL_PRODUCTION_PROFILE, extra: true } }), null);
});

test("legacy recipes and logo_required retain Metaprom-only semantics", () => {
  const oldWithoutNewFields = { ...frozen } as Record<string, unknown>;
  delete oldWithoutNewFields.production_profile;
  delete oldWithoutNewFields.metaprom_watermark_source;
  delete oldWithoutNewFields.overlay_style;
  const recovered = parseCreativeRecipeV1(oldWithoutNewFields);
  assert.ok(recovered);
  assert.equal(recovered.promotional_overlays?.metaprom_watermark_required, true);
  assert.deepEqual(recovered.metaprom_watermark_source, CANONICAL_LOGO_SOURCE);
  assert.equal("customer_logo_source" in recovered, false);
  assert.equal(recovered.overlay_style, null);
});

test("required narrative beats survive recipe persistence and must exist in frozen Premium prompt", () => {
  const beats = ["A person uploads a photo", "The photo visibly transforms into a professional advertisement"];
  const withBeats = buildCreativeRecipeV1({
    ...frozen,
    premium_prompt: `Create an 8-second commercial.\n\n${buildNarrativeBeatsPromptBlock(beats)}`,
    required_narrative_beats: beats,
  });
  assert.deepEqual(JSON.parse(JSON.stringify(withBeats)).required_narrative_beats, beats);
  assert.throws(
    () => buildCreativeRecipeV1({ ...withBeats, premium_prompt: "Create an 8-second commercial." }),
    /missing one or more required narrative beats/i,
  );
});

test("legacy/incomplete assets are explicitly not treated as exact recipes", () => {
  assert.equal(isCreativeRecipeV1(null), false);
  assert.equal(isCreativeRecipeV1({ schema_version: 1 }), false);
});

test("Biblioteca unlock is limited to unpaid commercial previews", () => {
  assert.equal(
    isCommercialUnlockEligible({ teaser_video_path: "teaser.mp4", payment_status: "none" }),
    true,
  );
  assert.equal(isCommercialUnlockEligible({ payment_status: "none" }), false);
  assert.equal(
    isCommercialUnlockEligible({ teaser_video_path: "teaser.mp4", payment_status: "paid" }),
    false,
  );
  assert.equal(
    isCommercialUnlockEligible({
      teaser_video_path: "teaser.mp4",
      premium_video_path: "premium.mp4",
      payment_status: "paid",
    }),
    false,
  );
});

test("pending OXXO preview remains resumable without exposing image-only CTA", () => {
  assert.equal(
    isCommercialUnlockEligible({ teaser_video_path: "teaser.mp4", payment_status: "pending" }),
    true,
  );
  assert.equal(isCommercialUnlockEligible({ image_url: "image.png" } as never), false);
});
