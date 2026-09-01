/**
 * Customer-facing output guard — internal Director concepts must never leak.
 */

const FORBIDDEN_CUSTOMER_PATTERNS: RegExp[] = [
  /requiredNarrativeBeats/i,
  /visualGenerationIntent/i,
  /\bvalidator\b/i,
  /\bschema\b/i,
  /\bparser\b/i,
  /\brepair\b/i,
  /\bretry\b/i,
  /missing_verbatim_beat/i,
  /\bJSON\b/,
  /internal validation/i,
];

export function containsInternalLanguage(text: string): boolean {
  return FORBIDDEN_CUSTOMER_PATTERNS.some((pattern) => pattern.test(text));
}

export function assertNoInternalLanguageLeakage(text: string): void {
  if (containsInternalLanguage(text)) {
    throw new Error("Customer-facing text contains forbidden internal terminology.");
  }
}

export const DIRECTOR_V2_FAILURE_MESSAGE =
  "No pude preparar tu propuesta comercial en este momento. Cuéntame de nuevo qué quieres lograr con tu comercial y lo intentamos otra vez.";
