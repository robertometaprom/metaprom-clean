import type { VeoAspectRatio } from "@/lib/destination-generation";
import { generateVertexVideo } from "@/lib/video/vertex-provider";
import { processCommercialVideo } from "@/lib/video-processing";
import {
  resolveWorkflow,
  type VideoWorkflow,
} from "@/lib/video/workflows";

export type GenerateCommercialVideoInput = {
  workflow: VideoWorkflow;
  prompt: string;
  imageBuffer: Buffer;
  aspectRatio?: VeoAspectRatio;
};

export type GenerateCommercialVideoResult = {
  buffer: Buffer;
  processed: boolean;
  workflow: VideoWorkflow;
  tier: ReturnType<typeof resolveWorkflow>["tier"];
  vertexModel: string;
};

export async function generateCommercialVideo(
  input: GenerateCommercialVideoInput,
): Promise<GenerateCommercialVideoResult> {
  const workflowConfig = resolveWorkflow(input.workflow);

  const rawBuffer = await generateVertexVideo({
    prompt: input.prompt,
    imageBuffer: input.imageBuffer,
    aspectRatio: input.aspectRatio,
    model: workflowConfig.vertexModel,
  });

  const { buffer, processed } = await processCommercialVideo({
    buffer: rawBuffer,
    tier: workflowConfig.tier,
  });

  return {
    buffer,
    processed,
    workflow: input.workflow,
    tier: workflowConfig.tier,
    vertexModel: workflowConfig.vertexModel,
  };
}
