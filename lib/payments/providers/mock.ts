import type {
  CheckoutRequest,
  CheckoutSession,
  PaymentProvider,
  PaymentWebhookResult,
} from "../types";

const mockSessions = new Map<string, CheckoutSession>();

export const mockPaymentProvider: PaymentProvider = {
  id: "mock",

  async createCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
    const purchaseId = crypto.randomUUID();
    const sessionId = `mock_${purchaseId}`;

    const session: CheckoutSession = {
      sessionId,
      purchaseId,
      provider: "mock",
      status:
        request.paymentMethod === "oxxo" ? "awaiting_payment" : "completed",
      oxxoReference:
        request.paymentMethod === "oxxo"
          ? `OXXO-${sessionId.slice(-8).toUpperCase()}`
          : undefined,
      oxxoExpiresAt:
        request.paymentMethod === "oxxo"
          ? new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
          : undefined,
    };

    mockSessions.set(sessionId, session);
    return session;
  },

  async getSessionStatus(sessionId: string): Promise<CheckoutSession> {
    const session = mockSessions.get(sessionId);

    if (!session) {
      throw new Error(`Mock session not found: ${sessionId}`);
    }

    if (session.status === "awaiting_payment") {
      const completed: CheckoutSession = { ...session, status: "completed" };
      mockSessions.set(sessionId, completed);
      return completed;
    }

    return session;
  },

  async handleWebhook(payload: unknown): Promise<PaymentWebhookResult> {
    const body = payload as { sessionId?: string; purchaseId?: string };

    if (!body.sessionId) {
      throw new Error("Webhook missing sessionId.");
    }

    const session = await this.getSessionStatus(body.sessionId);

    return {
      sessionId: session.sessionId,
      purchaseId: session.purchaseId,
      status: session.status,
      providerReference: session.oxxoReference,
    };
  },
};
