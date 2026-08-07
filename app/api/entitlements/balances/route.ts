import { createClient } from "@/lib/supabase/server";
import { getEntitlementBalances } from "@/lib/entitlements";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const balances = await getEntitlementBalances(supabase, user.id);
    return Response.json({
      commercialsRemaining: balances.commercialsRemaining,
      advertisingAssetsRemaining: balances.advertisingAssetsRemaining,
    });
  } catch (err) {
    return Response.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to load entitlement balances.",
      },
      { status: 500 },
    );
  }
}
