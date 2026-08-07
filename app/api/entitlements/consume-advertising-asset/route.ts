import { consumeAdvertisingAssetOnFirstPersist } from "@/lib/entitlements";
import {
  ADVERTISING_IMAGE_PACKAGE_REQUIRED_CODE,
  ADVERTISING_IMAGE_PACKAGE_REQUIRED_MESSAGE,
  ADVERTISING_IMAGE_PLANES_HREF,
} from "@/lib/entitlements/advertising-image-gate";
import { InsufficientEntitlementError } from "@/lib/entitlements/consume";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Bill authenticated first-persist of a finished Imagen Publicitaria.
 * Idempotent per asset_id; refinements that reuse the same asset must not call this.
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
    const result = await consumeAdvertisingAssetOnFirstPersist({
      userId: user.id,
      assetId,
      metadata: { source: "api.entitlements.consume-advertising-asset" },
    });

    if (!result) {
      return Response.json({
        ok: true,
        skipped: true,
        reason: "fulfillment_not_operational",
      });
    }

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
          error: "Insufficient advertising image balance.",
          code: "insufficient_entitlement",
          customerCode: ADVERTISING_IMAGE_PACKAGE_REQUIRED_CODE,
          message: ADVERTISING_IMAGE_PACKAGE_REQUIRED_MESSAGE,
          planesHref: ADVERTISING_IMAGE_PLANES_HREF,
          kind: error.kind,
        },
        { status: 402 },
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Failed to consume advertising image entitlement.";

    const status =
      message.includes("not owned") || message.includes("not found")
        ? 403
        : message.includes("not finished")
          ? 409
          : 500;

    return Response.json({ error: message }, { status });
  }
}
