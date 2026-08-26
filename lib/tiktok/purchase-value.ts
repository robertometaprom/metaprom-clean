import type { PaymentProviderId } from "@/lib/payments/types";

export type TikTokMoney = {
  value: number;
  currency: string;
};

/**
 * Stripe Purchase value must be the Checkout Session charged total (minor units),
 * not catalog displayPrice (promotions can lower the amount paid).
 * Non-Stripe/mock has no promotions; catalog major units are the charged amount.
 */
export function resolveTikTokPurchaseMoney(input: {
  providerId: PaymentProviderId;
  chargedAmountTotal?: number | null;
  chargedCurrency?: string | null;
  catalogAmountMajor?: number | null;
  catalogCurrency?: string | null;
}): TikTokMoney | null {
  if (input.providerId === "stripe") {
    if (
      typeof input.chargedAmountTotal !== "number" ||
      !Number.isFinite(input.chargedAmountTotal) ||
      typeof input.chargedCurrency !== "string" ||
      !input.chargedCurrency.trim()
    ) {
      return null;
    }
    return {
      value: input.chargedAmountTotal / 100,
      currency: input.chargedCurrency.trim().toUpperCase(),
    };
  }

  if (
    typeof input.catalogAmountMajor !== "number" ||
    !Number.isFinite(input.catalogAmountMajor) ||
    typeof input.catalogCurrency !== "string" ||
    !input.catalogCurrency.trim()
  ) {
    return null;
  }

  return {
    value: input.catalogAmountMajor,
    currency: input.catalogCurrency.trim().toUpperCase(),
  };
}
