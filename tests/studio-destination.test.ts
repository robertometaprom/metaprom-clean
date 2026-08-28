/**
 * Studio destination / aspect-ratio — Director proposal must not generate
 * with destination=null. Reuses the existing DestinationStep mapping.
 *
 * Run: tsx --test tests/studio-destination.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  resolveVeoGenerationParams,
  toDestinationGenerationPayload,
} from "../lib/destination-generation.ts";
import {
  buildDestinationFromOption,
  DESTINATION_OPTIONS,
} from "../lib/studio-destination.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function option(id: string) {
  const found = DESTINATION_OPTIONS.find((entry) => entry.id === id);
  assert.ok(found, `missing destination option ${id}`);
  return found;
}

test("TikTok selection produces structured destination with aspectRatio 9:16", () => {
  const destination = buildDestinationFromOption(option("tiktok"));
  assert.equal(destination.platform, "TikTok");
  assert.equal(destination.aspectRatio, "9:16");

  const veo = resolveVeoGenerationParams(destination);
  assert.equal(veo.aspectRatio, "9:16");
  assert.equal(veo.requestedAspectRatio, "9:16");

  const payload = toDestinationGenerationPayload(destination);
  assert.equal(payload.destination.platform, "TikTok");
  assert.equal(payload.destination.aspectRatio, "9:16");
});

test("existing non-TikTok platform mappings are preserved", () => {
  const reels = buildDestinationFromOption(option("instagram-reels"));
  assert.equal(reels.platform, "Instagram Reels");
  assert.equal(reels.aspectRatio, "9:16");
  assert.equal(resolveVeoGenerationParams(reels).aspectRatio, "9:16");

  const youtube = buildDestinationFromOption(option("youtube"));
  assert.equal(youtube.platform, "YouTube");
  assert.equal(youtube.aspectRatio, "16:9");
  assert.equal(resolveVeoGenerationParams(youtube).aspectRatio, "16:9");

  const website = buildDestinationFromOption(option("website"));
  assert.equal(website.platform, "Website");
  assert.equal(website.aspectRatio, "16:9");
  assert.equal(resolveVeoGenerationParams(website).aspectRatio, "16:9");

  const amazon = buildDestinationFromOption(option("amazon"));
  assert.equal(amazon.platform, "Amazon");
  assert.equal(amazon.aspectRatio, "1:1");
  assert.equal(resolveVeoGenerationParams(amazon).aspectRatio, "16:9");

  const mercado = buildDestinationFromOption(option("mercado-libre"));
  assert.equal(mercado.platform, "Mercado Libre");
  assert.equal(mercado.aspectRatio, "1:1");
  assert.equal(resolveVeoGenerationParams(mercado).aspectRatio, "16:9");
});

test("Director proposal path does not allow silent destination=null generation", () => {
  const studio = readRepo("components/studio/CreativeDirector.tsx");

  assert.match(studio, /import DestinationStep from "@\/components\/studio\/DestinationStep"/);
  assert.match(
    studio,
    /selectCreationModeAfterProposal[\s\S]*routeAfterCreationMode\(mode\)/,
  );
  assert.doesNotMatch(studio, /destination remains optional/);

  assert.match(
    studio,
    /knownMode === "commercial" && !destinationRef\.current[\s\S]*return "destination"/,
  );

  assert.match(
    studio,
    /creationMode === "commercial" && !destination/,
  );

  assert.match(
    studio,
    /creationModeRef\.current === "commercial"[\s\S]*!destinationRef\.current[\s\S]*setPhase\("destination"\)/,
  );

  assert.match(
    studio,
    /!isAdvertising && !destinationRef\.current[\s\S]*setPhase\("destination"\)[\s\S]*return;/,
  );

  assert.doesNotMatch(
    studio,
    /selectCreationModeAfterProposal[\s\S]{0,400}setPhase\("intent"\)/,
  );
});

test("generation receives the selected destination before \/api\/video", () => {
  const studio = readRepo("components/studio/CreativeDirector.tsx");
  const creation = readRepo("lib/studio-creation.ts");

  assert.match(
    studio,
    /createCommercialAssets\(\{[\s\S]*destination: destinationRef\.current/,
  );

  assert.match(
    creation,
    /if \(destination\) \{[\s\S]*formData\.append\(\s*"destination"/,
  );
  assert.match(
    creation,
    /if \(destination\) \{[\s\S]*videoForm\.append\(\s*"destination"/,
  );
  assert.match(creation, /fetch\("\/api\/video"/);
});

test("Studio still reuses DestinationStep and existing destination continue handler", () => {
  const studio = readRepo("components/studio/CreativeDirector.tsx");
  const step = readRepo("components/studio/DestinationStep.tsx");

  assert.match(studio, /phase === "destination" && creationMode === "commercial"/);
  assert.match(studio, /<DestinationStep/);
  assert.match(studio, /onContinue=\{handleDestinationContinue\}/);
  assert.match(
    studio,
    /destinationRef\.current = selected;[\s\S]*setPhase\("intent"\)/,
  );
  assert.match(step, /buildDestinationFromOption/);
  assert.match(step, /DESTINATION_OPTIONS\.map/);
});

test("persistence destination wiring is unchanged by this fix", () => {
  const persist = readRepo("lib/studio-persistence.ts");
  const telemetry = readRepo("lib/studio-persistence-telemetry.ts");
  const studio = readRepo("components/studio/CreativeDirector.tsx");

  assert.match(
    persist,
    /aspect_ratio: resolveVeoGenerationParams\(destination\)\.aspectRatio/,
  );
  assert.match(studio, /destination: destinationRef\.current,/);
  assert.doesNotMatch(telemetry, /destination remains optional/);
});
