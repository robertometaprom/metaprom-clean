import type { Locale } from "@/lib/i18n";
import {
  MAX_SUPPORT_MESSAGE_LENGTH,
  MAX_SUPPORT_NAME_LENGTH,
  MIN_SUPPORT_MESSAGE_LENGTH,
  MIN_SUPPORT_NAME_LENGTH,
} from "@/lib/security/limits";

export const SUPPORT_CATEGORY_IDS = [
  "payments",
  "account",
  "production",
  "technical",
  "other",
] as const;

export type SupportCategoryId = (typeof SUPPORT_CATEGORY_IDS)[number];

export const SUPPORT_HONEYPOT_FIELD = "website";

export const SUPPORT_PATH = "/soporte";

export const SUPPORT_API_PATH = "/api/support";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REQUEST_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type SupportFormInput = {
  name: string;
  email: string;
  category: SupportCategoryId;
  message: string;
  locale: Locale;
  requestId: string;
};

export type SupportParseResult =
  | { ok: true; honeypot: true }
  | { ok: true; honeypot: false; payload: SupportFormInput }
  | { ok: false };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value.trim();
}

export function isSupportCategoryId(value: string): value is SupportCategoryId {
  return (SUPPORT_CATEGORY_IDS as readonly string[]).includes(value);
}

export function isValidSupportEmail(email: string): boolean {
  if (email.length < 5 || email.length > 254) return false;
  if (email.includes(" ") || email.includes("\n")) return false;
  return EMAIL_RE.test(email);
}

export function parseSupportRequestBody(body: unknown): SupportParseResult {
  if (!isPlainObject(body)) return { ok: false };

  const honeypot = readTrimmedString(body[SUPPORT_HONEYPOT_FIELD]);
  if (honeypot) {
    return { ok: true, honeypot: true };
  }

  const name = readTrimmedString(body.name);
  const email = readTrimmedString(body.email)?.toLowerCase() ?? null;
  const category = readTrimmedString(body.category);
  const message = readTrimmedString(body.message);
  const localeRaw = readTrimmedString(body.locale);
  const requestId = readTrimmedString(body.requestId);

  if (!name || name.length < MIN_SUPPORT_NAME_LENGTH) return { ok: false };
  if (name.length > MAX_SUPPORT_NAME_LENGTH) return { ok: false };
  if (!email || !isValidSupportEmail(email)) return { ok: false };
  if (!category || !isSupportCategoryId(category)) return { ok: false };
  if (!message || message.length < MIN_SUPPORT_MESSAGE_LENGTH) return { ok: false };
  if (message.length > MAX_SUPPORT_MESSAGE_LENGTH) return { ok: false };
  if (localeRaw !== "es" && localeRaw !== "en") return { ok: false };
  if (!requestId || !REQUEST_ID_RE.test(requestId)) return { ok: false };

  return {
    ok: true,
    honeypot: false,
    payload: {
      name,
      email,
      category,
      message,
      locale: localeRaw,
      requestId,
    },
  };
}

export function supportDuplicateFingerprint(input: {
  email: string;
  category: string;
  message: string;
}): string {
  return `${input.email}\n${input.category}\n${input.message}`;
}
