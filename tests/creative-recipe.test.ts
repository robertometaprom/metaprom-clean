import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCreativeRecipeV1,
  isCommercialUnlockEligible,
  isCreativeRecipeV1,
} from "../lib/creative-recipe.ts";

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
