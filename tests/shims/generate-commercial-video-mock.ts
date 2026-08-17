import { mock } from "node:test";

export const PHASE1_MOCK_VERTEX_MODEL = "phase1-mock-not-veo" as const;
export const PHASE1_MOCK_BUFFER = Buffer.from("phase1-mock-video");

export const generateCommercialVideo = mock.fn(
  async (input: {
    workflow: "preview" | "premium" | "enterprise";
    prompt: string;
    imageBuffer: Buffer;
  }) => ({
    buffer: PHASE1_MOCK_BUFFER,
    processed: false,
    workflow: input.workflow,
    tier: input.workflow === "preview" ? "teaser" : "premium",
    vertexModel: PHASE1_MOCK_VERTEX_MODEL,
    overlaysRequired: false,
    overlaysApplied: false,
    rawSha256: "0".repeat(64),
    finalSha256: "1".repeat(64),
  }),
);
