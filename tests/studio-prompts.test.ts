import assert from "node:assert/strict";
import test from "node:test";
import type { CommercialProductionProfile } from "../lib/commercial-production-profile";
import {
  buildStudioImagePrompt,
  buildStudioVideoPrompt,
} from "../lib/studio-prompts.ts";
import { CREATIVE_DIRECTOR_SYSTEM_PROMPT } from "../lib/creative-director/prompt.ts";

test("Director exposes only closed overlay style tokens and explicit precedence", () => {
  assert.match(CREATIVE_DIRECTOR_SYSTEM_PROMPT, /explicit customer styling instruction > structured protected brand identity when actually available > your creative decision/i);
  assert.match(CREATIVE_DIRECTOR_SYSTEM_PROMPT, /clean \| bold \| refined \| cinematic/);
  assert.match(CREATIVE_DIRECTOR_SYSTEM_PROMPT, /light \| dark \| warm \| cool/);
  assert.match(CREATIVE_DIRECTOR_SYSTEM_PROMPT, /Never output arbitrary font names, HEX values, coordinates, effects/i);
  assert.match(CREATIVE_DIRECTOR_SYSTEM_PROMPT, /never claim a protected brand palette/i);
});

test("Director separates protected asset fidelity from narrative protagonist", () => {
  assert.match(CREATIVE_DIRECTOR_SYSTEM_PROMPT, /not automatically the narrative protagonist/i);
  assert.match(CREATIVE_DIRECTOR_SYSTEM_PROMPT, /1-4 concrete observable requiredNarrativeBeats/i);
  assert.match(CREATIVE_DIRECTOR_SYSTEM_PROMPT, /actual 8-second generation duration/i);
  assert.match(CREATIVE_DIRECTOR_SYSTEM_PROMPT, /People may hold or use it when the narrative requires it/i);
});

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

test("protected product coexists with human/use-story beats without forcing visibility throughout", () => {
  const beats = ["A person uploads a photo on a phone", "The protected product appears in the finished professional ad"];
  const prompt = buildStudioVideoPrompt(`Dramatic studio scene. ${beats.join(". ")}.`, "teaser", null, protectedProfile, beats);
  assert.match(prompt, /Avoid aggressive product rotation or orbit, deformation, morphing/i);
  assert.match(prompt, /People may hold or use the protected product when an essential narrative beat requires it/i);
  assert.match(prompt, /only needs to appear when narratively appropriate/i);
  assert.doesNotMatch(prompt, /Do not require hands or people/i);
  assert.doesNotMatch(prompt, /visible and recognizable throughout/i);
  for (const beat of beats) assert.match(prompt, new RegExp(`- ${beat}`));
});

test("Premium duration and mandatory beat enumeration match the actual 8-second config", () => {
  const beats = ["A person captures a photo", "The photo visibly becomes a professional advertisement"];
  const prompt = buildStudioVideoPrompt(beats.join(". "), "premium", null, protectedProfile, beats);
  assert.match(prompt, /Create an 8-second professional/);
  assert.doesNotMatch(prompt, /12-second/);
  assert.match(prompt, /Mandatory observable narrative beats/);
  assert.ok(prompt.indexOf(beats[0]) < prompt.indexOf(beats[1]));
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

test("Director promotional copy is excluded from Imagen Premium intent", () => {
  const prompt = buildStudioImagePrompt(
    "Convierte tus ideas en publicidad extraordinaria. Add METAPROM AI, https://metaprom.com and CTA Compra ahora.",
    "custom",
    null,
    "Dark digital environment with luminous particles and camera depth around the stable symbol. CTA: Compra ahora.",
  );

  assert.match(prompt, /Dark digital environment with luminous particles/);
  assert.doesNotMatch(prompt, /Convierte tus ideas/);
  assert.doesNotMatch(prompt, /https:\/\/metaprom\.com/);
  assert.doesNotMatch(prompt, /Compra ahora/);
});

test("Imagen Premium preserves physical product branding and labels", () => {
  const prompt = buildStudioImagePrompt("Premium cinematic product scene", "custom");
  assert.match(prompt, /branding, labels, or typography physically present/i);
  assert.match(prompt, /Never erase, replace, rewrite, or "clean up" labels or branding/i);
});

test("manual Commercial fallback removes obvious composition copy", () => {
  const prompt = buildStudioImagePrompt(
    "Warm cinematic light around the product. Headline: Summer Sale. URL https://example.com. CTA: Buy now.",
    "custom",
  );
  assert.match(prompt, /Warm cinematic light around the product/);
  assert.doesNotMatch(prompt, /Summer Sale/);
  assert.doesNotMatch(prompt, /https:\/\/example\.com/);
  assert.doesNotMatch(prompt, /Buy now/);
});
