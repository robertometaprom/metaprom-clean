/**
 * P0 — universal email OTP auth on /login preserves redirectTo without touching claim/generation.
 *
 * Run: npx tsx --test tests/email-otp-auth.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  isValidAuthEmail,
  isValidOtpToken,
  resolveAuthRedirectPath,
  sendEmailOtp,
  verifyEmailOtp,
} from "../lib/auth/email-otp.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

test("login keeps Google option and passes redirectTo unchanged", () => {
  const loginForm = readRepo("app/login/LoginForm.tsx");
  const googleButton = readRepo("components/GoogleSignInButton.tsx");

  assert.match(loginForm, /GoogleSignInButton/);
  assert.match(loginForm, /redirectTo=\{redirectTo\}/);
  assert.match(loginForm, /searchParams\.get\("redirect"\)/);
  assert.match(googleButton, /signInWithOAuth/);
  assert.match(googleButton, /callbackUrl\.searchParams\.set\("next", redirectTo\)/);
  assert.doesNotMatch(googleButton, /signInWithOtp|verifyOtp/);
});

test("email option sends OTP using entered email via Supabase signInWithOtp", async () => {
  const emailOtp = readRepo("lib/auth/email-otp.ts");
  const component = readRepo("components/EmailOtpSignIn.tsx");

  assert.match(emailOtp, /signInWithOtp\(/);
  assert.match(emailOtp, /email: normalizeAuthEmail\(email\)/);
  assert.match(emailOtp, /shouldCreateUser: true/);
  assert.match(component, /sendEmailOtp\(supabase, email\)/);
  assert.doesNotMatch(component, /\/api\/studio\/draft\/claim/);
  assert.doesNotMatch(component, /createCommercialAssets|\/api\/video|\/api\/enhancement/);

  const calls: Array<{ method: string; payload: unknown }> = [];
  const supabase = {
    auth: {
      signInWithOtp: async (payload: unknown) => {
        calls.push({ method: "signInWithOtp", payload });
        return { data: {}, error: null };
      },
      verifyOtp: async () => ({ data: {}, error: null }),
    },
  };

  await sendEmailOtp(supabase as never, "  User@Example.com ");
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0]?.payload, {
    email: "user@example.com",
    options: { shouldCreateUser: true },
  });
});

test("OTP verification uses email + token + type email", async () => {
  const emailOtp = readRepo("lib/auth/email-otp.ts");
  const component = readRepo("components/EmailOtpSignIn.tsx");

  assert.match(emailOtp, /verifyOtp\(/);
  assert.match(emailOtp, /type: "email"/);
  assert.match(component, /verifyEmailOtp\(supabase, email, otp\)/);
  assert.doesNotMatch(component, /claimStudioDraft|\/api\/studio\/draft\/claim/);

  const calls: Array<{ method: string; payload: unknown }> = [];
  const supabase = {
    auth: {
      signInWithOtp: async () => ({ data: {}, error: null }),
      verifyOtp: async (payload: unknown) => {
        calls.push({ method: "verifyOtp", payload });
        return { data: { session: { access_token: "token" } }, error: null };
      },
    },
  };

  await verifyEmailOtp(supabase as never, "User@Example.com", " 123456 ");
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0]?.payload, {
    email: "user@example.com",
    token: "123456",
    type: "email",
  });
});

test("successful email verification redirects to original redirectTo", () => {
  const component = readRepo("components/EmailOtpSignIn.tsx");

  assert.match(component, /router\.replace\(resolveAuthRedirectPath\(redirectTo\)\)/);
  assert.match(component, /redirectTo = "\/studio"/);
  assert.equal(
    resolveAuthRedirectPath("/studio?resume=TEST_TOKEN"),
    "/studio?resume=TEST_TOKEN",
  );
  assert.equal(resolveAuthRedirectPath("//evil.com"), "/studio");
  assert.equal(resolveAuthRedirectPath("/api/studio/draft/claim"), "/studio");
});

test("preview save email path preserves resume redirect without claim duplication", () => {
  const previewLink = readRepo("components/studio/PreviewSaveEmailAuthLink.tsx");
  const invite = readRepo("components/studio/AnonymousPreviewSaveInvite.tsx");
  const handoff = readRepo("lib/studio/new-user-handoff.ts");

  assert.match(previewLink, /buildAuthRedirectUrl\(resumeToken\)/);
  assert.match(
    previewLink,
    /\/login\?redirect=\$\{encodeURIComponent\(redirectTo\)\}/,
  );
  assert.match(invite, /PreviewSaveEmailAuthLink/);
  assert.match(invite, /NewUserHandoff/);
  assert.doesNotMatch(previewLink, /claimStudioDraft|verifyOtp|signInWithOtp/);
  assert.match(handoff, /startGoogleOAuthWithAccountChooser/);
  assert.match(handoff, /prompt:\s*"select_account"/);
});

test("email auth helpers validate input shape", () => {
  assert.equal(isValidAuthEmail("user@example.com"), true);
  assert.equal(isValidAuthEmail("not-an-email"), false);
  assert.equal(isValidOtpToken("123456"), true);
  assert.equal(isValidOtpToken("12345"), false);
  assert.equal(isValidOtpToken("1234567"), false);
});
