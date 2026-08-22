import { NextResponse } from "next/server";
import { parseClientFunnelEventRequest } from "@/lib/analytics/events";
import { readAcquisitionFromRequest, readVisitorIdFromRequest } from "@/lib/analytics/cookies";
import { isVisitorId } from "@/lib/analytics/ids";
import { recordLandingVisit, recordPreviewViewed } from "@/lib/analytics/record";

export const runtime = "nodejs";

/**
 * Browser-only funnel events: landing_visit, preview_viewed.
 * Rejects signup / purchase / premium so those cannot be faked from the client.
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const cookieVisitor = readVisitorIdFromRequest(request);
  const bodyVisitor =
    body &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    "visitor_id" in body &&
    isVisitorId((body as { visitor_id?: unknown }).visitor_id)
      ? (body as { visitor_id: string }).visitor_id
      : null;
  const visitorId = cookieVisitor ?? bodyVisitor;

  const row = parseClientFunnelEventRequest(body, visitorId);
  if (!row) {
    return new NextResponse(null, { status: 204 });
  }

  if (row.event_type === "landing_visit") {
    const sessionKey =
      body &&
      typeof body === "object" &&
      !Array.isArray(body) &&
      typeof (body as { session_key?: unknown }).session_key === "string"
        ? (body as { session_key: string }).session_key.trim()
        : "";
    if (!visitorId || !sessionKey) {
      return new NextResponse(null, { status: 204 });
    }

    await recordLandingVisit({
      visitorId,
      sessionKey,
      acquisition: readAcquisitionFromRequest(request),
    });
    return new NextResponse(null, { status: 204 });
  }

  await recordPreviewViewed(row);
  return new NextResponse(null, { status: 204 });
}
