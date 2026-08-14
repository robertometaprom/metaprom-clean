import assert from "node:assert/strict";
import test from "node:test";
import type { CommercialProductionProfile } from "../lib/commercial-production-profile";
import { buildCommercialVideoPromptCore } from "../lib/commercial-production-profile.ts";

const buildStudioVideoPrompt = (
  visualIntent: string,
  tier: "teaser" | "premium" = "teaser",
  _destination: null = null,
  productionProfile?: CommercialProductionProfile,
) => buildCommercialVideoPromptCore({ visualIntent, tier, productionProfile });

const protectedProfile: CommercialProductionProfile = {
  fidelity_class: "protected",
  preserve_product_identity: true,
  protected_reasons: ["packaging", "label", "logo"],
  veo_copy_policy: "deterministic_overlay_only",
};

const flexibleProfile: CommercialProductionProfile = {
  fidelity_class: "flexible",
  preserve_product_identity: false,
  protected_reasons: [],
  veo_copy_policy: "deterministic_overlay_only",
};

test("protected prompt contains deterministic product-fidelity restrictions", () => {
  const prompt = buildStudioVideoPrompt(
    "Dark cinematic environment with gold particles.",
    "teaser",
    null,
    protectedProfile,
  );
  assert.match(prompt, /identity source of truth/i);
  assert.match(prompt, /Preserve product shape, proportions, colors, packaging, branding, labels/i);
  assert.match(prompt, /Keep the product visually stable and recognizable/i);
});

test("protected prompt prohibits orbit, deformation, and human manipulation", () => {
  const prompt = buildStudioVideoPrompt("Dramatic studio scene", "teaser", null, protectedProfile);
  assert.match(prompt, /Avoid aggressive product rotation or orbit, deformation, morphing/i);
  assert.match(prompt, /Do not require hands or people to manipulate/i);
  assert.doesNotMatch(prompt, /Show believable human action/i);
  assert.doesNotMatch(prompt, /tracking shots, dolly, orbit/i);
});

test("promotional copy is removed from Veo scene intent", () => {
  const prompt = buildStudioVideoPrompt(
    "Warm light sweeps across the scene. Show slogan Compra ahora. Website https://metaprom.com. Add logo METAPROM.",
    "teaser",
    null,
    protectedProfile,
  );
  assert.match(prompt, /Warm light sweeps across the scene/);
  assert.doesNotMatch(prompt, /Compra ahora/);
  assert.doesNotMatch(prompt, /https:\/\/metaprom\.com/);
  assert.doesNotMatch(prompt, /logo METAPROM/);
  assert.match(prompt, /Do not generate or render promotional typography/i);
});

test("flexible profile still excludes deterministic promotional copy", () => {
  const prompt = buildStudioVideoPrompt(
    "Energetic abstract motion. CTA: Pídelo hoy. Price $99.",
    "premium",
    null,
    flexibleProfile,
  );
  assert.match(prompt, /Flexible-scene fidelity policy/);
  assert.doesNotMatch(prompt, /Pídelo hoy/);
  assert.doesNotMatch(prompt, /\$99/);
  assert.match(prompt, /reserved for deterministic composition outside Veo/i);
});

test("teaser and Premium share the same fidelity and copy policy", () => {
  const teaser = buildStudioVideoPrompt("Cinematic mist", "teaser", null, protectedProfile);
  const premium = buildStudioVideoPrompt("Cinematic mist", "premium", null, protectedProfile);
  for (const policy of [
    "Protected-product fidelity policy",
    "identity source of truth",
    "Deterministic graphics policy",
    "Reserve compositionally appropriate negative/safe space",
  ]) {
    assert.equal(teaser.includes(policy), true);
    assert.equal(premium.includes(policy), true);
  }
});

test("manual Commercial entry defaults conservatively to protected", () => {
  const prompt = buildStudioVideoPrompt("Premium product hero shot");
  assert.match(prompt, /Protected-product fidelity policy/);
  assert.match(prompt, /deterministic composition outside Veo/i);
});
