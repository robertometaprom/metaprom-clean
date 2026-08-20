export const enhancementCalls: Array<{
  mode: string;
  aiInstructions: string;
}> = [];

export function resetEnhancementCalls() {
  enhancementCalls.length = 0;
}

export async function generateEnhancedImage(input: {
  normalizedJpegBuffer: Buffer;
  mode: string;
  aiInstructions?: string;
}) {
  enhancementCalls.push({
    mode: input.mode,
    aiInstructions: input.aiInstructions ?? "",
  });

  return {
    imageBase64: Buffer.from("antiabuse-mock-image").toString("base64"),
    model: "antiabuse-mock-not-openai",
    attempts: [],
  };
}
