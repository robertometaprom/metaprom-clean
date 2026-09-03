"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import EmailOtpSignIn from "@/components/EmailOtpSignIn";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import MetapromLogo from "@/components/studio/MetapromLogo";
import type { Locale, Messages } from "@/lib/i18n";

type LoginFormProps = {
  locale: Locale;
  nav: Messages["nav"];
  copy: Messages["auth"];
};

export default function LoginForm({ locale, nav, copy }: LoginFormProps) {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/studio";
  const errorCode = searchParams.get("error");
  const errorMessage =
    errorCode === "auth_callback_error" ? copy.errorAuthCallback : null;

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-220px] h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-120px] h-[400px] w-[400px] rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10 sm:px-6 sm:py-16">
        <div className="mb-4 flex justify-end">
          <LocaleSwitcher locale={locale} />
        </div>
        <div className="rounded-3xl border border-white/10 bg-black/40 p-5 shadow-[0_0_40px_rgba(168,85,247,0.08)] backdrop-blur-2xl sm:p-8">
          <div className="mb-8 text-center">
            <div className="mb-5 flex justify-center">
              <MetapromLogo variant="dark" height={40} priority />
            </div>
            <h1 className="sr-only">{nav.brand}</h1>
            <p className="mt-2 text-sm text-white/60">{copy.subtitle}</p>
          </div>

          {errorMessage && (
            <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {errorMessage}
            </div>
          )}

          <GoogleSignInButton
            redirectTo={redirectTo}
            label={copy.google}
            loadingLabel={copy.googleLoading}
            errorLabel={copy.googleError}
            locale={locale}
          />

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" aria-hidden="true" />
            <span className="text-xs uppercase tracking-[0.18em] text-white/35">
              {copy.orDivider}
            </span>
            <div className="h-px flex-1 bg-white/10" aria-hidden="true" />
          </div>

          <EmailOtpSignIn redirectTo={redirectTo} locale={locale} copy={copy} />

          <p className="mt-6 text-center text-xs text-white/40">
            {copy.methodNote}
          </p>
        </div>

        <p className="mt-8 text-center text-sm text-white/50">
          <Link href="/" className="transition hover:text-white">
            {copy.backHome}
          </Link>
        </p>
      </div>
    </main>
  );
}
