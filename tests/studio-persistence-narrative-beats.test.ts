import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_COMMERCIAL_PRODUCTION_PROFILE,
  parseCommercialProductionProfile,
} from "../lib/commercial-production-profile.ts";
import {
  CANONICAL_LOGO_SOURCE,
  PROMPT_BUILDER_VERSION,
  VIDEO_PROCESSING_VERSION,
  buildCreativeRecipeV1,
} from "../lib/creative-recipe.ts";
import { resolveVeoGenerationParams } from "../lib/destination-generation.ts";
import {
  assertRequiredNarrativeBeatsInPrompt,
  buildNarrativeBeatsPromptBlock,
  parseRequiredNarrativeBeats,
  type RequiredNarrativeBeats,
} from "../lib/narrative-beats-contract.ts";
import { parseOverlayStyle } from "../lib/overlay-style-contract.ts";
import {
  parsePromotionalOverlays,
  requiresMetapromWatermark,
} from "../lib/promotional-overlay-contract.ts";
import { buildStudioVideoPrompt } from "../lib/studio-prompts.ts";
import { resolvePremiumVeoDurationSeconds } from "../lib/video/veo-config.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PERSISTENCE_SOURCE = readFileSync(join(ROOT, "lib/studio-persistence.ts"), "utf8");

const TIKTOK_DESTINATION = { platform: "TikTok", aspectRatio: "9:16" } as const;

/** Representative Director-applied commercial, matching asset 110 class (Metaprom / photo-to-ad). */
const ASSET_110_CUSTOMER_INTENT =
  "A bakery owner photographs a plain pastry box with her phone. She uploads the photo, watches it transform into a polished campaign image, then smiles as customers interact with the new advertisement.";

const DIRECTOR_BEATS: RequiredNarrativeBeats = [
  "A bakery owner photographs a pastry box with her phone",
  "She uploads the photo",
  "The photo transforms into a professional advertisement",
];

const DIRECTOR_OVERLAYS = {
  headline: "Hazlo extraordinario",
  call_to_action: "Conoce más",
  url: "https://metaprom.com",
  logo_required: true,
  timing_or_layout: "top_intro" as const,
};

const DIRECTOR_OVERLAY_STYLE = {
  typography_treatment: "cinematic" as const,
  palette_preset: "warm" as const,
  text_alignment: "left" as const,
  cta_treatment: "panel" as const,
  promotion_treatment: "badge" as const,
  origin: "user" as const,
};

/**
 * Exact recipe construction used by runStudioPersistence after post_upload_fetch_success.
 * Do not mock prompt construction or narrative-beat validation.
 */
function buildPersistenceCreativeRecipe(input: {
  customerIntent: string;
  requiredNarrativeBeats: RequiredNarrativeBeats | null;
  includeDirectorContracts?: boolean;
}) {
  const destination = { ...TIKTOK_DESTINATION };
  const promotionalOverlays = input.includeDirectorContracts === false
    ? null
    : parsePromotionalOverlays(DIRECTOR_OVERLAYS);
  const productionProfile = input.includeDirectorContracts === false
    ? null
    : parseCommercialProductionProfile(DEFAULT_COMMERCIAL_PRODUCTION_PROFILE);
  const overlayStyle = input.includeDirectorContracts === false
    ? null
    : parseOverlayStyle(DIRECTOR_OVERLAY_STYLE);
  const requiredNarrativeBeats = input.requiredNarrativeBeats == null
    ? null
    : parseRequiredNarrativeBeats(input.requiredNarrativeBeats);
  const premiumPrompt = buildStudioVideoPrompt(
    input.customerIntent,
    "premium",
    destination,
  );
  const narrativeBeatsBlock = buildNarrativeBeatsPromptBlock(requiredNarrativeBeats);

  return buildCreativeRecipeV1({
    reference_image_path: "user/105/110/enhanced.png",
    customer_intention: input.customerIntent,
    teaser_prompt: buildStudioVideoPrompt(input.customerIntent, "teaser", destination),
    premium_prompt: narrativeBeatsBlock
      ? `${premiumPrompt}\n\n${narrativeBeatsBlock}`
      : premiumPrompt,
    destination,
    aspect_ratio: resolveVeoGenerationParams(destination).aspectRatio,
    preview_duration_seconds: 4,
    premium_target_duration_seconds: resolvePremiumVeoDurationSeconds(),
    workflow_id: "commercial-video",
    generation: {
      image: {
        provider: "openai-responses-image-generation",
        model: "configured-at-generation",
      },
      preview_video: {
        provider: "vertex-veo",
        model: "configured-at-generation",
        workflow: "preview",
      },
      premium_video: {
        provider: "vertex-veo",
        model: "configured-at-generation",
        workflow: "premium",
      },
    },
    prompt_builder_version: PROMPT_BUILDER_VERSION,
    video_processing_version: VIDEO_PROCESSING_VERSION,
    preview_path: "user/105/110/teaser.mp4",
    promotional_overlays: promotionalOverlays,
    production_profile: productionProfile,
    required_narrative_beats: requiredNarrativeBeats,
    overlay_style: overlayStyle,
    metaprom_watermark_source: requiresMetapromWatermark(promotionalOverlays)
      ? CANONICAL_LOGO_SOURCE
      : null,
  });
}

test("runStudioPersistence freezes premium_prompt with the same narrative-beats block used by validation", () => {
  const recipeBuild = PERSISTENCE_SOURCE.slice(
    PERSISTENCE_SOURCE.indexOf('stage: "recipe_build_start"'),
    PERSISTENCE_SOURCE.indexOf('stage: "recipe_build_success"'),
  );

  assert.match(
    recipeBuild,
    /const premiumPrompt = buildStudioVideoPrompt\(\s*input\.customerIntent,\s*"premium",\s*destination,\s*\)/,
  );
  assert.match(
    recipeBuild,
    /const narrativeBeatsBlock = buildNarrativeBeatsPromptBlock\(requiredNarrativeBeats\)/,
  );
  assert.match(
    recipeBuild,
    /premium_prompt:\s*narrativeBeatsBlock\s*\?\s*`\$\{premiumPrompt\}\\n\\n\$\{narrativeBeatsBlock\}`\s*:\s*premiumPrompt/,
  );
  assert.match(recipeBuild, /required_narrative_beats:\s*requiredNarrativeBeats/);
  assert.doesNotMatch(recipeBuild, /buildCommercialVideoPromptCore/);
  assert.doesNotMatch(recipeBuild, /required_narrative_beats:\s*null/);
});

test("null requiredNarrativeBeats persist a TikTok 9:16 recipe (asset 109 control)", () => {
  const recipe = buildPersistenceCreativeRecipe({
    customerIntent: ASSET_110_CUSTOMER_INTENT,
    requiredNarrativeBeats: null,
  });

  assert.equal(recipe.destination?.platform, "TikTok");
  assert.equal(recipe.destination?.aspectRatio, "9:16");
  assert.equal(recipe.aspect_ratio, "9:16");
  assert.equal(recipe.required_narrative_beats, null);
  assert.doesNotMatch(recipe.premium_prompt, /Mandatory observable narrative beats/);
});

test("overlays, production profile, and overlay style are not the failure with null beats", () => {
  const withoutContracts = buildPersistenceCreativeRecipe({
    customerIntent: ASSET_110_CUSTOMER_INTENT,
    requiredNarrativeBeats: null,
    includeDirectorContracts: false,
  });
  const withContracts = buildPersistenceCreativeRecipe({
    customerIntent: ASSET_110_CUSTOMER_INTENT,
    requiredNarrativeBeats: null,
    includeDirectorContracts: true,
  });

  assert.equal(withoutContracts.aspect_ratio, "9:16");
  assert.equal(withContracts.aspect_ratio, "9:16");
  assert.ok(withContracts.promotional_overlays);
  assert.ok(withContracts.production_profile);
  assert.ok(withContracts.overlay_style);
});

test("strict validation still throws when the frozen premium_prompt omits the beats block", () => {
  const destination = { ...TIKTOK_DESTINATION };
  const rebuiltPremiumPrompt = buildStudioVideoPrompt(
    ASSET_110_CUSTOMER_INTENT,
    "premium",
    destination,
  );
  const expectedBlock = buildNarrativeBeatsPromptBlock(DIRECTOR_BEATS);

  assert.equal(resolveVeoGenerationParams(destination).aspectRatio, "9:16");
  assert.ok(!rebuiltPremiumPrompt.includes(expectedBlock));

  assert.throws(
    () => assertRequiredNarrativeBeatsInPrompt(rebuiltPremiumPrompt, DIRECTOR_BEATS),
    { message: "Frozen Premium prompt is missing one or more required narrative beats." },
  );
  assert.throws(
    () => buildCreativeRecipeV1({
      ...buildPersistenceCreativeRecipe({
        customerIntent: ASSET_110_CUSTOMER_INTENT,
        requiredNarrativeBeats: DIRECTOR_BEATS,
      }),
      premium_prompt: rebuiltPremiumPrompt,
    }),
    { message: "Frozen Premium prompt is missing one or more required narrative beats." },
  );
});

test("Director-style commercial with non-null beats now freezes a valid recipe with beats physically in premium_prompt", () => {
  const expectedBlock = buildNarrativeBeatsPromptBlock(DIRECTOR_BEATS);
  const recipe = buildPersistenceCreativeRecipe({
    customerIntent: ASSET_110_CUSTOMER_INTENT,
    requiredNarrativeBeats: DIRECTOR_BEATS,
  });

  assert.equal(recipe.destination?.platform, "TikTok");
  assert.equal(recipe.destination?.aspectRatio, "9:16");
  assert.equal(recipe.aspect_ratio, "9:16");
  assert.deepEqual(recipe.required_narrative_beats, DIRECTOR_BEATS);
  assert.ok(recipe.premium_prompt.includes(expectedBlock));
  assert.doesNotThrow(() => {
    assertRequiredNarrativeBeatsInPrompt(recipe.premium_prompt, recipe.required_narrative_beats);
  });
});
