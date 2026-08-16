import "server-only";

import type { User } from "@supabase/supabase-js";
import { isMetapromAdminUser } from "./authorization-core";

export function isMetapromAdmin(user: User): boolean {
  return isMetapromAdminUser(user);
}
