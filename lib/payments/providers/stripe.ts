import Stripe from "stripe";

import type {
  CheckoutRequest,
  CheckoutSession,
  PaymentMethod,
  PaymentProvider,
  PaymentSessionStatus,
  PaymentWebhookPayload,
  PaymentWebhookResult,
} from "../types";
import { PaymentProviderError } from "../types";

const STRIPE_PROVIDER_REFERENCE_PREFIX = "stripe";
const DEFAULT_APP_URL = "http://localhost:3000";

function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new PaymentProviderError(
      "Stripe is not configured. Set STRIPE_SECRET_KEY or use PAYMENT_PROVIDER=mock.",
    );
  }

  return new Stripe(secretKey);
}

function getAppUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  return (configured || DEFAULT_APP_URL).replace(/\/$/, "");
}

function getPaymentMethodTypes(
  paymentMethod: PaymentMethod,
): Stripe.Checkout.SessionCreateParams.PaymentMethodType[] {
  if (paymentMethod === "oxxo") return ["oxxo"];
  return ["card"];
}

function mapStripeCheckoutStatus(
  session: Stripe.Checkout.Session,
): PaymentSessionStatus {
  if (session.payment_status === "paid") return "completed";
  if (session.status === "expired") return "cancelled";
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
  status = mapStripeCheckoutStatus(session),
): PaymentWebhookResult {
  return {
    sessionId: session.id,
    purchaseId: requirePurchaseId(session),
    status,
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
    const paymentMethodTypes = getPaymentMethodTypes(request.paymentMethod);
    const isOxxo = paymentMethodTypes.includes("oxxo");

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
          price_data: {
            currency: request.currency ?? "mxn",
            unit_amount: request.amountMxn * 100,
            product_data: {
              name: "Metaprom comercial HD",
              metadata: {
                productId: request.productId,
              },
            },
          },
        },
      ],
      metadata: {
        purchaseId,
        assetId: request.assetId,
        productId: request.productId,
        userId: request.userId,
        paymentMethod: request.paymentMethod,
      },
      success_url: `${appUrl}/studio?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/studio?payment=cancelled&purchase=${purchaseId}`,
    });

    return toCheckoutSession(session);
  },

  async getSessionStatus(sessionId: string): Promise<CheckoutSession> {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return toCheckoutSession(session);
  },

  async handleWebhook(payload: unknown): Promise<PaymentWebhookResult> {
    const webhookPayload = parseWebhookPayload(payload);
    const rawBody = webhookPayload.rawBody;
    const signature =
      webhookPayload.signature ?? webhookPayload.headers?.get("stripe-signature");
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

    if (!rawBody || !signature || !webhookSecret) {
      throw new PaymentProviderError(
        "Stripe webhook verification requires raw body, stripe-signature, and STRIPE_WEBHOOK_SECRET.",
      );
    }

    const stripe = getStripeClient();
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );

    switch (event.type) {
      case "checkout.session.completed":
        return toWebhookResult(event.data.object as Stripe.Checkout.Session);
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
        throw new PaymentProviderError(
          `${STRIPE_PROVIDER_REFERENCE_PREFIX} webhook event "${event.type}" is not handled.`,
        );
    }
  },
};
