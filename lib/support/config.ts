import "server-only";

/**
 * Private GTM #5.2 Support delivery.
 * Recipient stays server-only. Never import this module from client code.
 */
export const SUPPORT_INTERNAL_RECIPIENT = "robertometaprom@gmail.com";

const DEFAULT_EMAIL_DOMAIN = "metaprom.com";
const FROM_LOCAL_PART = "noreply";

export function getResendApiKey(): string | null {
  const key = process.env.RESEND_API_KEY?.trim();
  return key ? key : null;
}

export function getResendEmailDomain(): string {
  const raw = process.env.RESEND_EMAIL_DOMAIN?.trim().toLowerCase() ?? "";
  const host = raw.includes("@") ? (raw.split("@").pop() ?? "") : raw;
  if (/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(host)) {
    return host;
  }
  return DEFAULT_EMAIL_DOMAIN;
}

export function getSupportFromAddress(): string {
  return `Metaprom AI <${FROM_LOCAL_PART}@${getResendEmailDomain()}>`;
}
