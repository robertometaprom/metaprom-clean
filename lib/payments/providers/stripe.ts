import Stripe from "stripe";

import {
  getStripePriceId,
  getStripeSecretKey,
  getStripeWebhookSecret,
  isStripeLiveMode,
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
  return new Stripe(getStripeSecretKey());
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
  if (
    session.payment_status === "paid" ||
    (session.payment_status === "no_payment_required" && session.status === "complete")
  ) {
    return "completed";
  }
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

function extractStripePriceId(
  session: Stripe.Checkout.Session,
): string | null {
  const priceId = session.line_items?.data?.[0]?.price?.id;
  return typeof priceId === "string" && priceId.startsWith("price_")
    ? priceId
    : null;
}

function stripeObjectId(
  value: string | { id?: string } | null | undefined,
): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object" && typeof value.id === "string") {
    return value.id;
  }
  return null;
}

function stripeInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const direct = stripeObjectId(
    (invoice as { subscription?: string | { id?: string } | null }).subscription,
  );
  if (direct?.startsWith("sub_")) return direct;

  const parent = (
    invoice as {
      parent?: {
        subscription_details?: {
          subscription?: string | { id?: string } | null;
        };
      };
    }
  ).parent;
  const nested = stripeObjectId(parent?.subscription_details?.subscription);
  return nested?.startsWith("sub_") ? nested : null;
}

function stripeInvoicePriceId(invoice: Stripe.Invoice): string | null {
  const line = invoice.lines?.data?.[0] as
    | {
        price?: { id?: string } | null;
        pricing?: { price_details?: { price?: string } | null } | null;
      }
    | undefined;
  if (typeof line?.price?.id === "string" && line.price.id.startsWith("price_")) {
    return line.price.id;
  }
  const nested = line?.pricing?.price_details?.price;
  return typeof nested === "string" && nested.startsWith("price_") ? nested : null;
}

function stripeInvoiceCheckoutSessionId(invoice: Stripe.Invoice): string | null {
  const parent = (
    invoice as {
      parent?: {
        subscription_details?: {
          metadata?: Record<string, string> | null;
        };
      };
    }
  ).parent;
  const fromMetadata =
    invoice.metadata?.checkoutSessionId ||
    parent?.subscription_details?.metadata?.checkoutSessionId;
  return typeof fromMetadata === "string" && fromMetadata.startsWith("cs_")
    ? fromMetadata
    : null;
}

async function retrieveCheckoutSessionWithPrice(
  stripe: Stripe,
  sessionId: string,
): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["line_items.data.price", "subscription", "invoice"],
  });
}

function chargedAmountFromStripeSession(session: Stripe.Checkout.Session): {
  chargedAmountTotal: number | null;
  chargedCurrency: string | null;
} {
  return {
    chargedAmountTotal:
      typeof session.amount_total === "number" ? session.amount_total : null,
    chargedCurrency:
      typeof session.currency === "string" && session.currency.trim()
        ? session.currency
        : null,
  };
}

function toCheckoutSession(session: Stripe.Checkout.Session): CheckoutSession {
  const purchaseId = requirePurchaseId(session);
  const charged = chargedAmountFromStripeSession(session);
  const subscription =
    session.subscription && typeof session.subscription === "object"
      ? session.subscription
      : null;

  return {
    sessionId: session.id,
    purchaseId,
    provider: "stripe",
    status: mapStripeCheckoutStatus(session),
    redirectUrl: session.url ?? undefined,
    stripePriceId: extractStripePriceId(session),
    stripeAssetId: session.metadata?.assetId || null,
    stripeUserId: session.metadata?.userId || null,
    chargedAmountTotal: charged.chargedAmountTotal,
    chargedCurrency: charged.chargedCurrency,
    checkoutMode: session.mode === "subscription" ? "subscription" : "payment",
    stripeInvoiceId: stripeObjectId(session.invoice),
    stripeSubscriptionId: stripeObjectId(session.subscription),
    stripeCustomerId: stripeObjectId(session.customer),
    subscriptionStatus: subscription?.status ?? null,
  };
}

function toWebhookResult(
  session: Stripe.Checkout.Session,
  status?: PaymentSessionStatus,
): PaymentWebhookResult {
  const charged = chargedAmountFromStripeSession(session);
  return {
    sessionId: session.id,
    purchaseId: requirePurchaseId(session),
    status: status ?? mapStripeCheckoutStatus(session),
    providerReference:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? session.id,
    stripePriceId: extractStripePriceId(session),
    stripeAssetId: session.metadata?.assetId || null,
    stripeUserId: session.metadata?.userId || null,
    chargedAmountTotal: charged.chargedAmountTotal,
    chargedCurrency: charged.chargedCurrency,
  };
}

function toMembershipInvoiceWebhookResult(
  invoice: Stripe.Invoice,
  eventKind: "invoice_paid" | "invoice_failed",
  subscription?: Stripe.Subscription | null,
): PaymentWebhookResult | null {
  const stripeInvoiceId = invoice.id;
  const stripeSubscriptionId =
    stripeInvoiceSubscriptionId(invoice) || stripeObjectId(subscription) || null;
  const stripePriceId =
    stripeInvoicePriceId(invoice) ||
    (typeof subscription?.items?.data?.[0]?.price?.id === "string"
      ? subscription.items.data[0].price.id
      : null);

  if (!stripeInvoiceId || !stripeSubscriptionId) {
    return null;
  }

  const paid =
    eventKind === "invoice_paid" &&
    (invoice.status === "paid" || (invoice.amount_paid ?? 0) > 0);
  const userId =
    subscription?.metadata?.userId || invoice.metadata?.userId || null;

  return {
    sessionId: stripeInvoiceId,
    purchaseId: stripeInvoiceId,
    status: paid ? "completed" : eventKind === "invoice_failed" ? "failed" : "pending",
    providerReference: stripeInvoiceId,
    fulfillment: "membership",
    membershipEvent: eventKind,
    stripeInvoiceId,
    stripeSubscriptionId,
    stripeCustomerId: stripeObjectId(invoice.customer),
    stripePriceId,
    stripeUserId: userId,
    subscriptionStatus: subscription?.status ?? null,
    billingReason: invoice.billing_reason ?? null,
    amountPaid: typeof invoice.amount_paid === "number" ? invoice.amount_paid : null,
    chargedAmountTotal:
      typeof invoice.amount_paid === "number" ? invoice.amount_paid : null,
    chargedCurrency: typeof invoice.currency === "string" ? invoice.currency : null,
    checkoutSessionId: stripeInvoiceCheckoutSessionId(invoice),
  };
}

function toMembershipCheckoutWebhookResult(
  session: Stripe.Checkout.Session,
  status?: PaymentSessionStatus,
): PaymentWebhookResult {
  const subscription = session.subscription;
  const subscriptionObject =
    subscription && typeof subscription === "object" ? subscription : null;
  const invoice = session.invoice;
  const invoiceObject = invoice && typeof invoice === "object" ? invoice : null;
  const mappedStatus = status ?? mapStripeCheckoutStatus(session);
  const eventKind: PaymentWebhookResult["membershipEvent"] =
    mappedStatus === "cancelled" || mappedStatus === "failed"
      ? "checkout_cancelled"
      : "checkout";

  return {
    ...toWebhookResult(session, mappedStatus),
    fulfillment: "membership",
    membershipEvent: eventKind,
    stripeSubscriptionId:
      stripeObjectId(subscription) ||
      (invoiceObject ? stripeInvoiceSubscriptionId(invoiceObject) : null),
    stripeCustomerId: stripeObjectId(session.customer),
    stripeInvoiceId: stripeObjectId(invoice),
    stripePriceId: extractStripePriceId(session),
    subscriptionStatus: subscriptionObject?.status ?? null,
    amountPaid:
      typeof session.amount_total === "number" ? session.amount_total : null,
    checkoutSessionId: session.id,
  };
}

function toMembershipSubscriptionWebhookResult(
  subscription: Stripe.Subscription,
): PaymentWebhookResult {
  const priceId = subscription.items?.data?.[0]?.price?.id ?? null;
  return {
    sessionId: subscription.id,
    purchaseId: subscription.metadata?.purchaseId || subscription.id,
    status:
      subscription.status === "canceled" || subscription.status === "unpaid"
        ? "cancelled"
        : subscription.status === "past_due" ||
            subscription.status === "incomplete_expired"
          ? "failed"
          : subscription.status === "active" || subscription.status === "trialing"
            ? "completed"
            : "pending",
    providerReference: subscription.id,
    fulfillment: "membership",
    membershipEvent: "subscription_updated",
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: stripeObjectId(subscription.customer),
    stripePriceId:
      typeof priceId === "string" && priceId.startsWith("price_") ? priceId : null,
    stripeUserId: subscription.metadata?.userId || null,
    subscriptionStatus: subscription.status,
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
    const isSubscription = (request.mode ?? "payment") === "subscription";
    const paymentMethodTypes = isSubscription
      ? (["card"] as Stripe.Checkout.SessionCreateParams.PaymentMethodType[])
      : getPaymentMethodTypes(request);
    const isOxxo = !isSubscription && paymentMethodTypes.includes("oxxo");
    const priceId = getStripePriceId(request.productId);
    const successPath = (request.successPath ?? "/studio").replace(/^\//, "");
    const cancelPath = (request.cancelPath ?? "/studio").replace(/^\//, "");
    const sessionMetadata = {
      purchaseId,
      assetId: request.assetId ?? "",
      productId: request.productId,
      userId: request.userId,
      paymentMethod: request.paymentMethod,
      amountMxn: String(request.amountMxn),
      ...(request.metadata ?? {}),
    };

    const session = await stripe.checkout.sessions.create({
      // One-off packages stay mode: "payment". Memberships use subscription.
      mode: isSubscription ? "subscription" : "payment",
      allow_promotion_codes: true,
      customer: request.stripeCustomerId || undefined,
      customer_email: request.stripeCustomerId
        ? undefined
        : request.customerEmail,
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
      subscription_data: isSubscription
        ? {
            metadata: {
              userId: request.userId,
              productId: request.productId,
              checkoutKind: "membership",
              purchaseId,
            },
          }
        : undefined,
      metadata: sessionMetadata,
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
    const session = await retrieveCheckoutSessionWithPrice(stripe, sessionId);

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

    if (event.livemode !== isStripeLiveMode()) {
      throw new PaymentProviderError(
        "Stripe webhook livemode does not match STRIPE_SECRET_KEY mode.",
      );
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = await retrieveCheckoutSessionWithPrice(
          stripe,
          (event.data.object as Stripe.Checkout.Session).id,
        );
        if (session.mode === "subscription") {
          return toMembershipCheckoutWebhookResult(session);
        }
        return toWebhookResult(session);
      }
      case "checkout.session.async_payment_succeeded": {
        const session = await retrieveCheckoutSessionWithPrice(
          stripe,
          (event.data.object as Stripe.Checkout.Session).id,
        );
        if (session.mode === "subscription") {
          return toMembershipCheckoutWebhookResult(session, "completed");
        }
        return toWebhookResult(session, "completed");
      }
      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription") {
          return toMembershipCheckoutWebhookResult(session, "failed");
        }
        return toWebhookResult(session, "failed");
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription") {
          return toMembershipCheckoutWebhookResult(session, "cancelled");
        }
        return toWebhookResult(session, "cancelled");
      }
      case "invoice.paid":
      case "invoice.payment_succeeded": {
        const invoice = await stripe.invoices.retrieve(
          (event.data.object as Stripe.Invoice).id,
        );
        if (!stripeInvoiceSubscriptionId(invoice)) {
          return null;
        }
        const subscriptionId = stripeInvoiceSubscriptionId(invoice);
        const subscription = subscriptionId
          ? await stripe.subscriptions.retrieve(subscriptionId)
          : null;
        return toMembershipInvoiceWebhookResult(
          invoice,
          "invoice_paid",
          subscription,
        );
      }
      case "invoice.payment_failed": {
        const invoice = await stripe.invoices.retrieve(
          (event.data.object as Stripe.Invoice).id,
        );
        if (!stripeInvoiceSubscriptionId(invoice)) {
          return null;
        }
        const subscriptionId = stripeInvoiceSubscriptionId(invoice);
        const subscription = subscriptionId
          ? await stripe.subscriptions.retrieve(subscriptionId)
          : null;
        return toMembershipInvoiceWebhookResult(
          invoice,
          "invoice_failed",
          subscription,
        );
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        return toMembershipSubscriptionWebhookResult(
          event.data.object as Stripe.Subscription,
        );
      default:
        console.info(
          `[stripe] Ignoring unhandled webhook event "${event.type}".`,
        );
        return null;
    }
  },
};
