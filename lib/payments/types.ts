export type PaymentMethod = "card" | "oxxo" | "spei" | "wallet" | "other";

export type PaymentProviderId = "mock" | "mercadopago" | "stripe";

export type PaymentSessionStatus =
  | "pending"
  | "awaiting_payment"
  | "completed"
  | "failed"
  | "cancelled";

export type CheckoutRequest = {
  assetId: string;
  productId: string;
  amountMxn: number;
  currency?: string;
  paymentMethod: PaymentMethod;
  customerEmail?: string;
  userId: string;
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
};

export type PaymentWebhookResult = {
  sessionId: string;
  purchaseId: string;
  status: PaymentSessionStatus;
  providerReference?: string;
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
  handleWebhook(payload: unknown): Promise<PaymentWebhookResult>;
}

export class PaymentProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentProviderError";
  }
}
