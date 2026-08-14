import "server-only";

import type { User } from "@supabase/supabase-js";

function configuredValues(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isMetapromAdmin(user: User): boolean {
  if (user.app_metadata?.role === "admin" || user.app_metadata?.is_admin === true) {
    return true;
  }

  const adminIds = configuredValues(process.env.METAPROM_ADMIN_USER_IDS);
  const adminEmails = configuredValues(process.env.METAPROM_ADMIN_EMAILS);

  return (
    adminIds.has(user.id.toLowerCase()) ||
    (typeof user.email === "string" && adminEmails.has(user.email.toLowerCase()))
  );
}
