import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type IntelligenceBody = {
  requested_service?: string;
  industry?: string;
  intended_destination?: string;
  matched_workflow?: boolean;
  workflow_id?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as IntelligenceBody;
    const requestedService = body.requested_service?.trim();

    if (!requestedService) {
      return NextResponse.json(
        { error: "requested_service is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const { error } = await supabase.from("product_intelligence").insert({
      requested_service: requestedService.slice(0, 500),
      industry: body.industry?.slice(0, 100) ?? null,
      intended_destination: body.intended_destination?.slice(0, 100) ?? null,
      matched_workflow: Boolean(body.matched_workflow),
      workflow_id: body.workflow_id?.slice(0, 100) ?? null,
    });

    if (error) {
      console.error("product_intelligence insert failed:", error);
      return NextResponse.json({ ok: false }, { status: 202 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("market-intelligence route error:", error);
    return NextResponse.json({ ok: false }, { status: 202 });
  }
}
