import { NextResponse } from "next/server";
import { persistShareGrowthEvent } from "@/lib/growth/persist";
import { parseShareEventRequest } from "@/lib/growth/share-events";

export const runtime = "nodejs";

/**
 * Public Share event collector for `share_created` and `share_opened`.
 * Does not accept `share_to_signup` or the broader funnel.
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

  await persistShareGrowthEvent(row);
  return new NextResponse(null, { status: 204 });
}
