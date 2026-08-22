/**
 * First-party anonymous visitor identifier.
 *
 * Lifetime: 180 days (cookie `mp_vid`).
 * Rationale: long enough to connect landing/share → CTA → signup in one
 * browser without cross-device tracking or fingerprinting. Random UUID only;
 * no PII, IP, email, or content is encoded.
 *
 * Share/acquisition cookie `mp_acq` lasts 30 days (first-touch window).
 */

export const VISITOR_COOKIE_NAME = "mp_vid";
export const ACQUISITION_COOKIE_NAME = "mp_acq";
export const VISITOR_LOCAL_STORAGE_KEY = "mp_vid";

/** 180 days. */
export const VISITOR_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

/** 30-day first-touch / share attribution window. */
export const ACQUISITION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function generateVisitorId(): string {
  return crypto.randomUUID();
}

export function isVisitorId(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export const CREATION_RUN_ID_FIELD = "creation_run_id";
