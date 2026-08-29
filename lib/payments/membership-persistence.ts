import type { SupabaseClient } from "@supabase/supabase-js";

import { grantCommercialCreditsFromPurchase } from "@/lib/entitlements";
import {
  getMembershipProductById,
  resolveMembershipByStripePriceId,
  type MembershipProduct,
} from "@/lib/pricing/memberships";

import type { PaymentWebhookResult } from "./types";

type PurchaseRecord = {
  id: number | string;
  user_id: string;
  product_id: string;
  status: string;
  metadata?: Record<string, unknown> | null;
};

type MembershipRecord = {
  id: number | string;
  user_id: string;
  membership_key: string;
  tier: string;
  billing_cycle: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  stripe_price_id: string;
  status: string;
  last_invoice_id: string | null;
};

function asMetadata(
  metadata: PurchaseRecord["metadata"],
): Record<string, unknown> {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata;
  }
  return {};
}

function stripeStatusOr(status: string | null | undefined): string {
  return status && status.trim() ? status.trim() : "incomplete";
}

export function resolveTrustedMembershipProduct(input: {
  productId?: string | null;
  stripePriceId?: string | null;
}): MembershipProduct | null {
  const stripePriceId = input.stripePriceId?.trim() || null;
  if (stripePriceId) {
    return resolveMembershipByStripePriceId(stripePriceId);
  }
  if (input.productId) {
    return getMembershipProductById(input.productId) ?? null;
  }
  return null;
}

async function findMembershipBySubscription(
  supabase: SupabaseClient,
  subscriptionId: string,
): Promise<MembershipRecord | null> {
  const { data, error } = await supabase
    .from("memberships")
    .select(
      "id, user_id, membership_key, tier, billing_cycle, stripe_customer_id, stripe_subscription_id, stripe_price_id, status, last_invoice_id",
    )
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle<MembershipRecord>();

  if (error) {
    throw new Error(
      `Failed to load membership for subscription ${subscriptionId}: ${error.message}`,
    );
  }

  return data ?? null;
}

async function findCheckoutPurchaseForMembership(
  supabase: SupabaseClient,
  input: {
    userId?: string | null;
    productId?: string | null;
    checkoutSessionId?: string | null;
  },
): Promise<PurchaseRecord | null> {
  if (input.checkoutSessionId) {
    const { data, error } = await supabase
      .from("purchases")
      .select("id, user_id, product_id, status, metadata")
      .eq("provider", "stripe")
      .eq("provider_reference", input.checkoutSessionId)
      .maybeSingle<PurchaseRecord>();

    if (error) {
      throw new Error(
        `Failed to load membership checkout purchase: ${error.message}`,
      );
    }
    if (data) return data;
  }

  if (!input.userId || !input.productId) {
    return null;
  }

  const { data, error } = await supabase
    .from("purchases")
    .select("id, user_id, product_id, status, metadata")
    .eq("user_id", input.userId)
    .eq("product_id", input.productId)
    .eq("provider", "stripe")
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    throw new Error(
      `Failed to find membership checkout purchase: ${error.message}`,
    );
  }

  const rows = (data ?? []) as PurchaseRecord[];
  return (
    rows.find((row) => asMetadata(row.metadata).checkoutKind === "membership") ??
    null
  );
}

async function findPurchaseByInvoice(
  supabase: SupabaseClient,
  invoiceId: string,
): Promise<PurchaseRecord | null> {
  const { data, error } = await supabase
    .from("purchases")
    .select("id, user_id, product_id, status, metadata")
    .eq("provider", "stripe")
    .eq("provider_reference", invoiceId)
    .maybeSingle<PurchaseRecord>();

  if (error) {
    throw new Error(
      `Failed to load membership invoice purchase ${invoiceId}: ${error.message}`,
    );
  }

  return data ?? null;
}

async function upsertMembership(
  supabase: SupabaseClient,
  input: {
    userId: string;
    product: MembershipProduct;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    stripePriceId: string;
    status: string;
    lastInvoiceId?: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from("memberships").upsert(
    {
      user_id: input.userId,
      membership_key: input.product.id,
      tier: input.product.tier,
      billing_cycle: input.product.billingCycle,
      stripe_customer_id: input.stripeCustomerId,
      stripe_subscription_id: input.stripeSubscriptionId,
      stripe_price_id: input.stripePriceId,
      status: input.status,
      last_invoice_id: input.lastInvoiceId ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );

  if (error) {
    throw new Error(
      `Failed to persist membership ${input.stripeSubscriptionId}: ${error.message}`,
    );
  }
}

async function resolveMembershipUserId(
  supabase: SupabaseClient,
  result: PaymentWebhookResult,
  product: MembershipProduct,
): Promise<string | null> {
  if (result.stripeSubscriptionId) {
    const existing = await findMembershipBySubscription(
      supabase,
      result.stripeSubscriptionId,
    );
    if (existing) {
      if (result.stripeUserId && result.stripeUserId !== existing.user_id) {
        throw new Error(
          `Membership subscription ${result.stripeSubscriptionId} user does not match Stripe metadata.`,
        );
      }
      return existing.user_id;
    }
  }

  const checkout = await findCheckoutPurchaseForMembership(supabase, {
    userId: result.stripeUserId,
    productId: product.id,
    checkoutSessionId: result.checkoutSessionId,
  });

  return checkout?.user_id ?? null;
}

async function insertInvoicePurchase(
  supabase: SupabaseClient,
  input: {
    userId: string;
    product: MembershipProduct;
    invoiceId: string;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string;
    checkoutSessionId?: string | null;
    billingReason?: string | null;
  },
): Promise<PurchaseRecord> {
  const existing = await findPurchaseByInvoice(supabase, input.invoiceId);
  if (existing) {
    if (existing.user_id !== input.userId) {
      throw new Error(
        `Invoice purchase ${input.invoiceId} belongs to a different user.`,
      );
    }
    return existing;
  }

  const insert = {
    user_id: input.userId,
    asset_id: null,
    product_id: input.product.id,
    amount_mxn: input.product.displayPrice,
    currency: "MXN",
    status: "pending",
    provider: "stripe",
    provider_reference: input.invoiceId,
    payment_method: "card",
    metadata: {
      checkoutKind: "membership",
      membershipKey: input.product.id,
      tier: input.product.tier,
      billingCycle: input.product.billingCycle,
      quantity: input.product.commercials,
      entitlementKind: "commercial",
      stripeInvoiceId: input.invoiceId,
      stripeSubscriptionId: input.stripeSubscriptionId,
      stripeCustomerId: input.stripeCustomerId,
      checkoutSessionId: input.checkoutSessionId ?? null,
      billingReason: input.billingReason ?? null,
    },
  };

  const { data, error } = await supabase
    .from("purchases")
    .insert(insert)
    .select("id, user_id, product_id, status, metadata")
    .single<PurchaseRecord>();

  if (error) {
    if (error.code === "23505") {
      const raced = await findPurchaseByInvoice(supabase, input.invoiceId);
      if (raced) return raced;
    }
    throw new Error(
      `Failed to insert membership invoice purchase ${input.invoiceId}: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      `Failed to insert membership invoice purchase ${input.invoiceId}.`,
    );
  }

  return data;
}

export async function persistMembershipStatus(
  supabase: SupabaseClient,
  result: PaymentWebhookResult,
): Promise<void> {
  if (!result.stripeSubscriptionId) return;

  const product = resolveTrustedMembershipProduct({
    stripePriceId: result.stripePriceId,
  });
  const existing = await findMembershipBySubscription(
    supabase,
    result.stripeSubscriptionId,
  );
  const userId = existing?.user_id ?? result.stripeUserId ?? null;
  const resolvedProduct =
    product ??
    (existing ? getMembershipProductById(existing.membership_key) : null);

  if (!userId || !resolvedProduct || !result.stripeCustomerId) {
    return;
  }

  await upsertMembership(supabase, {
    userId,
    product: resolvedProduct,
    stripeCustomerId: result.stripeCustomerId,
    stripeSubscriptionId: result.stripeSubscriptionId,
    stripePriceId: result.stripePriceId || resolvedProduct.id,
    status: stripeStatusOr(result.subscriptionStatus),
    lastInvoiceId: existing?.last_invoice_id ?? result.stripeInvoiceId ?? null,
  });
}

export async function persistMembershipCheckoutSession(
  supabase: SupabaseClient,
  result: PaymentWebhookResult,
): Promise<PurchaseRecord | null> {
  const checkoutSessionId = result.checkoutSessionId || result.sessionId;
  const checkout = await findCheckoutPurchaseForMembership(supabase, {
    userId: result.stripeUserId,
    productId: result.stripePriceId
      ? resolveMembershipByStripePriceId(result.stripePriceId)?.id
      : undefined,
    checkoutSessionId,
  });

  if (!checkout) {
    return null;
  }

  if (result.stripeUserId && result.stripeUserId !== checkout.user_id) {
    throw new Error(
      `Membership checkout ${checkout.id} user does not match Stripe session.`,
    );
  }

  const product = resolveTrustedMembershipProduct({
    productId: checkout.product_id,
    stripePriceId: result.stripePriceId,
  });

  const nextStatus =
    result.membershipEvent === "checkout_cancelled"
      ? result.status
      : result.status;

  const metadata = {
    ...asMetadata(checkout.metadata),
    stripeSubscriptionId: result.stripeSubscriptionId,
    stripeCustomerId: result.stripeCustomerId,
    stripeInvoiceId: result.stripeInvoiceId,
    subscriptionStatus: result.subscriptionStatus,
  };

  const { error } = await supabase
    .from("purchases")
    .update({
      status: nextStatus,
      completed_at:
        nextStatus === "completed" ? new Date().toISOString() : null,
      metadata,
    })
    .eq("id", checkout.id);

  if (error) {
    throw new Error(
      `Failed to update membership checkout purchase ${checkout.id}: ${error.message}`,
    );
  }

  if (product && result.stripeSubscriptionId && result.stripeCustomerId) {
    await upsertMembership(supabase, {
      userId: checkout.user_id,
      product,
      stripeCustomerId: result.stripeCustomerId,
      stripeSubscriptionId: result.stripeSubscriptionId,
      stripePriceId: result.stripePriceId || "",
      status: stripeStatusOr(result.subscriptionStatus),
      lastInvoiceId: result.stripeInvoiceId ?? null,
    });
  }

  return { ...checkout, status: nextStatus, metadata };
}

export async function persistMembershipInvoice(
  supabase: SupabaseClient,
  result: PaymentWebhookResult,
): Promise<{
  granted: boolean;
  quantity: number;
  productId: string;
  purchaseId: number | string;
  userId: string;
} | null> {
  const product = resolveTrustedMembershipProduct({
    stripePriceId: result.stripePriceId,
  });

  if (!product) {
    return null;
  }

  if (!result.stripeInvoiceId || !result.stripeSubscriptionId) {
    return null;
  }

  const userId = await resolveMembershipUserId(supabase, result, product);
  if (!userId) {
    throw new Error(
      `Cannot resolve Metaprom user for membership invoice ${result.stripeInvoiceId}.`,
    );
  }

  if (result.stripeCustomerId) {
    await upsertMembership(supabase, {
      userId,
      product,
      stripeCustomerId: result.stripeCustomerId,
      stripeSubscriptionId: result.stripeSubscriptionId,
      stripePriceId: result.stripePriceId || "",
      status: stripeStatusOr(
        result.membershipEvent === "invoice_failed"
          ? "past_due"
          : result.subscriptionStatus,
      ),
      lastInvoiceId: result.stripeInvoiceId,
    });
  }

  const paid =
    result.membershipEvent === "invoice_paid" &&
    result.status === "completed" &&
    (result.amountPaid ?? 0) > 0;

  if (!paid) {
    return {
      granted: false,
      quantity: 0,
      productId: product.id,
      purchaseId: result.stripeInvoiceId,
      userId,
    };
  }

  const invoicePurchase = await insertInvoicePurchase(supabase, {
    userId,
    product,
    invoiceId: result.stripeInvoiceId,
    stripeCustomerId: result.stripeCustomerId ?? null,
    stripeSubscriptionId: result.stripeSubscriptionId,
    checkoutSessionId: result.checkoutSessionId,
    billingReason: result.billingReason,
  });

  if (invoicePurchase.status !== "completed") {
    const { error } = await supabase
      .from("purchases")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        product_id: product.id,
        amount_mxn: product.displayPrice,
      })
      .eq("id", invoicePurchase.id);

    if (error) {
      throw new Error(
        `Failed to complete membership invoice purchase ${invoicePurchase.id}: ${error.message}`,
      );
    }
  }

  if (result.checkoutSessionId) {
    const checkout = await findCheckoutPurchaseForMembership(supabase, {
      userId,
      productId: product.id,
      checkoutSessionId: result.checkoutSessionId,
    });
    if (checkout) {
      await supabase
        .from("purchases")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          metadata: {
            ...asMetadata(checkout.metadata),
            lastPaidInvoiceId: result.stripeInvoiceId,
            lastGrantPurchaseId: invoicePurchase.id,
            stripeSubscriptionId: result.stripeSubscriptionId,
            stripeCustomerId: result.stripeCustomerId,
          },
        })
        .eq("id", checkout.id);
    }
  }

  const grant = await grantCommercialCreditsFromPurchase(supabase, {
    userId,
    purchaseId: invoicePurchase.id,
    productId: product.id,
    quantity: product.commercials,
    metadata: {
      checkoutKind: "membership",
      membershipKey: product.id,
      tier: product.tier,
      billingCycle: product.billingCycle,
      stripeInvoiceId: result.stripeInvoiceId,
      stripeSubscriptionId: result.stripeSubscriptionId,
      stripeCheckoutSessionId: result.checkoutSessionId ?? null,
      billingReason: result.billingReason ?? null,
      additive: true,
    },
  });

  return {
    granted: grant.granted,
    quantity: product.commercials,
    productId: product.id,
    purchaseId: invoicePurchase.id,
    userId,
  };
}

export async function persistMembershipWebhook(
  supabase: SupabaseClient,
  result: PaymentWebhookResult,
): Promise<PurchaseRecord | null> {
  if (result.membershipEvent === "invoice_paid") {
    await persistMembershipInvoice(supabase, result);
    return findPurchaseByInvoice(supabase, result.stripeInvoiceId ?? "");
  }

  if (result.membershipEvent === "invoice_failed") {
    await persistMembershipInvoice(supabase, result);
    return null;
  }

  if (result.membershipEvent === "subscription_updated") {
    await persistMembershipStatus(supabase, result);
    return null;
  }

  return persistMembershipCheckoutSession(supabase, result);
}

export async function recoverMembershipGrantFromCheckout(
  supabase: SupabaseClient,
  result: PaymentWebhookResult,
): Promise<Awaited<ReturnType<typeof persistMembershipInvoice>>> {
  if (!result.stripeInvoiceId || result.status !== "completed") {
    if (result.stripeSubscriptionId) {
      await persistMembershipCheckoutSession(supabase, result);
    }
    return null;
  }

  return persistMembershipInvoice(supabase, {
    ...result,
    fulfillment: "membership",
    membershipEvent: "invoice_paid",
    status: "completed",
  });
}
