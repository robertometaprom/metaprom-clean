import type {
  CreativeValidationRequest,
  CreativeValidationResult,
  CreativeValidator,
  ValidationBlockingReason,
  ValidationSuggestion,
  ValidationWarning,
} from "./types";

export type {
  CreativeValidationRequest,
  CreativeValidationResult,
  CreativeValidator,
};

function mergeValidationResults(
  results: CreativeValidationResult[],
): CreativeValidationResult {
  const warnings: ValidationWarning[] = [];
  const suggestions: ValidationSuggestion[] = [];
  const blockingReasons: ValidationBlockingReason[] = [];
  let optimizedAlternative: CreativeValidationResult["optimizedAlternative"];

  for (const result of results) {
    warnings.push(...result.warnings);
    suggestions.push(...result.suggestions);
    blockingReasons.push(...result.blockingReasons);

    if (result.optimizedAlternative && !optimizedAlternative) {
      optimizedAlternative = result.optimizedAlternative;
    }
  }

  return {
    isValid: blockingReasons.length === 0,
    warnings,
    suggestions,
    blockingReasons,
    optimizedAlternative,
  };
}

/**
 * Runs registered validation modules against a creative request.
 *
 * This is the validation orchestration layer only — no business rules are
 * implemented here. Future modules (trademark, celebrity, copyright, etc.)
 * implement CreativeValidator and are passed to this function.
 */
export async function validateCreativeRequest(
  request: CreativeValidationRequest,
  validators: CreativeValidator[] = [],
): Promise<CreativeValidationResult> {
  if (validators.length === 0) {
    return {
      isValid: true,
      warnings: [],
      suggestions: [],
      blockingReasons: [],
    };
  }

  const results = await Promise.all(
    validators.map((validator) => validator.validate(request)),
  );

  return mergeValidationResults(results);
}
