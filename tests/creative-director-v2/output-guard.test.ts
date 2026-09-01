/**
 * Director V2 output guard — internal terminology must never reach customers.
 *
 * Run: npx tsx --test tests/creative-director-v2/output-guard.test.ts
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  assertNoInternalLanguageLeakage,
  containsInternalLanguage,
  DIRECTOR_V2_FAILURE_MESSAGE,
} from "../../lib/creative-director-v2/output-guard.ts";

const FORBIDDEN_SAMPLES = [
  "requiredNarrativeBeats must include the beat",
  "visualGenerationIntent is missing",
  "The validator rejected your proposal",
  "schema parse failed",
  "parser error on field",
  "repair the JSON output",
  "retry with corrected beats",
  "missing_verbatim_beat detected",
  "Return valid JSON only",
  "internal validation failed",
];

test("containsInternalLanguage detects all forbidden customer-visible terms", () => {
  for (const sample of FORBIDDEN_SAMPLES) {
    assert.equal(containsInternalLanguage(sample), true, sample);
  }
});

test("assertNoInternalLanguageLeakage passes on normal creative director copy", () => {
  assert.doesNotThrow(() =>
    assertNoInternalLanguageLeakage(
      "Te propongo un comercial TikTok donde los clientes entran al restaurante y disfrutan la pasta.",
    ),
  );
});

test("assertNoInternalLanguageLeakage throws on internal terminology", () => {
  assert.throws(
    () => assertNoInternalLanguageLeakage(FORBIDDEN_SAMPLES[0]!),
    /forbidden internal terminology/,
  );
});

test("DIRECTOR_V2_FAILURE_MESSAGE is human-safe and leak-free", () => {
  assert.equal(containsInternalLanguage(DIRECTOR_V2_FAILURE_MESSAGE), false);
  assert.match(DIRECTOR_V2_FAILURE_MESSAGE, /No pude preparar/);
});
