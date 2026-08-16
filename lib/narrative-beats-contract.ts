export const MAX_REQUIRED_NARRATIVE_BEATS = 4;
export const MAX_NARRATIVE_BEAT_LENGTH = 160;

export type RequiredNarrativeBeats = string[];

function normalizeBeat(value: string): string {
  return value.replace(/\r\n?/g, "\n").replace(/\s+/g, " ").trim();
}

export function parseRequiredNarrativeBeats(value: unknown): RequiredNarrativeBeats {
  if (!Array.isArray(value)) {
    throw new Error("required_narrative_beats must be an ordered array.");
  }
  if (value.length < 1 || value.length > MAX_REQUIRED_NARRATIVE_BEATS) {
    throw new Error(`required_narrative_beats must contain 1-${MAX_REQUIRED_NARRATIVE_BEATS} observable beats for an 8-second clip.`);
  }
  const beats = value.map((entry, index) => {
    if (typeof entry !== "string") {
      throw new Error(`required_narrative_beats[${index}] must be a string.`);
    }
    const beat = normalizeBeat(entry);
    if (beat.length < 3 || beat.length > MAX_NARRATIVE_BEAT_LENGTH) {
      throw new Error(`required_narrative_beats[${index}] must be 3-${MAX_NARRATIVE_BEAT_LENGTH} characters.`);
    }
    return beat;
  });
  if (new Set(beats.map((beat) => beat.toLocaleLowerCase())).size !== beats.length) {
    throw new Error("required_narrative_beats must not contain duplicates.");
  }
  return beats;
}

export function assertVisualIntentPreservesNarrativeBeats(
  visualIntent: string,
  beats: RequiredNarrativeBeats,
): void {
  const normalizedIntent = normalizeBeat(visualIntent).toLocaleLowerCase();
  for (const beat of beats) {
    if (!normalizedIntent.includes(normalizeBeat(beat).toLocaleLowerCase())) {
      throw new Error(`visualGenerationIntent is missing required narrative beat: ${beat}`);
    }
  }
}

export function buildNarrativeBeatsPromptBlock(beats?: RequiredNarrativeBeats | null): string {
  if (!beats?.length) return "";
  const parsed = parseRequiredNarrativeBeats(beats);
  return `Mandatory observable narrative beats (show each clearly, in this order):\n${parsed.map((beat) => `- ${beat}`).join("\n")}`;
}

export function assertRequiredNarrativeBeatsInPrompt(
  prompt: string,
  beats?: RequiredNarrativeBeats | null,
): void {
  if (!beats?.length) return;
  const expectedBlock = buildNarrativeBeatsPromptBlock(beats);
  if (!prompt.includes(expectedBlock)) {
    throw new Error("Frozen Premium prompt is missing one or more required narrative beats.");
  }
}
