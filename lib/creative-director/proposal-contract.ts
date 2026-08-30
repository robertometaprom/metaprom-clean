import { parseCommercialProductionProfile } from "../commercial-production-profile";
import { parsePromotionalOverlays } from "../promotional-overlay-contract";
import { parseOverlayStyle } from "../overlay-style-contract";
import {
  assertVisualIntentPreservesNarrativeBeats,
  parseRequiredNarrativeBeats,
} from "../narrative-beats-contract";
import type { DirectorValidatorCode } from "./diagnostics";
import type { CommercialProposal } from "./types";

const PROPOSAL_STRING_FIELDS = [
  "summary",
  "openingHook",
  "productHeroMoment",
  "emotionalTone",
  "pacing",
  "callToAction",
  "narrative",
  "visualGenerationIntent",
] as const;

export type ClosedProposalParseFailure = {
  detail: string;
  code: DirectorValidatorCode;
};

export function commercialProposalContractFailure(
  value: unknown,
): ClosedProposalParseFailure | null {
  if (!value || typeof value !== "object") {
    return { detail: "proposal must be an object.", code: "unknown" };
  }

  const proposal = value as Record<string, unknown>;
  for (const field of PROPOSAL_STRING_FIELDS) {
    if (typeof proposal[field] !== "string") {
      return {
        detail: `proposal.${field} must be a string.`,
        code: "string_field",
      };
    }
  }

  try {
    assertVisualIntentPreservesNarrativeBeats(
      proposal.visualGenerationIntent as string,
      parseRequiredNarrativeBeats(proposal.requiredNarrativeBeats),
    );
  } catch (error) {
    return {
      detail: error instanceof Error ? error.message : String(error),
      code: "beats",
    };
  }

  try {
    parseCommercialProductionProfile(proposal.productionProfile);
  } catch (error) {
    return {
      detail: error instanceof Error ? error.message : String(error),
      code: "production_profile",
    };
  }

  try {
    if (parsePromotionalOverlays(proposal.promotionalOverlays) === null) {
      return {
        detail: "proposal.promotionalOverlays must be an object.",
        code: "overlays",
      };
    }
  } catch (error) {
    return {
      detail: error instanceof Error ? error.message : String(error),
      code: "overlays",
    };
  }

  try {
    parseOverlayStyle(proposal.overlayStyle);
  } catch (error) {
    return {
      detail: error instanceof Error ? error.message : String(error),
      code: "overlay_style",
    };
  }

  return null;
}

export function parseClosedCommercialProposal(
  value: unknown,
):
  | { proposal: CommercialProposal }
  | { failure: ClosedProposalParseFailure } {
  const failure = commercialProposalContractFailure(value);
  if (failure) return { failure };

  const proposal = value as CommercialProposal;
  return {
    proposal: {
      ...proposal,
      requiredNarrativeBeats: parseRequiredNarrativeBeats(
        proposal.requiredNarrativeBeats,
      ),
      productionProfile: parseCommercialProductionProfile(
        proposal.productionProfile,
      ),
      promotionalOverlays: parsePromotionalOverlays(proposal.promotionalOverlays)!,
      overlayStyle: parseOverlayStyle(proposal.overlayStyle),
    },
  };
}

export function tryParseClosedCommercialProposal(
  value: unknown,
): CommercialProposal | null {
  const parsed = parseClosedCommercialProposal(value);
  return "proposal" in parsed ? parsed.proposal : null;
}
