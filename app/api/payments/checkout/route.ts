import { createClient } from "@/lib/supabase/server";
import { getPaymentProvider } from "@/lib/payments";
import { PaymentProviderError } from "@/lib/payments/types";
import {
  persistPaymentResult,
  updateAssetPaymentState,
} from "@/lib/payments/persistence";
import type {
  CheckoutRequest,
  CheckoutSession,
  PaymentMethod,
  PaymentProvider,
  PaymentSessionStatus,
} from "@/lib/payments/types";
import { getPriceById } from "@/lib/pricing";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

async function requireAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null as null };
  }

  return { supabase, user };
}

async function verifyAssetOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  assetId: string,
) {
  const { data: asset, error } = await supabase
    .from("assets")
    .select("id, project_id, payment_status")
    .eq("id", assetId)
    .maybeSingle();

  if (error || !asset) {
    return null;
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", asset.project_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!project) {
    return null;
  }

  return asset;
}

export async function POST(req: Request) {
  const { supabase, user } = await requireAuthUser();

  if (!user) {
    return jsonError("Authentication required.", 401);
  }

  let body: {
    assetId?: string;
    productId?: string;
    paymentMethod?: PaymentMethod;
    customerEmail?: string;
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const assetId = body.assetId?.trim();
  const productId = body.productId?.trim() ?? "commercial-video";
  const paymentMethod = body.paymentMethod ?? "card";

  if (!assetId) {
    return jsonError("assetId is required.", 400);
  }

  const asset = await verifyAssetOwnership(supabase, user.id, assetId);

  if (!asset) {
    return jsonError("Asset not found.", 404);
  }

  const amountMxn = getPriceById(productId);

  if (!amountMxn) {
    return jsonError("Unknown product.", 400);
  }

  const checkoutRequest: CheckoutRequest = {
    assetId,
    productId,
    amountMxn,
    paymentMethod,
    customerEmail: body.customerEmail ?? user.email ?? undefined,
    userId: user.id,
  };

  let provider: PaymentProvider;
  let session: CheckoutSession;

  try {
    provider = getPaymentProvider();
    session = await provider.createCheckout(checkoutRequest);
  } catch (error) {
    if (error instanceof PaymentProviderError) {
      return jsonError(error.message, 503);
    }

    throw error;
  }

  const { data: purchase, error: purchaseError } = await supabase
    .from("purchases")
    .insert({
      id: session.purchaseId,
      user_id: user.id,
      asset_id: assetId,
      product_id: productId,
      amount_mxn: amountMxn,
      currency: "MXN",
      status: session.status,
      provider: provider.id,
      provider_reference: session.oxxoReference ?? session.sessionId,
      payment_method: paymentMethod,
      metadata: { sessionId: session.sessionId },
      completed_at:
        session.status === "completed" ? new Date().toISOString() : null,
    })
    .select("id, status")
    .single();

  if (purchaseError) {
    console.error("purchase insert failed:", purchaseError);
    return jsonError("Unable to start checkout.", 500);
  }

  await updateAssetPaymentState(supabase, assetId, session.status, {
    purchaseId: purchase.id,
  });

  return Response.json({
    sessionId: session.sessionId,
    purchaseId: purchase.id,
    status: session.status,
    provider: provider.id,
    amountMxn,
    oxxoReference: session.oxxoReference,
    oxxoExpiresAt: session.oxxoExpiresAt,
    redirectUrl: session.redirectUrl,
  });
}

export async function GET(req: Request) {
  const { supabase, user } = await requireAuthUser();

  if (!user) {
    return jsonError("Authentication required.", 401);
  }

  const sessionId = new URL(req.url).searchParams.get("sessionId")?.trim();

  if (!sessionId) {
    return jsonError("sessionId is required.", 400);
  }

  const provider = getPaymentProvider();
  const session = await provider.getSessionStatus(sessionId);

  const { data: purchase } = await supabase
    .from("purchases")
    .select("id, asset_id, status")
    .eq("id", session.purchaseId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!purchase) {
    return jsonError("Purchase not found.", 404);
  }

  const nextStatus: PaymentSessionStatus = session.status;

  if (nextStatus !== purchase.status) {
    await persistPaymentResult(supabase, {
      sessionId: session.sessionId,
      purchaseId: purchase.id,
      status: nextStatus,
      providerReference: session.oxxoReference ?? session.sessionId,
    });
  }

  return Response.json({
    sessionId: session.sessionId,
    purchaseId: purchase.id,
    assetId: purchase.asset_id,
    status: nextStatus,
    provider: provider.id,
    oxxoReference: session.oxxoReference,
  });
}
