"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LegalNotice from "@/components/legal/LegalNotice";
import {
  isValidAuthEmail,
  isValidOtpToken,
  resolveAuthRedirectPath,
  sendEmailOtp,
  verifyEmailOtp,
} from "@/lib/auth/email-otp";
import { createClient } from "@/lib/supabase/client";
import type { Locale, Messages } from "@/lib/i18n";

type EmailOtpCopy = Pick<
  Messages["auth"],
  | "emailLabel"
  | "emailPlaceholder"
  | "emailContinue"
  | "emailSending"
  | "emailSent"
  | "emailInvalid"
  | "emailSendError"
  | "otpLabel"
  | "otpPlaceholder"
  | "otpVerify"
  | "otpVerifying"
  | "otpInvalid"
  | "otpVerifyError"
  | "otpResend"
  | "otpChangeEmail"
>;

type EmailOtpSignInProps = {
  redirectTo?: string;
  locale?: Locale;
  copy: EmailOtpCopy;
  className?: string;
};

type EmailOtpPhase = "email" | "otp";

export default function EmailOtpSignIn({
  redirectTo = "/studio",
  locale = "es",
  copy,
  className = "",
}: EmailOtpSignInProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<EmailOtpPhase>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSendOtp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setInfo(null);

    if (!isValidAuthEmail(email)) {
      setError(copy.emailInvalid);
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: sendError } = await sendEmailOtp(supabase, email);

      if (sendError) {
        setError(sendError.message || copy.emailSendError);
        return;
      }

      setPhase("otp");
      setOtp("");
      setInfo(copy.emailSent);
    } catch (sendError) {
      console.error(sendError);
      setError(copy.emailSendError);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setInfo(null);

    if (!isValidOtpToken(otp)) {
      setError(copy.otpInvalid);
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: verifyError } = await verifyEmailOtp(supabase, email, otp);

      if (verifyError) {
        setError(verifyError.message || copy.otpVerifyError);
        return;
      }

      router.replace(resolveAuthRedirectPath(redirectTo));
    } catch (verifyError) {
      console.error(verifyError);
      setError(copy.otpVerifyError);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: sendError } = await sendEmailOtp(supabase, email);

      if (sendError) {
        setError(sendError.message || copy.emailSendError);
        return;
      }

      setInfo(copy.emailSent);
    } catch (sendError) {
      console.error(sendError);
      setError(copy.emailSendError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className} data-testid="email-otp-sign-in">
      {phase === "email" ? (
        <form onSubmit={(event) => void handleSendOtp(event)} className="space-y-3">
          <label htmlFor="email-otp-address" className="sr-only">
            {copy.emailLabel}
          </label>
          <input
            id="email-otp-address"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={copy.emailPlaceholder}
            disabled={loading}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-white placeholder:text-white/40 outline-none transition focus:border-violet-400/40 focus:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-3.5 text-base font-medium text-white transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? copy.emailSending : copy.emailContinue}
          </button>
          <LegalNotice kind="auth" locale={locale} />
        </form>
      ) : (
        <form onSubmit={(event) => void handleVerifyOtp(event)} className="space-y-3">
          {info ? (
            <p className="text-center text-sm text-white/70">{info}</p>
          ) : null}
          <label htmlFor="email-otp-code" className="sr-only">
            {copy.otpLabel}
          </label>
          <input
            id="email-otp-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            value={otp}
            onChange={(event) =>
              setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder={copy.otpPlaceholder}
            disabled={loading}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-center text-lg tracking-[0.35em] text-white placeholder:tracking-normal placeholder:text-white/40 outline-none transition focus:border-violet-400/40 focus:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-2xl border border-violet-400/30 bg-gradient-to-r from-violet-500/80 to-purple-600/80 px-6 py-3.5 text-base font-medium text-white transition hover:from-violet-500 hover:to-purple-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? copy.otpVerifying : copy.otpVerify}
          </button>
          <div className="flex items-center justify-center gap-4 text-sm">
            <button
              type="button"
              onClick={() => void handleResendOtp()}
              disabled={loading}
              className="text-white/60 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {copy.otpResend}
            </button>
            <button
              type="button"
              onClick={() => {
                setPhase("email");
                setOtp("");
                setError(null);
                setInfo(null);
              }}
              disabled={loading}
              className="text-white/60 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {copy.otpChangeEmail}
            </button>
          </div>
        </form>
      )}

      {error ? (
        <p className="mt-3 text-center text-sm text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
