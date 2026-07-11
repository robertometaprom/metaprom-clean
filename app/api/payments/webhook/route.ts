import { getPaymentProvider } from "@/lib/payments";
import { persistPaymentResult } from "@/lib/payments/persistence";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

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
    const supabase = createAdminClient();
    await persistPaymentResult(supabase, result);

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
