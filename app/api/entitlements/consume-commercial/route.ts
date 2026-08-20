import { consumeCommercialForAsset } from "@/lib/entitlements";
import { InsufficientEntitlementError } from "@/lib/entitlements/consume";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Spend one prepaid Commercial entitlement for the current Premium Commercial.
 * Idempotent per asset_id; does not open Stripe Checkout.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const assetId =
    body &&
    typeof body === "object" &&
    "assetId" in body &&
    (typeof (body as { assetId: unknown }).assetId === "string" ||
      typeof (body as { assetId: unknown }).assetId === "number")
      ? (body as { assetId: string | number }).assetId
      : null;

  if (assetId == null || assetId === "") {
    return Response.json({ error: "assetId is required." }, { status: 400 });
  }

  try {
    const result = await consumeCommercialForAsset({
      userId: user.id,
      assetId,
      metadata: { source: "api.entitlements.consume-commercial" },
    });

    return Response.json({
      ok: true,
      consumed: result.consumed,
      alreadyConsumed: result.alreadyConsumed,
      assetId: result.assetId,
    });
  } catch (error) {
    if (error instanceof InsufficientEntitlementError) {
      return Response.json(
        {
          error: "Insufficient commercial balance.",
          code: "insufficient_entitlement",
          kind: error.kind,
        },
        { status: 402 },
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Failed to consume commercial entitlement.";

    const status =
      message.includes("not owned") || message.includes("not found")
        ? 403
        : message.includes("not a Commercial preview")
          ? 400
          : 500;

    return Response.json({ error: message }, { status });
  }
}
