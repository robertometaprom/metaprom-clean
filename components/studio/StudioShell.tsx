"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import MetapromLogo from "@/components/studio/MetapromLogo";

type StudioShellProps = {
  children: React.ReactNode;
  variant?: "welcome" | "flow";
  onOpenLibrary?: () => void;
};

export default function StudioShell({
  children,
  variant = "welcome",
  onOpenLibrary,
}: StudioShellProps) {
  const [displayName, setDisplayName] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      const name =
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.email?.split("@")[0] ??
        "Usuario";

      setDisplayName(name.split(" ")[0] ?? name);
    });
  }, []);

  return (
    <div className="relative min-h-screen bg-[#ececec] text-neutral-900">
      <header className="relative z-30 border-b border-neutral-200/60 bg-[#ececec]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 lg:px-10">
          <Link href="/studio">
            <MetapromLogo variant="dark" />
          </Link>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 shadow-sm transition hover:border-neutral-300"
            >
              <span>{displayName || "Cuenta"}</span>
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
                className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-600"
              >
                {(displayName || "U").charAt(0).toUpperCase()}
              </span>
            </button>

            {menuOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40"
                  aria-label="Cerrar menú"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 z-50 mt-2 min-w-[180px] overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    className="block w-full px-4 py-2.5 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenLibrary?.();
                    }}
                  >
                    Mi biblioteca
                  </button>
                  <Link
                    href="/auth/signout"
                    className="block px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    Salir
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
