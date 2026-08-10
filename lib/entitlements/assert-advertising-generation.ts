import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEntitlementBalances } from "@/lib/entitlements/balances";
import {
  ADVERTISING_IMAGE_AUTH_REQUIRED_CODE,
  ADVERTISING_IMAGE_AUTH_REQUIRED_MESSAGE,
  ADVERTISING_IMAGE_PACKAGE_REQUIRED_CODE,
  ADVERTISING_IMAGE_PACKAGE_REQUIRED_MESSAGE,
  ADVERTISING_IMAGE_PLANES_HREF,
  ADVERTISING_IMAGE_PURPOSE_FIELD,
  ADVERTISING_IMAGE_PURPOSE_VALUE,
} from "@/lib/entitlements/advertising-image-gate";

export type AdvertisingGenerationGateResult =
  | { ok: true; userId: string }
  | {
      ok: false;
      status: number;
      code:
        | typeof ADVERTISING_IMAGE_AUTH_REQUIRED_CODE
        | typeof ADVERTISING_IMAGE_PACKAGE_REQUIRED_CODE;
      message: string;
      planesHref?: typeof ADVERTISING_IMAGE_PLANES_HREF;
    };

export function isAdvertisingImagePurpose(
  formData: FormData,
): boolean {
  const purpose = formData.get(ADVERTISING_IMAGE_PURPOSE_FIELD);
  return (
    typeof purpose === "string" &&
    purpose.trim() === ADVERTISING_IMAGE_PURPOSE_VALUE
  );
}

/**
 * Server-side gate BEFORE the expensive Advertising Image provider call.
 * Does not consume — consume happens on successful finished persist.
 */
export async function assertAdvertisingImageGenerationAllowed(): Promise<AdvertisingGenerationGateResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      ok: false,
      status: 401,
      code: ADVERTISING_IMAGE_AUTH_REQUIRED_CODE,
      message: ADVERTISING_IMAGE_AUTH_REQUIRED_MESSAGE,
    };
  }

  const balances = await getEntitlementBalances(createAdminClient(), user.id);
  if (balances.advertisingAssetsRemaining < 1) {
    return {
      ok: false,
      status: 402,
      code: ADVERTISING_IMAGE_PACKAGE_REQUIRED_CODE,
      message: ADVERTISING_IMAGE_PACKAGE_REQUIRED_MESSAGE,
      planesHref: ADVERTISING_IMAGE_PLANES_HREF,
    };
  }

  return { ok: true, userId: user.id };
}
