/**
 * Request market / country — independent of locale (es/en).
 *
 * There is no in-app country selector or persisted market cookie.
 * Country is read from the same class of platform request headers already
 * used for request identity (see getClientIp), not from Accept-Language.
 *
 * Vercel sets `x-vercel-ip-country`. Cloudflare sets `cf-ipcountry`.
 * Locale switching must never change this result.
 */

export const MEXICO_COUNTRY_CODE = "MX";

const PLATFORM_COUNTRY_HEADERS = [
  "x-vercel-ip-country",
  "cf-ipcountry",
] as const;

export function readCountryCode(
  headerValue: string | null | undefined,
): string | null {
  const value = headerValue?.trim().toUpperCase();
  if (!value || value === "XX" || value === "T1") return null;
  if (!/^[A-Z]{2}$/.test(value)) return null;
  return value;
}

export function resolveCountryCode(
  values: Array<string | null | undefined>,
): string | null {
  for (const value of values) {
    const code = readCountryCode(value);
    if (code) return code;
  }
  return null;
}

/**
 * Mexico-first catalog (MXN + OXXO at checkout). Missing geo — local/dev —
 * presents Mexico payment methods. An explicit non-MX country hides OXXO.
 */
export function isMexicoMarket(countryCode: string | null): boolean {
  return countryCode == null || countryCode === MEXICO_COUNTRY_CODE;
}

export async function getRequestCountryCode(): Promise<string | null> {
  const { headers } = await import("next/headers");
  const headerStore = await headers();
  return resolveCountryCode(
    PLATFORM_COUNTRY_HEADERS.map((name) => headerStore.get(name)),
  );
}

export async function isMexicoRequestMarket(): Promise<boolean> {
  return isMexicoMarket(await getRequestCountryCode());
}
