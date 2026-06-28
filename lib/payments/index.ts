import { mockPaymentProvider } from "./providers/mock";
import type { PaymentProvider, PaymentProviderId } from "./types";
import { PaymentProviderError } from "./types";

const providers: Partial<Record<PaymentProviderId, PaymentProvider>> = {
  mock: mockPaymentProvider,
};

export function getConfiguredPaymentProviderId(): PaymentProviderId {
  const configured = (process.env.PAYMENT_PROVIDER ?? "mock").trim();

  if (configured === "mock" || configured === "mercadopago" || configured === "stripe") {
    return configured;
  }

  return "mock";
}

export function getPaymentProvider(): PaymentProvider {
  const providerId = getConfiguredPaymentProviderId();
  const provider = providers[providerId];

  if (!provider) {
    throw new PaymentProviderError(
      `Payment provider "${providerId}" is not implemented yet. Set PAYMENT_PROVIDER=mock for development.`,
    );
  }

  return provider;
}

export function registerPaymentProvider(
  providerId: PaymentProviderId,
  provider: PaymentProvider,
): void {
  providers[providerId] = provider;
}
