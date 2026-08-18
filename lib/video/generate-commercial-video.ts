import type { VeoAspectRatio } from "@/lib/destination-generation";
import { resolvePremiumVeoDurationSeconds } from "@/lib/video/veo-config";
import { generateVertexVideo } from "@/lib/video/vertex-provider";
import { processCommercialVideo } from "@/lib/video-processing";
import type { PromotionalOverlays } from "@/lib/commercial-production-profile";
import type { ExactLogoSource } from "@/lib/creative-recipe";
import type { OverlayStyle } from "@/lib/overlay-style-contract";
import { createHash } from "crypto";
import { hasRequiredPromotionalOverlays } from "@/lib/promotional-overlay";
import {
  observeVeoVisualGeneration,
  resolveObservedVeoDurationSeconds,
} from "@/lib/video/generation-events";
import {
  resolveWorkflow,
  type VideoWorkflow,
} from "@/lib/video/workflows";

export type GenerateCommercialVideoInput = {
  workflow: VideoWorkflow;
  prompt: string;
  imageBuffer: Buffer;
  aspectRatio?: VeoAspectRatio;
  model?: string;
  promotionalOverlays?: PromotionalOverlays | null;
  exactLogoSource?: ExactLogoSource | null;
  overlayStyle?: OverlayStyle | null;
};

export type GenerateCommercialVideoResult = {
  buffer: Buffer;
  processed: boolean;
  workflow: VideoWorkflow;
  tier: ReturnType<typeof resolveWorkflow>["tier"];
  vertexModel: string;
  overlaysRequired: boolean;
  overlaysApplied: boolean;
  rawSha256: string;
  finalSha256: string;
};

export async function generateCommercialVideo(
  input: GenerateCommercialVideoInput,
): Promise<GenerateCommercialVideoResult> {
  const workflowConfig = resolveWorkflow(input.workflow);
  const durationSeconds =
    input.workflow === "premium"
      ? resolvePremiumVeoDurationSeconds()
      : undefined;
  const vertexModel = input.model ?? workflowConfig.vertexModel;

  const rawBuffer = await observeVeoVisualGeneration(
    {
      workflow: input.workflow,
      tier: workflowConfig.tier,
      model: vertexModel,
      durationSeconds: resolveObservedVeoDurationSeconds({
        requestedDurationSeconds: durationSeconds,
      }),
    },
    () =>
      generateVertexVideo({
        prompt: input.prompt,
        imageBuffer: input.imageBuffer,
        aspectRatio: input.aspectRatio,
        durationSeconds,
        model: vertexModel,
      }),
  );

  const overlaysRequired = hasRequiredPromotionalOverlays(input.promotionalOverlays);
  const { buffer, processed } = await processCommercialVideo({
    buffer: rawBuffer,
    tier: workflowConfig.tier,
    promotionalOverlays: input.promotionalOverlays,
    aspectRatio: input.aspectRatio,
    exactLogoSource: input.exactLogoSource,
    overlayStyle: input.overlayStyle,
  });

  return {
    buffer,
    processed,
    workflow: input.workflow,
    tier: workflowConfig.tier,
    vertexModel,
    overlaysRequired,
    overlaysApplied: overlaysRequired && processed,
    rawSha256: createHash("sha256").update(rawBuffer).digest("hex"),
    finalSha256: createHash("sha256").update(buffer).digest("hex"),
  };
}
