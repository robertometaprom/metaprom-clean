import Stripe from "stripe";

import {
  getStripeTestPriceId,
  getStripeTestSecretKey,
  getStripeWebhookSecret,
} from "../stripe-config";
import type {
  CheckoutRequest,
  CheckoutSession,
  PaymentProvider,
  PaymentSessionStatus,
  PaymentWebhookPayload,
  PaymentWebhookResult,
} from "../types";
import { PaymentProviderError } from "../types";

const DEFAULT_APP_URL = "http://localhost:3000";

function getStripeClient(): Stripe {
  return new Stripe(getStripeTestSecretKey());
}

function getAppUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  const appUrl = (configured || DEFAULT_APP_URL).replace(/\/$/, "");

  if (process.env.NODE_ENV === "production" && /localhost|127\.0\.0\.1/i.test(appUrl)) {
    throw new PaymentProviderError(
      "NEXT_PUBLIC_APP_URL must be set to your public production URL for Stripe redirects.",
    );
  }

  return appUrl;
}

function getPaymentMethodTypes(
  request: CheckoutRequest,
): Stripe.Checkout.SessionCreateParams.PaymentMethodType[] {
  if (request.paymentMethodTypes?.length) {
    return request.paymentMethodTypes;
  }

  if (request.paymentMethod === "oxxo") return ["oxxo"];
  return ["card"];
}

/**
 * Map Stripe Checkout session → Metaprom payment status.
 * OXXO vouchers stay awaiting_payment until async payment succeeds.
 * Never treat unpaid/pending payment_status as completed.
 */
function mapStripeCheckoutStatus(
  session: Stripe.Checkout.Session,
): PaymentSessionStatus {
  if (session.payment_status === "paid") return "completed";
  if (session.status === "expired") return "cancelled";
  if (session.payment_status === "unpaid" || session.payment_status === "no_payment_required") {
    if (session.status === "open" || session.status === "complete") {
      return "awaiting_payment";
    }
  }
  if (session.status === "open" || session.status === "complete") {
    return "awaiting_payment";
  }
  return "pending";
}

function requirePurchaseId(session: Stripe.Checkout.Session): string {
  const purchaseId = session.metadata?.purchaseId;

  if (!purchaseId) {
    throw new PaymentProviderError("Stripe session is missing purchaseId metadata.");
  }

  return purchaseId;
}

function toCheckoutSession(session: Stripe.Checkout.Session): CheckoutSession {
  const purchaseId = requirePurchaseId(session);

  return {
    sessionId: session.id,
    purchaseId,
    provider: "stripe",
    status: mapStripeCheckoutStatus(session),
    redirectUrl: session.url ?? undefined,
  };
}

function toWebhookResult(
  session: Stripe.Checkout.Session,
  status?: PaymentSessionStatus,
): PaymentWebhookResult {
  return {
    sessionId: session.id,
    purchaseId: requirePurchaseId(session),
    status: status ?? mapStripeCheckoutStatus(session),
    providerReference:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? session.id,
  };
}

function parseWebhookPayload(payload: unknown): PaymentWebhookPayload {
  if (payload && typeof payload === "object") {
    return payload as PaymentWebhookPayload;
  }

  return { payload };
}

export const stripePaymentProvider: PaymentProvider = {
  id: "stripe",

  async createCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
    const stripe = getStripeClient();
    const purchaseId = crypto.randomUUID();
    const appUrl = getAppUrl();
    const paymentMethodTypes = getPaymentMethodTypes(request);
    const isOxxo = paymentMethodTypes.includes("oxxo");
    const priceId = getStripeTestPriceId(request.productId);
    const successPath = (request.successPath ?? "/studio").replace(/^\//, "");
    const cancelPath = (request.cancelPath ?? "/studio").replace(/^\//, "");

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: request.customerEmail,
      client_reference_id: purchaseId,
      payment_method_types: paymentMethodTypes,
      payment_method_options: isOxxo
        ? { oxxo: { expires_after_days: 3 } }
        : undefined,
      line_items: [
        {
          quantity: 1,
          price: priceId,
        },
      ],
      metadata: {
        purchaseId,
        assetId: request.assetId ?? "",
        productId: request.productId,
        userId: request.userId,
        paymentMethod: request.paymentMethod,
        amountMxn: String(request.amountMxn),
        ...(request.metadata ?? {}),
      },
      success_url: `${appUrl}/${successPath}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/${cancelPath}?payment=cancelled&purchase=${purchaseId}`,
    });

    const checkoutSession = toCheckoutSession(session);

    if (!checkoutSession.redirectUrl) {
      throw new PaymentProviderError(
        "Stripe did not return a hosted checkout URL. Verify Stripe Checkout is enabled for card/OXXO payments.",
      );
    }

    return checkoutSession;
  },

  async getSessionStatus(sessionId: string): Promise<CheckoutSession> {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return toCheckoutSession(session);
  },

  async handleWebhook(payload: unknown): Promise<PaymentWebhookResult | null> {
    const webhookPayload = parseWebhookPayload(payload);
    const rawBody = webhookPayload.rawBody;
    const signature =
      webhookPayload.signature ?? webhookPayload.headers?.get("stripe-signature");
    const webhookSecret = getStripeWebhookSecret();

    if (!rawBody || !signature) {
      throw new PaymentProviderError(
        "Stripe webhook verification requires raw body and stripe-signature header.",
      );
    }

    const stripe = getStripeClient();
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );

    switch (event.type) {
      case "checkout.session.completed": {
        // Card: payment_status=paid → completed.
        // OXXO voucher created: payment_status=unpaid → awaiting_payment (no grant).
        return toWebhookResult(event.data.object as Stripe.Checkout.Session);
      }
      case "checkout.session.async_payment_succeeded":
        return toWebhookResult(
          event.data.object as Stripe.Checkout.Session,
          "completed",
        );
      case "checkout.session.async_payment_failed":
        return toWebhookResult(
          event.data.object as Stripe.Checkout.Session,
          "failed",
        );
      case "checkout.session.expired":
        return toWebhookResult(
          event.data.object as Stripe.Checkout.Session,
          "cancelled",
        );
      default:
        console.info(
          `[stripe] Ignoring unhandled webhook event "${event.type}".`,
        );
        return null;
    }
  },
};
