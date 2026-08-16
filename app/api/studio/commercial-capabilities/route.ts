import {
  PROMPT_BUILDER_VERSION,
  VIDEO_PROCESSING_VERSION,
} from "@/lib/creative-recipe";
import { resolvePremiumVeoDurationSeconds } from "@/lib/video/veo-config";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    {
      promptBuilderVersion: PROMPT_BUILDER_VERSION,
      videoProcessingVersion: VIDEO_PROCESSING_VERSION,
      premiumDurationSeconds: resolvePremiumVeoDurationSeconds(),
      narrativeBeatsRequiredForNewRecipes: true,
      overlaysRequiredPremiumFailClosed: true,
      rawVeoArtifactDeliverableWhenOverlaysRequired: false,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
