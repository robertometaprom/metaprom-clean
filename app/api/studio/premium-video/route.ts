import { mapCreationError } from "@/lib/creation-errors";
import { fulfillPremiumVideoAfterPayment } from "@/lib/studio/premium-video-fulfillment";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function parseAssetId(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("Authentication required.", 401);
  }

  let body: { assetId?: string | number };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const assetId = parseAssetId(body.assetId);

  if (!assetId) {
    return jsonError("assetId is required.", 400);
  }

  const result = await fulfillPremiumVideoAfterPayment(supabase, assetId, {
    requireUserId: user.id,
  });

  if (result.status === "skipped") {
    return jsonError(result.reason, 402);
  }

  if (result.status === "failed") {
    if (result.reason === "Asset not found." || result.reason === "Project not found.") {
      return jsonError("Asset not found.", 404);
    }

    return jsonError(
      mapCreationError(result.reason) || "No pudimos producir tu comercial HD.",
      500,
    );
  }

  return Response.json({ status: "ready", assetId: result.assetId });
}
