import {
  buildDestinationImagePromptBlock,
  buildDestinationVideoPromptBlock,
} from "./destination-generation";
import type { StudioDestination } from "./studio-destination";
import type { Mode } from "./prompts";
import {
  buildCommercialVideoPromptCore,
  stripPromotionalCopyFromVeoIntent,
  type CommercialProductionProfile,
} from "./commercial-production-profile";
import type { RequiredNarrativeBeats } from "./narrative-beats-contract";

const DEFAULT_COMMERCIAL_VISION =
  "Create a compelling luxury product advertisement that makes the customer want to buy immediately.";

export function buildStudioImagePrompt(
  customerIntent: string,
  mode: Mode,
  destination?: StudioDestination | null,
  visualGenerationIntent?: string | null,
): string {
  const structuredVisualIntent = stripPromotionalCopyFromVeoIntent(
    visualGenerationIntent ?? "",
  );
  const vision =
    structuredVisualIntent ||
    stripPromotionalCopyFromVeoIntent(customerIntent) ||
    DEFAULT_COMMERCIAL_VISION;
  const destinationBlock = buildDestinationImagePromptBlock(destination);
  const modeHint =
    mode === "amazon" || mode === "mercado-libre"
      ? "The result should also work as a high-converting marketplace hero image."
      : mode === "social"
        ? "Optimize for scroll-stopping social media impact."
        : mode === "custom"
          ? "Follow the customer's creative direction as the primary goal."
          : "Optimize for a premium brand campaign look.";

  return `Goal: Transform this cellphone product photo into a professional advertising image.

This is NOT a photo enhancement task. The customer uploaded a casual phone photo and expects a real commercial — the kind they would see in a magazine, Instagram ad, or TV campaign.

Creative direction from the customer:
${vision}
${destinationBlock ? `\n${destinationBlock}\n` : ""}
Requirements:
- Create a dramatic, aspirational advertising scene around the product
- Professional commercial lighting, depth, and composition
- Campaign-ready, magazine-quality presentation
- The result must look like a professional advertisement — NOT a slightly improved version of the same photo
- Do NOT simply crop, brighten, remove background, or place the product on a plain white background
- Build an environment, mood, and story that sells the product
- Do not add promotional headlines, slogans, calls to action, URLs, prices, phone numbers, title cards, or separate brand graphics; those are composed later
- Preserve exact product identity (shape, colors, proportions, packaging, and any branding, labels, or typography physically present on the uploaded product)
- Never erase, replace, rewrite, or "clean up" labels or branding that are physically part of the reference product
- ${modeHint}

The customer should immediately think: "Wow... this looks like a professional advertisement."`;
}

/** Shared teaser/Premium builder. Fidelity and copy policies are deterministic. */
export function buildStudioVideoPrompt(
  customerIntent: string,
  tier: "teaser" | "premium" = "teaser",
  destination?: StudioDestination | null,
  productionProfile?: CommercialProductionProfile | null,
  requiredNarrativeBeats?: RequiredNarrativeBeats | null,
): string {
  const destinationBlock = buildDestinationVideoPromptBlock(destination);
  return buildCommercialVideoPromptCore({
    visualIntent: customerIntent,
    tier,
    destinationBlock,
    productionProfile,
    requiredNarrativeBeats,
  });
}
