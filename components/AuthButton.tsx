"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      setUser(currentUser);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-white/40">...</span>
      </div>
    );
  }

  if (user) {
    const displayName =
      user.user_metadata?.full_name ??
      user.user_metadata?.name ??
      user.email ??
      "Usuario";
    const avatarUrl = user.user_metadata?.avatar_url ?? user.user_metadata?.picture;

    return (
      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-3 sm:flex">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-9 w-9 rounded-full border border-white/10 object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500/20 text-sm font-medium text-cyan-300">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="max-w-[160px] truncate text-sm text-white/80">
            {displayName}
          </span>
        </div>
        <Link
          href="/dashboard"
          className="text-base text-white/70 transition hover:text-white"
        >
          Dashboard
        </Link>
        <Link
          href="/auth/signout"
          className="
            rounded-2xl
            border
            border-white/10
            px-5
            py-2.5
            text-base
            text-white/70
            transition
            hover:border-white/20
            hover:text-white
          "
        >
          Cerrar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Link
        href="/login"
        className="text-base text-white/70 transition hover:text-white"
      >
        Iniciar sesión
      </Link>
      <Link
        href="/login"
        className="
          rounded-2xl
          bg-gradient-to-r
          from-cyan-500
          to-blue-600
          px-6
          py-3
          text-base
          font-medium
          text-white
          shadow-[0_0_30px_rgba(59,130,246,0.35)]
          transition
          hover:scale-105
        "
      >
        Probar gratis
      </Link>
    </div>
  );
}
