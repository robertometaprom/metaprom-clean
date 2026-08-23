import type { User } from "@supabase/supabase-js";
import { isMetapromAdminUser } from "@/lib/admin/authorization-core";

export type AnalyticsActor = {
  user?: User | null;
  getUser?: () => Promise<User | null>;
};

/**
 * Fail-open admin exclusion for first-party analytics.
 *
 * Skip ONLY when the current authenticated session is a proven Metaprom admin.
 * No user, ordinary user, or any lookup/claim failure → do not suppress.
 */
export function shouldSkipAnalyticsForUser(
  user: User | null | undefined,
): boolean {
  try {
    if (!user) return false;
    return isMetapromAdminUser(user);
  } catch {
    return false;
  }
}

export async function shouldSkipAuthenticatedAdminAnalytics(
  actor?: AnalyticsActor,
): Promise<boolean> {
  try {
    let user: User | null | undefined = actor?.user;
    if (user === undefined) {
      if (!actor?.getUser) return false;
      user = await actor.getUser();
    }
    return shouldSkipAnalyticsForUser(user);
  } catch {
    return false;
  }
}

export async function persistFunnelEventUnlessAdmin(
  insert: () => Promise<"inserted" | "duplicate" | "failed">,
  actor?: AnalyticsActor,
): Promise<"inserted" | "duplicate" | "failed" | "skipped"> {
  if (await shouldSkipAuthenticatedAdminAnalytics(actor)) {
    return "skipped";
  }
  return insert();
}

export async function persistShareEventUnlessAdmin(
  insert: () => Promise<boolean>,
  actor?: AnalyticsActor,
): Promise<"skipped" | boolean> {
  if (await shouldSkipAuthenticatedAdminAnalytics(actor)) {
    return "skipped";
  }
  return insert();
}
