import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStudioImagePrompt,
  buildStudioVideoPrompt,
} from "../lib/studio-prompts.ts";
import { CREATIVE_DIRECTOR_SYSTEM_PROMPT } from "../lib/creative-director/prompt.ts";

const CORTA_CHIDO_VISUAL_SCENE =
  "Un hombre corta fácilmente una caja o material con el cutter. Cámara alterna a una mujer sonriendo mientras también utiliza el cutter. Ambos modelos miran a cámara.";
const CORTA_CHIDO_SINGLE_SPEAKER =
  'Only the woman speaks. She says the exact phrase once: "Corta Chido es muy confiable". The man and every other visible person remain silent. No other speech, dialogue, chanting, murmuring, vocal reactions, improvised words, or vocalizations. Normal non-vocal music, ambience, and sound effects remain allowed.';

test("protected stapler office request survives into the final Veo scene prompt", () => {
  const directorNarrative =
    "Inside a busy modern office, an employee picks up the stapler, aligns a proposal, staples the pages, and hands the finished document to a colleague.";
  const prompt = buildStudioVideoPrompt(directorNarrative, "premium");

  assert.match(prompt, /busy modern office/i);
  assert.match(prompt, /employee picks up the stapler/i);
  assert.match(prompt, /staples the pages/i);
  assert.match(prompt, /hands the finished document to a colleague/i);
  assert.match(prompt, /human action, environment, and context/i);
  assert.match(prompt, /living scene with motion, atmosphere, and story/i);
  assert.doesNotMatch(prompt, /particles|light sweeps|safe space|product reveal/i);
  assert.doesNotMatch(prompt, /do not require hands or people/i);
});

test("Metaprom narrative preserves concrete photo, interaction, and transformation beats", () => {
  const directorNarrative =
    "A bakery owner photographs a plain pastry box with her phone. She uploads the photo, watches it transform into a polished campaign image, then smiles as customers interact with the new advertisement.";
  const prompt = buildStudioVideoPrompt(directorNarrative, "premium");

  for (const evidence of [
    /bakery owner photographs a plain pastry box/i,
    /uploads the photo/i,
    /transform into a polished campaign image/i,
    /customers interact with the new advertisement/i,
  ]) {
    assert.match(prompt, evidence);
  }
  assert.ok(prompt.indexOf("photographs") < prompt.indexOf("uploads"));
  assert.ok(prompt.indexOf("uploads") < prompt.indexOf("transform"));
  assert.doesNotMatch(prompt, /protected-product fidelity policy/i);
  assert.doesNotMatch(prompt, /camera push\/pull|environmental motion|particles/i);
});

test("teaser and Premium use the same recovered scene/story construction", () => {
  const narrative = "A designer uses the product at a shared studio table while teammates react.";
  const teaser = buildStudioVideoPrompt(narrative, "teaser");
  const premium = buildStudioVideoPrompt(narrative, "premium");

  for (const prompt of [teaser, premium]) {
    assert.ok(prompt.includes(narrative));
    assert.match(prompt, /worn, held, displayed, or used as appropriate/i);
    assert.match(prompt, /Cinematic camera movement \(tracking shots, dolly, orbit/i);
    assert.match(prompt, /NOT photo animation/i);
  }
  assert.match(teaser, /4-second/);
  assert.match(premium, /8-second/);
});

test("Imagen Premium receives the complete Director narrative", () => {
  const narrative =
    "In a neighborhood workshop, a craftswoman uses the product while an apprentice observes the transformation.";
  const prompt = buildStudioImagePrompt(narrative, "custom");

  assert.match(prompt, /neighborhood workshop/i);
  assert.match(prompt, /craftswoman uses the product/i);
  assert.match(prompt, /apprentice observes the transformation/i);
  assert.match(prompt, /Build an environment, mood, and story/i);
});

test("empty intent keeps the known-good human interaction fallback", () => {
  const prompt = buildStudioVideoPrompt("", "teaser");
  assert.match(prompt, /real-world setting with human interaction or dynamic product use/i);
});

test("explicit Corta Chido spoken copy remains exact in final teaser and Premium Veo prompts", () => {
  const intent = `${CORTA_CHIDO_VISUAL_SCENE} ${CORTA_CHIDO_SINGLE_SPEAKER}`;

  for (const tier of ["teaser", "premium"] as const) {
    const prompt = buildStudioVideoPrompt(intent, tier);
    assert.ok(prompt.includes('"Corta Chido es muy confiable"'));
    assert.doesNotMatch(prompt, /Corta Chido es super Confiable/i);
    assert.equal(prompt.match(/Corta Chido es muy confiable/g)?.length, 1);
    assert.match(prompt, /Only the woman speaks/i);
    assert.match(prompt, /man and every other visible person remain silent/i);
    assert.match(prompt, /No other speech, dialogue, chanting, murmuring, vocal reactions, improvised words, or vocalizations/i);
    assert.match(prompt, /non-vocal music, ambience, and sound effects remain allowed/i);
  }
});

test("spoken-copy safety changes only dialogue instruction, not the approved visual scene/story", () => {
  const visualOnlyPrompt = buildStudioVideoPrompt(CORTA_CHIDO_VISUAL_SCENE, "premium");
  const audioSafePrompt = buildStudioVideoPrompt(
    `${CORTA_CHIDO_VISUAL_SCENE} ${CORTA_CHIDO_SINGLE_SPEAKER}`,
    "premium",
  );

  assert.equal(
    audioSafePrompt.replace(` ${CORTA_CHIDO_SINGLE_SPEAKER}`, ""),
    visualOnlyPrompt,
  );
});

test("Director contract defaults explicit spoken copy to one speaker and forbids unrequested unison", () => {
  assert.match(CREATIVE_DIRECTOR_SYSTEM_PROMPT, /Assign the exact phrase to one narratively appropriate speaker by default/i);
  assert.match(CREATIVE_DIRECTOR_SYSTEM_PROMPT, /simultaneous speech, chorus, unison, or conversation are allowed only when the customer explicitly requests/i);
  assert.match(CREATIVE_DIRECTOR_SYSTEM_PROMPT, /every other visible person remains silent/i);
});

test("Director contract keeps explicitly requested two-person dialogue allowed", () => {
  assert.match(CREATIVE_DIRECTOR_SYSTEM_PROMPT, /Do not apply the single-speaker default when the customer explicitly requests dialogue or multiple voices/i);
  assert.match(CREATIVE_DIRECTOR_SYSTEM_PROMPT, /preserve that requested structure and every supplied spoken phrase exactly/i);
});
