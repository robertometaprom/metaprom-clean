function forbidden(name: string): never {
  throw new Error(`Phase 1 test tripwire: ${name} must not run`);
}

export async function generateVertexVideo(): Promise<Buffer> {
  forbidden("generateVertexVideo");
}

export function isVertexVideoConfigured(): boolean {
  return false;
}

export function getVertexVideoStatus(): never {
  forbidden("getVertexVideoStatus");
}

export async function normalizeImageForVeo(): Promise<Buffer> {
  forbidden("normalizeImageForVeo");
}
