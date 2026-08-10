import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  WELCOME_ADVERTISING_IMAGE_PRODUCT_ID,
  WELCOME_NETWORK_COOLDOWN_HOURS,
} from "@/lib/security/welcome-network-key";

export type WelcomeAdvertisingImageGrantReason =
  | "granted"
  | "already_granted"
  | "network_ineligible";

export type WelcomeAdvertisingImageGrantResult = {
  granted: boolean;
  reason: WelcomeAdvertisingImageGrantReason;
  quantity: number;
  balanceAfter?: number;
  productId: typeof WELCOME_ADVERTISING_IMAGE_PRODUCT_ID;
};

type RpcPayload = {
  granted?: boolean;
  reason?: string;
  quantity?: number;
  balance_after?: number;
};

function normalizeReason(value: unknown): WelcomeAdvertisingImageGrantReason {
  if (value === "granted") return "granted";
  if (value === "network_ineligible") return "network_ineligible";
  return "already_granted";
}

/**
 * Server-only idempotent welcome grant: exactly 1 Advertising Image credit.
 * Caller must supply an already-hashed network key (never raw IP).
 */
export async function grantWelcomeAdvertisingImage(input: {
  userId: string;
  networkKey: string;
  cooldownHours?: number;
  metadata?: Record<string, unknown>;
  admin?: SupabaseClient;
}): Promise<WelcomeAdvertisingImageGrantResult> {
  if (!input.networkKey || input.networkKey.length < 16) {
    throw new Error("Invalid welcome network key.");
  }

  const admin = input.admin ?? createAdminClient();
  const cooldownHours =
    input.cooldownHours ?? WELCOME_NETWORK_COOLDOWN_HOURS;

  const { data, error } = await admin.rpc("grant_welcome_advertising_image", {
    p_user_id: input.userId,
    p_network_key: input.networkKey,
    p_cooldown_hours: cooldownHours,
    p_metadata: {
      source: "api.entitlements.welcome-advertising-image",
      ...input.metadata,
    },
  });

  if (error) {
    throw new Error(
      `Failed to grant welcome advertising image: ${error.message}`,
    );
  }

  const payload = (data ?? {}) as RpcPayload;
  const reason = normalizeReason(payload.reason);
  const granted = Boolean(payload.granted) && reason === "granted";

  return {
    granted,
    reason,
    quantity: granted ? 1 : 0,
    balanceAfter:
      typeof payload.balance_after === "number"
        ? payload.balance_after
        : undefined,
    productId: WELCOME_ADVERTISING_IMAGE_PRODUCT_ID,
  };
}
