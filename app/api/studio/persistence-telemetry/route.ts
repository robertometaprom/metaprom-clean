import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Temporary P0 sink for commercial persistence boundary events.
 * Logs only — no DB writes, no side effects on generation/persistence.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return new NextResponse(null, { status: 204 });
    }

    const event = body as Record<string, unknown>;
    const stage = typeof event.stage === "string" ? event.stage : null;
    if (!stage) {
      return new NextResponse(null, { status: 204 });
    }

    console.info(
      "[persistence-telemetry]",
      JSON.stringify({
        stage,
        projectId:
          typeof event.projectId === "string" || event.projectId === null
            ? event.projectId
            : undefined,
        assetId:
          typeof event.assetId === "string" ||
          typeof event.assetId === "number" ||
          event.assetId === null
            ? event.assetId
            : undefined,
        attempt:
          typeof event.attempt === "number" || event.attempt === null
            ? event.attempt
            : undefined,
        result: typeof event.result === "string" ? event.result : undefined,
        errorCode:
          typeof event.errorCode === "string" || event.errorCode === null
            ? event.errorCode
            : undefined,
        errorName:
          typeof event.errorName === "string" || event.errorName === null
            ? event.errorName
            : undefined,
        errorMessage:
          typeof event.errorMessage === "string" || event.errorMessage === null
            ? event.errorMessage
            : undefined,
        payloadBytes:
          typeof event.payloadBytes === "number" || event.payloadBytes === null
            ? event.payloadBytes
            : undefined,
        ts: typeof event.ts === "string" ? event.ts : undefined,
      }),
    );
  } catch {
    // Swallow — telemetry must never fail the client path.
  }

  return new NextResponse(null, { status: 204 });
}
