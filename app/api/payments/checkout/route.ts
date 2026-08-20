import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCheckoutSession } from "@/lib/payments/create-checkout-session";
import { getPaymentProvider } from "@/lib/payments";
import { PaymentProviderError } from "@/lib/payments/types";
import { persistPaymentResult } from "@/lib/payments/persistence";
import {
  canBindAssetToPackage,
  isCommercialWorkflowAsset,
  loadOwnedAssetById,
} from "@/lib/payments/purchase-integrity";
import type {
  PaymentMethod,
  PaymentSessionStatus,
} from "@/lib/payments/types";
import { getPricingPackageById } from "@/lib/pricing";

export const runtime = "nodejs";

function describeUnknownError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause,
    };
  }

  return {
    name: typeof error,
    message: String(error),
    raw: error,
  };
}

function getTraceId(req: Request): string {
  return req.headers.get("x-metaprom-trace-id") ?? `server-${randomUUID()}`;
}

function logTrace(traceId: string, stage: string, details?: unknown) {
  console.error(`[metaprom-checkout-trace:${traceId}] ${stage}`, details ?? null);
}

function jsonError(
  message: string,
  status: number,
  traceId: string,
  details?: unknown,
) {
  return Response.json({ error: message, traceId, details }, { status });
}

async function requireAuthUser(traceId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    logTrace(traceId, "auth failed", { error });
    return { supabase, user: null as null };
  }

  logTrace(traceId, "auth ok", { userId: user.id, email: user.email });
  return { supabase, user };
}

export async function POST(req: Request) {
  const traceId = getTraceId(req);

  try {
    return await postWithTrace(req, traceId);
  } catch (error) {
    const details = describeUnknownError(error);
    logTrace(traceId, "POST unhandled exception", details);
    return jsonError(
      `Unhandled checkout exception: ${details.name}: ${details.message}`,
      500,
      traceId,
      details,
    );
  }
}

async function postWithTrace(req: Request, traceId: string) {
  logTrace(traceId, "POST /api/payments/checkout start", { url: req.url });
  const { supabase, user } = await requireAuthUser(traceId);

  if (!user) {
    return jsonError("Authentication required.", 401, traceId);
  }

  let body: {
    assetId?: string | number;
    productId?: string;
    productKey?: string;
    paymentMethod?: PaymentMethod;
    customerEmail?: string;
  };

  try {
    body = (await req.json()) as typeof body;
  } catch (error) {
    const details = describeUnknownError(error);
    logTrace(traceId, "request body parse failed", details);
    return jsonError(
      `Invalid request body: ${details.name}: ${details.message}`,
      400,
      traceId,
      details,
    );
  }

  logTrace(traceId, "request body parsed", body);

  const productKey = (body.productKey ?? body.productId)?.trim();
  const paymentMethod = body.paymentMethod ?? "card";
  const assetId =
    typeof body.assetId === "string"
      ? body.assetId.trim()
      : typeof body.assetId === "number" && Number.isFinite(body.assetId)
        ? String(body.assetId)
        : undefined;

  if (!productKey) {
    return jsonError("productKey is required.", 400, traceId, { body });
  }

  const catalogPackage = getPricingPackageById(productKey);
  if (!catalogPackage) {
    return jsonError("Unknown product key.", 400, traceId, { productKey });
  }

  // V1 package catalog — sole checkout architecture (Studio + /planes).
  let ownedAsset = null;
  if (assetId) {
    if (!canBindAssetToPackage(catalogPackage)) {
      return jsonError(
        "Advertising Image packages cannot be bound to a project asset.",
        400,
        traceId,
        { assetId, productKey },
      );
    }

    ownedAsset = await loadOwnedAssetById(supabase, user.id, assetId);
    if (!ownedAsset) {
      return jsonError("Asset not found.", 404, traceId, {
        assetId,
        userId: user.id,
      });
    }

    if (!isCommercialWorkflowAsset(ownedAsset)) {
      return jsonError(
        "Commercial packages can only unlock a Commercial preview asset.",
        400,
        traceId,
        { assetId, productKey },
      );
    }
  }

  try {
    const result = await createCheckoutSession(supabase, {
      productKey,
      userId: user.id,
      customerEmail: user.email ?? undefined,
      assetId,
      ownedAsset,
      paymentMethod,
    });

    logTrace(traceId, "package checkout created", {
      productKey: result.productKey,
      purchaseId: result.purchaseId,
      sessionId: result.session.sessionId,
    });

    return Response.json({
      traceId,
      checkoutKind: "package",
      productKey: result.productKey,
      sessionId: result.session.sessionId,
      purchaseId: result.purchaseId,
      status: result.session.status,
      provider: result.provider,
      amountMxn: result.amountMxn,
      quantity: result.quantity,
      category: result.category,
      oxxoReference: result.session.oxxoReference,
      oxxoExpiresAt: result.session.oxxoExpiresAt,
      redirectUrl: result.session.redirectUrl,
      assetId: result.assetId,
    });
  } catch (error) {
    const details = describeUnknownError(error);
    logTrace(traceId, "package createCheckoutSession failed", details);
    if (error instanceof PaymentProviderError) {
      return jsonError(error.message, 503, traceId, details);
    }
    throw error;
  }
}

export async function GET(req: Request) {
  const traceId = getTraceId(req);

  try {
    return await getWithTrace(req, traceId);
  } catch (error) {
    const details = describeUnknownError(error);
    logTrace(traceId, "GET unhandled exception", details);
    return jsonError(
      `Unhandled checkout status exception: ${details.name}: ${details.message}`,
      500,
      traceId,
      details,
    );
  }
}

async function getWithTrace(req: Request, traceId: string) {
  logTrace(traceId, "GET /api/payments/checkout start", { url: req.url });
  const { supabase, user } = await requireAuthUser(traceId);

  if (!user) {
    return jsonError("Authentication required.", 401, traceId);
  }

  const sessionId = new URL(req.url).searchParams.get("sessionId")?.trim();

  if (!sessionId) {
    return jsonError("sessionId is required.", 400, traceId);
  }

  const provider = getPaymentProvider();
  const session = await provider.getSessionStatus(sessionId);
  logTrace(traceId, "provider session status", { provider: provider.id, session });

  const { data: purchase } = await supabase
    .from("purchases")
    .select("id, asset_id, product_id, status, metadata")
    .eq("user_id", user.id)
    .eq("provider", provider.id)
    .eq("provider_reference", session.sessionId)
    .maybeSingle();

  if (!purchase) {
    logTrace(traceId, "purchase lookup failed", { sessionId, userId: user.id });
    return jsonError("Purchase not found.", 404, traceId, { sessionId });
  }

  const nextStatus: PaymentSessionStatus = session.status;

  // Entitlement grants are service_role-only. Never call grant RPCs with the
  // cookie/anon authenticated client (EXECUTE is revoked for anon/authenticated).
  // Always persist completed sessions so a prior status update without grant
  // can be recovered idempotently.
  let admin: ReturnType<typeof createAdminClient> | null = null;

  let persistedProductId = purchase.product_id;
  let persistedAssetId =
    purchase.asset_id == null ? null : String(purchase.asset_id);

  if (nextStatus !== purchase.status || nextStatus === "completed") {
    admin = createAdminClient();
    const persisted = await persistPaymentResult(admin, provider.id, {
      sessionId: session.sessionId,
      purchaseId: String(purchase.id),
      status: nextStatus,
      providerReference: session.sessionId,
      stripePriceId: session.stripePriceId,
      stripeAssetId: session.stripeAssetId,
      stripeUserId: session.stripeUserId,
    });
    if (persisted?.product_id) {
      persistedProductId = persisted.product_id;
    }
    if (persisted) {
      persistedAssetId =
        persisted.asset_id == null || persisted.asset_id === ""
          ? null
          : String(persisted.asset_id);
    }
  }

  const pkg = getPricingPackageById(persistedProductId);
  let confirmation: {
    quantity: number;
    entitlementKind: "commercial" | "advertising_asset";
    packageName: string;
    balanceAfter: number;
  } | null = null;

  // A Stripe redirect is not proof of fulfillment. Only expose success after
  // the canonical, idempotent ledger grant exists for this purchase.
  if (nextStatus === "completed" && pkg) {
    admin ??= createAdminClient();
    const [grantResult, balanceResult] = await Promise.all([
      admin
        .from("entitlement_ledger")
        .select("entitlement_kind, quantity")
        .eq("purchase_id", purchase.id)
        .eq("entry_type", "grant")
        .maybeSingle(),
      admin
        .from("entitlement_balances")
        .select("commercials_remaining, advertising_assets_remaining")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    const { data: grant, error: grantError } = grantResult;
    const { data: balance, error: balanceError } = balanceResult;

    if (grantError) {
      throw new Error(
        `Failed to verify entitlement grant for purchase ${purchase.id}: ${grantError.message}`,
      );
    }

    if (balanceError) {
      throw new Error(
        `Failed to load entitlement balance for purchase ${purchase.id}: ${balanceError.message}`,
      );
    }

    const expectedKind =
      pkg.category === "commercials" ? "commercial" : "advertising_asset";

    if (
      grant &&
      grant.entitlement_kind === expectedKind &&
      grant.quantity === pkg.quantity &&
      balance
    ) {
      confirmation = {
        quantity: pkg.quantity,
        entitlementKind: expectedKind,
        packageName: pkg.name,
        balanceAfter:
          expectedKind === "commercial"
            ? balance.commercials_remaining
            : balance.advertising_assets_remaining,
      };
    }
  }

  return Response.json({
    traceId,
    sessionId: session.sessionId,
    purchaseId: purchase.id,
    assetId: persistedAssetId,
    productId: persistedProductId,
    status: nextStatus,
    provider: provider.id,
    oxxoReference: session.oxxoReference,
    package: pkg
      ? {
          quantity: pkg.quantity,
          entitlementKind:
            pkg.category === "commercials"
              ? "commercial"
              : "advertising_asset",
          packageName: pkg.name,
        }
      : null,
    confirmation,
  });
}
