import { getConfiguredPaymentProviderId } from "@/lib/payments";

export const runtime = "nodejs";

export async function GET() {
  const provider = getConfiguredPaymentProviderId();
  return Response.json({ provider });
}
