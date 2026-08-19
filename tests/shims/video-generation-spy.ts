export const PUBLIC_AUTH_MOCK_BUFFER = Buffer.from("public-auth-mock-video");
export const PUBLIC_AUTH_MOCK_MODEL = "public-auth-mock-not-veo";

export type GenerateCommercialVideoCall = {
  workflow: "preview" | "premium" | "enterprise";
  prompt: string;
  imageBuffer: Buffer;
  model?: string;
};

export const generateCommercialVideoCalls: GenerateCommercialVideoCall[] = [];

export function resetGenerateCommercialVideoCalls() {
  generateCommercialVideoCalls.length = 0;
}

export async function generateCommercialVideo(input: {
  workflow: "preview" | "premium" | "enterprise";
  prompt: string;
  imageBuffer: Buffer;
  model?: string;
}) {
  generateCommercialVideoCalls.push({
    workflow: input.workflow,
    prompt: input.prompt,
    imageBuffer: input.imageBuffer,
    model: input.model,
  });

  return {
    buffer: PUBLIC_AUTH_MOCK_BUFFER,
    processed: false,
    workflow: input.workflow,
    tier: input.workflow === "preview" ? "teaser" : "premium",
    vertexModel: input.model ?? PUBLIC_AUTH_MOCK_MODEL,
    overlaysRequired: false,
    overlaysApplied: false,
    rawSha256: "0".repeat(64),
    finalSha256: "1".repeat(64),
  };
}
