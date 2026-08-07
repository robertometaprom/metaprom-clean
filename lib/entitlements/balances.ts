import type { SupabaseClient } from "@supabase/supabase-js";

import type { EntitlementBalances, EntitlementKind } from "./types";

type BalanceRow = {
  user_id: string;
  commercials_remaining: number;
  advertising_assets_remaining: number;
};

export async function getEntitlementBalances(
  supabase: SupabaseClient,
  userId: string,
): Promise<EntitlementBalances> {
  const { data, error } = await supabase
    .from("entitlement_balances")
    .select("user_id, commercials_remaining, advertising_assets_remaining")
    .eq("user_id", userId)
    .maybeSingle<BalanceRow>();

  if (error) {
    throw new Error(`Failed to load entitlement balances: ${error.message}`);
  }

  return {
    userId,
    commercialsRemaining: data?.commercials_remaining ?? 0,
    advertisingAssetsRemaining: data?.advertising_assets_remaining ?? 0,
  };
}

export function remainingForKind(
  balances: EntitlementBalances,
  kind: EntitlementKind,
): number {
  return kind === "commercial"
    ? balances.commercialsRemaining
    : balances.advertisingAssetsRemaining;
}
