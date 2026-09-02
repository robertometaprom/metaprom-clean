"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import { LEGAL_NAV_LABELS } from "@/components/legal/LegalLinks";
import MetapromLogo from "@/components/studio/MetapromLogo";
import { buildStudioLoginUrl } from "@/lib/studio-draft/client";
import { createClient } from "@/lib/supabase/client";
import type { Locale, Messages } from "@/lib/i18n";
import { SUPPORT_PATH } from "@/lib/support/public";

type StudioShellProps = {
  children: React.ReactNode;
  variant?: "welcome" | "flow";
  onOpenLibrary?: () => void;
  authUser?: User | null;
  locale: Locale;
  nav: Messages["nav"];
  showAnalyticsNav?: boolean;
};

function getStudioDisplayName(
  user: User | null | undefined,
  fallback: string,
): string {
  if (!user) return "";

  const name =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    fallback;

  return name.split(" ")[0] ?? name;
}

export function useStudioAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      if (cancelled) return;
      setUser(currentUser);
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;

      // INITIAL_SESSION can emit session=null before cookies hydrate and would
      // overwrite a valid getUser() result — only react to real auth transitions.
      if (event === "INITIAL_SESSION") {
        if (session?.user) {
          setUser(session.user);
        }
        setReady(true);
        return;
      }

      setUser(session?.user ?? null);
      setReady(true);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return { user, ready };
}

export default function StudioShell({
  children,
  variant = "welcome",
  onOpenLibrary,
  authUser,
  locale,
  nav,
  showAnalyticsNav = false,
}: StudioShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const displayName = getStudioDisplayName(authUser, nav.account);
  const legal = LEGAL_NAV_LABELS[locale];

  return (
    <div
      className={`relative min-h-screen overflow-x-hidden ${
        variant === "welcome" ? "bg-black text-white" : "bg-[#ececec] text-neutral-900"
      }`}
    >
      {/* Logo overlay sits above the header blur layer (approved Studio chrome) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center px-5 pt-4 pb-5 sm:px-6 sm:pt-5 sm:pb-6 lg:px-10">
          <Link
            href="/"
            aria-label={nav.brand}
            className="pointer-events-auto inline-flex items-center"
          >
            <span className="md:hidden">
              <MetapromLogo variant="symbol" height={34} priority />
            </span>
            <span className="hidden md:inline-flex">
              <MetapromLogo variant="compact" height={46} priority />
            </span>
          </Link>
        </div>
      </div>

      <header className="relative z-30">
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 backdrop-blur-xl ${
            variant === "welcome"
              ? "border-b border-white/5 bg-black/35"
              : "border-b border-neutral-200/50 bg-[#ececec]/72"
          }`}
        />
        <div className="relative z-10 mx-auto flex max-w-6xl items-center justify-end gap-2 px-5 pt-4 pb-5 sm:gap-3 sm:px-6 sm:pt-5 sm:pb-6 lg:px-10">
          <LocaleSwitcher
            locale={locale}
            variant={variant === "welcome" ? "dark" : "light"}
          />
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium shadow-sm transition ${
                variant === "welcome"
                  ? "border-white/15 bg-white/5 text-white hover:border-white/25"
                  : "border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300"
              }`}
            >
              <span>{displayName || nav.account}</span>
              <svg
                className={`h-4 w-4 transition ${menuOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                  variant === "welcome"
                    ? "bg-white/15 text-white/80"
                    : "bg-neutral-200 text-neutral-600"
                }`}
              >
                {(displayName || nav.account).charAt(0).toUpperCase()}
              </span>
            </button>

            {menuOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40"
                  aria-label={nav.closeMenu}
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 z-50 mt-2 min-w-[180px] overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-lg">
                  {authUser ? (
                    <>
                      <button
                        type="button"
                        className="block w-full px-4 py-2.5 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                        onClick={() => {
                          setMenuOpen(false);
                          onOpenLibrary?.();
                        }}
                      >
                        {nav.library}
                      </button>
                      <Link
                        href="/creditos"
                        className="block px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50"
                        onClick={() => setMenuOpen(false)}
                      >
                        {nav.credits}
                      </Link>
                      {showAnalyticsNav ? (
                        <Link
                          href="/analytics"
                          className="block px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50"
                          onClick={() => setMenuOpen(false)}
                        >
                          Analytics
                        </Link>
                      ) : null}
                      <Link
                        href="/planes"
                        className="block px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50"
                        onClick={() => setMenuOpen(false)}
                      >
                        {nav.planesCta}
                      </Link>
                      <Link
                        href="/auth/signout"
                        prefetch={false}
                        className="block px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50"
                        onClick={() => setMenuOpen(false)}
                      >
                        {nav.signOut}
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        href={buildStudioLoginUrl()}
                        className="block px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50"
                        onClick={() => setMenuOpen(false)}
                      >
                        {nav.signIn}
                      </Link>
                      <Link
                        href={buildStudioLoginUrl()}
                        className="block px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50"
                        onClick={() => setMenuOpen(false)}
                      >
                        {nav.signUp}
                      </Link>
                      <Link
                        href="/planes"
                        className="block px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50"
                        onClick={() => setMenuOpen(false)}
                      >
                        {nav.planesCta}
                      </Link>
                    </>
                  )}
                  <div className="my-1 border-t border-neutral-100" />
                  <Link
                    href="/terminos"
                    className="block px-4 py-2 text-xs text-neutral-500 hover:bg-neutral-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    {legal.terms}
                  </Link>
                  <Link
                    href="/privacidad"
                    className="block px-4 py-2 text-xs text-neutral-500 hover:bg-neutral-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    {legal.privacy}
                  </Link>
                  <Link
                    href="/pagos-reembolsos"
                    className="block px-4 py-2 text-xs text-neutral-500 hover:bg-neutral-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    {legal.payments}
                  </Link>
                  <Link
                    href={SUPPORT_PATH}
                    className="block px-4 py-2 text-xs text-neutral-500 hover:bg-neutral-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    {legal.support}
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10">{children}</main>
    </div>
  );
}

export function useStudioUser() {
  const [firstName, setFirstName] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setFirstName(null);
        return;
      }

      const fullName =
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.email?.split("@")[0] ??
        null;

      if (fullName) {
        setFirstName(fullName.split(" ")[0] ?? fullName);
      }
    });
  }, []);

  return firstName;
}

export function markStudioHasProjects() {
  try {
    localStorage.setItem("metaprom_has_projects", "1");
  } catch {
    // ignore storage errors
  }
}
