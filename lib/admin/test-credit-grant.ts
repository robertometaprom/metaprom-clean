import type { SupabaseClient } from "@supabase/supabase-js";
import { getEntitlementBalances } from "@/lib/entitlements/balances";
import type { EntitlementBalances, EntitlementKind } from "@/lib/entitlements/types";

export const ADMIN_TEST_GRANT_CLASSIFICATION = "admin_test_non_revenue";
export const ADMIN_TEST_GRANT_SOURCE = "admin_test_credit_ui";

export type AdminTestCreditGrantInput = {
  requestId: string;
  userId: string;
  kind: EntitlementKind;
  quantity: number;
  reason: string;
  grantedByUserId: string;
};

export type AdminTestCreditGrantResult = {
  granted: boolean;
  balanceAfter: number;
  balances: EntitlementBalances;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseAdminTestCreditGrantInput(value: unknown): Omit<AdminTestCreditGrantInput, "userId" | "grantedByUserId"> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("La solicitud no es válida.");
  }

  const input = value as Record<string, unknown>;
  if (typeof input.requestId !== "string" || !UUID_PATTERN.test(input.requestId)) {
    throw new Error("La solicitud necesita un identificador válido.");
  }
  if (input.kind !== "commercial" && input.kind !== "advertising_asset") {
    throw new Error("Selecciona un tipo de crédito válido.");
  }
  if (!Number.isInteger(input.quantity) || (input.quantity as number) <= 0 || (input.quantity as number) > 100) {
    throw new Error("La cantidad debe ser un entero positivo entre 1 y 100.");
  }
  if (typeof input.reason !== "string" || input.reason.trim().length < 3 || input.reason.trim().length > 200) {
    throw new Error("Escribe un motivo de 3 a 200 caracteres.");
  }

  return {
    requestId: input.requestId,
    kind: input.kind,
    quantity: input.quantity as number,
    reason: input.reason.trim(),
  };
}

export async function grantAdminTestCredits(
  admin: SupabaseClient,
  input: AdminTestCreditGrantInput,
): Promise<AdminTestCreditGrantResult> {
  const { data, error } = await admin.rpc("admin_grant_entitlement", {
    p_request_id: input.requestId,
    p_user_id: input.userId,
    p_entitlement_kind: input.kind,
    p_quantity: input.quantity,
    p_reason: input.reason,
    p_metadata: {
      source: ADMIN_TEST_GRANT_SOURCE,
      classification: ADMIN_TEST_GRANT_CLASSIFICATION,
      non_revenue: true,
      granted_by_user_id: input.grantedByUserId,
    },
  });

  if (error) {
    throw new Error(`No se pudieron acreditar los créditos de prueba: ${error.message}`);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row.balance_after !== "number" || typeof row.granted !== "boolean") {
    throw new Error("La acreditación no devolvió un resultado válido.");
  }

  return {
    granted: row.granted,
    balanceAfter: row.balance_after,
    balances: await getEntitlementBalances(admin, input.userId),
  };
}
