import { NextResponse } from "next/server";
import { persistShareGrowthEvent } from "@/lib/growth/persist";
import { parseShareEventRequest } from "@/lib/growth/share-events";
import { readVisitorIdFromRequest } from "@/lib/analytics/cookies";
import { isVisitorId } from "@/lib/analytics/ids";

export const runtime = "nodejs";

/**
 * Public Share event collector for share_created, share_opened, share_cta_clicked.
 * Does not accept signup / purchase / premium funnel types.
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const row = parseShareEventRequest(body);
  if (!row) {
    return new NextResponse(null, { status: 204 });
  }

  const cookieVisitor = readVisitorIdFromRequest(request);
  row.visitor_id = cookieVisitor ?? (isVisitorId(row.visitor_id) ? row.visitor_id : null);

  await persistShareGrowthEvent(row);
  return new NextResponse(null, { status: 204 });
}
