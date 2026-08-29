import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getMembershipProductById,
  getMembershipPurchasability,
  type MembershipProduct,
  type MembershipProductId,
} from "@/lib/pricing/memberships";
import { recordCheckoutStarted } from "@/lib/analytics/record";
import { trackTikTokServerEvent } from "@/lib/tiktok/events-api";
import { tiktokInitiateCheckoutEventId } from "@/lib/tiktok/ids";
import { createAdminClient } from "@/lib/supabase/admin";

import { getPaymentProvider } from "./index";
import { persistMembershipInvoice } from "./membership-persistence";
import type { CheckoutSession, PaymentMethod, PaymentProviderId } from "./types";
import { PaymentProviderError } from "./types";
import { assertStripeMembershipPriceMatchesCatalog } from "./validate-stripe-price";

export type CreateMembershipCheckoutInput = {
  productKey: string;
  userId: string;
  customerEmail?: string;
  paymentMethod?: PaymentMethod;
  tiktokTtclid?: string | null;
  tiktokTtp?: string | null;
};

export type CreateMembershipCheckoutResult = {
  productKey: MembershipProductId;
  membership: MembershipProduct;
  amountMxn: number;
  currency: "MXN";
  quantity: number;
  provider: PaymentProviderId;
  session: CheckoutSession;
  purchaseId: number | string;
};

async function loadExistingStripeCustomerId(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<string | undefined> {
  const { data } = await admin
    .from("memberships")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ stripe_customer_id: string }>();

  const customerId = data?.stripe_customer_id?.trim();
  return customerId && customerId.startsWith("cus_") ? customerId : undefined;
}

export async function createMembershipCheckoutSession(
  _supabase: SupabaseClient,
  input: CreateMembershipCheckoutInput,
): Promise<CreateMembershipCheckoutResult> {
  const productKey = input.productKey.trim();
  const membership = getMembershipProductById(productKey);

  if (!membership) {
    throw new PaymentProviderError(`Invalid membership key: ${productKey}`);
  }

  const purchasability = getMembershipPurchasability(membership);
  if (!purchasability.purchasable) {
    throw new PaymentProviderError(
      `Membership is not purchasable: ${productKey}. Configure a matching recurring Stripe Price.`,
    );
  }

  const paymentMethod = input.paymentMethod ?? "card";
  if (paymentMethod === "oxxo") {
    throw new PaymentProviderError(
      "Memberships require a reusable card payment method. OXXO remains available for one-off purchases.",
    );
  }

  const provider = getPaymentProvider();
  const admin = createAdminClient();

  if (provider.id === "stripe") {
    await assertStripeMembershipPriceMatchesCatalog(membership);
  }

  const existingCustomerId =
    provider.id === "stripe"
      ? await loadExistingStripeCustomerId(admin, input.userId)
      : undefined;

  const session = await provider.createCheckout({
    productId: membership.id,
    amountMxn: membership.displayPrice,
    currency: membership.currency,
    paymentMethod: "card",
    paymentMethodTypes: ["card"],
    mode: "subscription",
    stripeCustomerId: existingCustomerId,
    customerEmail: input.customerEmail,
    userId: input.userId,
    successPath: "/planes/compra",
    cancelPath: "/planes",
    metadata: {
      packageId: membership.id,
      packageName: membership.name,
      category: "membership",
      quantity: String(membership.commercials),
      entitlementKind: "commercial",
      checkoutKind: "membership",
      tier: membership.tier,
      billingCycle: membership.billingCycle,
    },
  });

  const { data: purchase, error: purchaseError } = await admin
    .from("purchases")
    .insert({
      user_id: input.userId,
      asset_id: null,
      product_id: membership.id,
      amount_mxn: membership.displayPrice,
      currency: "MXN",
      status: session.status,
      provider: provider.id,
      provider_reference: session.sessionId,
      payment_method: "card",
      metadata: {
        providerPurchaseId: session.purchaseId,
        sessionId: session.sessionId,
        packageId: membership.id,
        packageName: membership.name,
        category: "membership",
        quantity: membership.commercials,
        entitlementKind: "commercial",
        checkoutKind: "membership",
        tier: membership.tier,
        billingCycle: membership.billingCycle,
        ...(input.tiktokTtclid ? { tiktokTtclid: input.tiktokTtclid } : {}),
        ...(input.tiktokTtp ? { tiktokTtp: input.tiktokTtp } : {}),
      },
      completed_at:
        session.status === "completed" ? new Date().toISOString() : null,
    })
    .select("id, status")
    .single();

  if (purchaseError || !purchase) {
    throw new PaymentProviderError(
      `Membership purchase insert failed: ${purchaseError?.message ?? "unknown error"}`,
    );
  }

  try {
    if (session.sessionId) {
      await recordCheckoutStarted({
        userId: input.userId,
        purchaseId: purchase.id,
        productId: membership.id,
        amountMxn: membership.displayPrice,
        currency: "MXN",
        sessionId: session.sessionId,
        assetId: null,
      });
    }
    await trackTikTokServerEvent({
      event: "InitiateCheckout",
      eventId: tiktokInitiateCheckoutEventId(purchase.id),
      pageUrl: "/planes",
      user: {
        ttclid: input.tiktokTtclid ?? null,
        ttp: input.tiktokTtp ?? null,
      },
      properties: {
        value: membership.displayPrice,
        currency: "MXN",
        contentId: membership.id,
        contentName: membership.name,
      },
    });
  } catch (analyticsError) {
    console.error("membership checkout_started analytics failed:", analyticsError);
  }

  // Mock/instant completion: grant through the invoice-idempotent path only.
  if (session.status === "completed") {
    await persistMembershipInvoice(admin, {
      sessionId: session.sessionId,
      purchaseId: String(purchase.id),
      status: "completed",
      fulfillment: "membership",
      membershipEvent: "invoice_paid",
      stripeInvoiceId: `in_mock_${session.sessionId}`,
      stripeSubscriptionId: `sub_mock_${session.sessionId}`,
      stripeCustomerId: existingCustomerId ?? `cus_mock_${input.userId.slice(0, 8)}`,
      stripePriceId: process.env[membership.stripeEnvironmentVariable] ?? null,
      stripeUserId: input.userId,
      checkoutSessionId: session.sessionId,
      subscriptionStatus: "active",
      billingReason: "subscription_create",
      amountPaid: membership.displayPrice * 100,
      chargedAmountTotal: membership.displayPrice * 100,
      chargedCurrency: "mxn",
    });
  }

  return {
    productKey: membership.id,
    membership,
    amountMxn: membership.displayPrice,
    currency: "MXN",
    quantity: membership.commercials,
    provider: provider.id,
    session,
    purchaseId: purchase.id,
  };
}
