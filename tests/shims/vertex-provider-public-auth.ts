export function isVertexVideoConfigured(): boolean {
  return true;
}

export function getVertexVideoStatus() {
  return {
    veoIntegration: "ready",
    vertexConfigured: true,
    provider: "vertex",
    projectId: "test-must-not-leak",
    location: "us-central1",
  };
}

export async function normalizeImageForVeo(uploadBuffer: Buffer): Promise<Buffer> {
  return uploadBuffer;
}

export async function generateVertexVideo(): Promise<Buffer> {
  throw new Error("Vertex generateVertexVideo must not run in public-auth tests");
}
