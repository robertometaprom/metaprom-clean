import {
  buildDestinationImagePromptBlock,
  buildDestinationVideoPromptBlock,
} from "./destination-generation";
import type { StudioDestination } from "./studio-destination";
import type { Mode } from "./prompts";
import {
  buildCommercialVideoPromptCore,
  type CommercialProductionProfile,
} from "./commercial-production-profile";

const DEFAULT_COMMERCIAL_VISION =
  "Create a compelling luxury product advertisement that makes the customer want to buy immediately.";

export function buildStudioImagePrompt(
  customerIntent: string,
  mode: Mode,
  destination?: StudioDestination | null,
): string {
  const vision = customerIntent.trim() || DEFAULT_COMMERCIAL_VISION;
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
- Preserve exact product identity (shape, colors, branding, labels, proportions)
- ${modeHint}

The customer should immediately think: "Wow... this looks like a professional advertisement."`;
}

/** Shared teaser/Premium builder. Fidelity and copy policies are deterministic. */
export function buildStudioVideoPrompt(
  customerIntent: string,
  tier: "teaser" | "premium" = "teaser",
  destination?: StudioDestination | null,
  productionProfile?: CommercialProductionProfile | null,
): string {
  const destinationBlock = buildDestinationVideoPromptBlock(destination);
  return buildCommercialVideoPromptCore({
    visualIntent: customerIntent,
    tier,
    destinationBlock,
    productionProfile,
  });
}
