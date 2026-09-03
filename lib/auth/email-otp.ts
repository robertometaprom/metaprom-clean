import type { SupabaseClient } from "@supabase/supabase-js";
import { getSafeInternalPath } from "@/lib/i18n";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_PATTERN = /^\d{6}$/;

export function normalizeAuthEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidAuthEmail(value: string): boolean {
  return EMAIL_PATTERN.test(normalizeAuthEmail(value));
}

export function normalizeOtpToken(value: string): string {
  return value.trim();
}

export function isValidOtpToken(value: string): boolean {
  return OTP_PATTERN.test(normalizeOtpToken(value));
}

export function resolveAuthRedirectPath(
  redirectTo: string | null | undefined,
  fallback = "/studio",
): string {
  return getSafeInternalPath(redirectTo, fallback);
}

export async function sendEmailOtp(
  supabase: SupabaseClient,
  email: string,
) {
  return supabase.auth.signInWithOtp({
    email: normalizeAuthEmail(email),
    options: {
      shouldCreateUser: true,
    },
  });
}

export async function verifyEmailOtp(
  supabase: SupabaseClient,
  email: string,
  token: string,
) {
  return supabase.auth.verifyOtp({
    email: normalizeAuthEmail(email),
    token: normalizeOtpToken(token),
    type: "email",
  });
}
