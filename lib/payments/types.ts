export type PaymentMethod = "card" | "oxxo" | "spei" | "wallet" | "other";

export type PaymentProviderId = "mock" | "mercadopago" | "stripe";

export type PaymentSessionStatus =
  | "pending"
  | "awaiting_payment"
  | "completed"
  | "failed"
  | "cancelled";

export type CheckoutMode = "payment" | "subscription";

export type MembershipWebhookEventKind =
  | "checkout"
  | "invoice_paid"
  | "invoice_failed"
  | "subscription_updated"
  | "checkout_cancelled";

export type CheckoutRequest = {
  /** Optional for package purchases that are not asset-bound. */
  assetId?: string;
  productId: string;
  amountMxn: number;
  currency?: string;
  paymentMethod: PaymentMethod;
  /** When set, overrides single-method selection (e.g. card + OXXO packages). */
  paymentMethodTypes?: Array<"card" | "oxxo">;
  /** Default payment (one-off). Memberships use subscription. */
  mode?: CheckoutMode;
  /** Existing Stripe Customer to reuse for subscription checkout. */
  stripeCustomerId?: string;
  customerEmail?: string;
  userId: string;
  successPath?: string;
  cancelPath?: string;
  metadata?: Record<string, string>;
};

export type CheckoutSession = {
  sessionId: string;
  purchaseId: string;
  provider: PaymentProviderId;
  status: PaymentSessionStatus;
  redirectUrl?: string;
  oxxoReference?: string;
  oxxoExpiresAt?: string;
  barcodeUrl?: string;
  /** Charged Stripe Price ID when expanded from Checkout Session line items. */
  stripePriceId?: string | null;
  stripeAssetId?: string | null;
  stripeUserId?: string | null;
  /** Stripe Checkout Session amount_total in minor units, when retrieved. */
  chargedAmountTotal?: number | null;
  /** Stripe Checkout Session currency, when retrieved. */
  chargedCurrency?: string | null;
  checkoutMode?: CheckoutMode;
  stripeInvoiceId?: string | null;
  stripeSubscriptionId?: string | null;
  stripeCustomerId?: string | null;
  subscriptionStatus?: string | null;
};

export type PaymentWebhookResult = {
  sessionId: string;
  purchaseId: string;
  status: PaymentSessionStatus;
  providerReference?: string;
  /** Charged Stripe Price ID; catalog mapping determines the grant. */
  stripePriceId?: string | null;
  /** Server-written Checkout Session metadata; used only as a tamper check. */
  stripeAssetId?: string | null;
  stripeUserId?: string | null;
  /** Stripe Checkout Session amount_total in minor units, when retrieved. */
  chargedAmountTotal?: number | null;
  /** Stripe Checkout Session currency, when retrieved. */
  chargedCurrency?: string | null;
  /**
   * package (default): V1 one-off checkout.
   * membership: recurring invoice / subscription events — do not use catalog grants.
   */
  fulfillment?: "package" | "membership";
  membershipEvent?: MembershipWebhookEventKind;
  stripeInvoiceId?: string | null;
  stripeSubscriptionId?: string | null;
  stripeCustomerId?: string | null;
  subscriptionStatus?: string | null;
  billingReason?: string | null;
  amountPaid?: number | null;
  checkoutSessionId?: string | null;
};

export type PaymentWebhookPayload = {
  rawBody?: string;
  payload?: unknown;
  headers?: Headers;
  signature?: string | null;
};

export interface PaymentProvider {
  readonly id: PaymentProviderId;
  createCheckout(request: CheckoutRequest): Promise<CheckoutSession>;
  getSessionStatus(sessionId: string): Promise<CheckoutSession>;
  handleWebhook(payload: unknown): Promise<PaymentWebhookResult | null>;
}

export class PaymentProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentProviderError";
  }
}
