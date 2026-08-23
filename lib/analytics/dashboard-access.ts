import type { User } from "@supabase/supabase-js";
import { isMetapromAdminUser } from "../admin/authorization-core";

export const ANALYTICS_LOGIN_PATH = "/login?next=/analytics";
export const ANALYTICS_DENIED_PATH = "/studio";

export type AnalyticsAccess = "anonymous" | "denied" | "allowed";

/**
 * Internal analytics uses the same admin gate as /admin/dashboard.
 * No weaker shortcut: session required + Metaprom admin claim/allow-list.
 */
export function resolveAnalyticsAccess(user: User | null | undefined): AnalyticsAccess {
  if (!user) return "anonymous";
  if (!isMetapromAdminUser(user)) return "denied";
  return "allowed";
}

export function analyticsAuthRedirect(
  user: User | null | undefined,
): typeof ANALYTICS_LOGIN_PATH | typeof ANALYTICS_DENIED_PATH | null {
  const access = resolveAnalyticsAccess(user);
  if (access === "anonymous") return ANALYTICS_LOGIN_PATH;
  if (access === "denied") return ANALYTICS_DENIED_PATH;
  return null;
}

/** Convenience only. Server `analyticsAuthRedirect` remains authoritative. */
export function canSeeAnalyticsNav(user: User | null | undefined): boolean {
  return resolveAnalyticsAccess(user) === "allowed";
}
