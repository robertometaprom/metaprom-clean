import { getPaymentProvider } from "@/lib/payments";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const provider = getPaymentProvider();
    const payload = await req.json();
    const result = await provider.handleWebhook(payload);

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
