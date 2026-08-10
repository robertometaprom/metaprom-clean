import { NextResponse } from "next/server";

import { grantWelcomeAdvertisingImage } from "@/lib/entitlements/grant-welcome-advertising-image";
import { getEntitlementBalances } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { welcomeNetworkKeyFromRequest } from "@/lib/security/welcome-network-key";

export const runtime = "nodejs";

/**
 * Idempotent welcome Advertising Image grant.
 * Server decides eligibility and amount (= 1). Client never supplies quantity.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  try {
    const networkKey = welcomeNetworkKeyFromRequest(request);
    const admin = createAdminClient();
    const grant = await grantWelcomeAdvertisingImage({
      userId: user.id,
      networkKey,
      admin,
    });

    const balances = await getEntitlementBalances(admin, user.id);

    // Neutral UX — never expose network hashes, IPs, or fraud language.
    const message =
      grant.reason === "granted"
        ? "Tu primera Imagen Publicitaria es gratis."
        : grant.reason === "network_ineligible"
          ? "Tu cuenta está lista. Para crear Imágenes Publicitarias, elige un paquete."
          : balances.advertisingAssetsRemaining > 0
            ? "Tu primera Imagen Publicitaria es gratis."
            : null;

    return NextResponse.json({
      granted: grant.granted,
      reason: grant.reason,
      quantity: grant.quantity,
      advertisingAssetsRemaining: balances.advertisingAssetsRemaining,
      commercialsRemaining: balances.commercialsRemaining,
      message,
    });
  } catch (err) {
    console.error("[welcome-advertising-image] grant failed", {
      userId: user.id,
      error: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to initialize welcome advertising image.",
      },
      { status: 500 },
    );
  }
}
