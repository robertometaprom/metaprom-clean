import { createClient } from "@supabase/supabase-js";

function readArgument(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1]?.trim() : undefined;
}

const userId = readArgument("user");
const kind = readArgument("kind");
const quantity = Number(readArgument("quantity"));
const reason = readArgument("reason");
const requestId = readArgument("request-id") || crypto.randomUUID();

if (!userId || !["commercial", "advertising_asset"].includes(kind)) {
  throw new Error(
    "Usage: npm run admin:grant -- --user <uuid> --kind <commercial|advertising_asset> --quantity <positive integer> --reason <note>",
  );
}

if (!Number.isInteger(quantity) || quantity <= 0 || !reason) {
  throw new Error("Quantity must be a positive integer and reason is required.");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
  );
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await admin.rpc("admin_grant_entitlement", {
  p_request_id: requestId,
  p_user_id: userId,
  p_entitlement_kind: kind,
  p_quantity: quantity,
  p_reason: reason,
  p_metadata: {
    source: "internal_admin_tool",
    grantedBy: "service_role_operator",
  },
});

if (error) {
  throw new Error(`Admin grant failed: ${error.message}`);
}

const result = Array.isArray(data) ? data[0] : data;
console.log(
  JSON.stringify({
    ok: true,
    requestId,
    userId,
    kind,
    quantity,
    granted: Boolean(result?.granted),
    balanceAfter: result?.balance_after,
  }),
);
