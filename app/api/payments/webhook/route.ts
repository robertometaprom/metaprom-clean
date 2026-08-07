import { after } from "next/server";

import { resolvePackageForProductId } from "@/lib/entitlements";
import { getPaymentProvider } from "@/lib/payments";
import { persistPaymentResult } from "@/lib/payments/persistence";
import { fulfillPremiumVideoAfterPayment } from "@/lib/studio/premium-video-fulfillment";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const provider = getPaymentProvider();
    const rawBody = await req.text();
    let payload: unknown = null;

    try {
      payload = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      payload = rawBody;
    }

    const result = await provider.handleWebhook({
      rawBody,
      payload,
      headers: req.headers,
    });

    if (!result) {
      return Response.json({ ok: true, ignored: true });
    }

    // OXXO / async: unpaid sessions must not grant entitlements or fulfill.
    if (result.status !== "completed") {
      const supabase = createAdminClient();
      const purchase = await persistPaymentResult(supabase, provider.id, result);

      if (!purchase) {
        console.error(
          "[payments/webhook] Purchase not found for provider session:",
          result.sessionId,
        );
        return Response.json(
          { error: "Purchase not found for webhook session." },
          { status: 500 },
        );
      }

      return Response.json({ ok: true, ...result });
    }

    const supabase = createAdminClient();
    const purchase = await persistPaymentResult(supabase, provider.id, result);

    if (!purchase) {
      console.error(
        "[payments/webhook] Purchase not found for provider session:",
        result.sessionId,
      );
      return Response.json(
        { error: "Purchase not found for webhook session." },
        { status: 500 },
      );
    }

    const isCatalogPackage = Boolean(
      resolvePackageForProductId(purchase.product_id),
    );
    const assetId =
      purchase.asset_id == null || purchase.asset_id === ""
        ? null
        : String(purchase.asset_id);

    // Package purchases grant balances in persistPaymentResult.
    // Premium video generation only for a bound current project (or legacy SKU).
    if (assetId && (!isCatalogPackage || purchase.metadata?.consumeCurrentProject === true)) {
      after(async () => {
        try {
          const fulfillment = await fulfillPremiumVideoAfterPayment(
            supabase,
            assetId,
          );
          console.info("[payments/webhook] Premium fulfillment:", fulfillment);
        } catch (error) {
          console.error(
            "[payments/webhook] Premium fulfillment failed:",
            error,
          );
        }
      });
    }

    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error("Payment webhook failed:", error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Webhook processing failed.",
      },
      { status: 400 },
    );
  }
}
