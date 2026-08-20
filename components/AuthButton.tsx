"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { Messages } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

type AuthButtonProps = {
  labels: Messages["nav"];
};

export default function AuthButton({ labels }: AuthButtonProps) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      setUser(currentUser);
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // INITIAL_SESSION can emit session=null before cookies hydrate and would
      // overwrite a valid getUser() result — only apply a positive INITIAL_SESSION
      // or real auth transitions.
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
      subscription.unsubscribe();
    };
  }, []);

  if (ready && user) {
    const displayName =
      user.user_metadata?.full_name ??
      user.user_metadata?.name ??
      user.email ??
      labels.brand;
    const avatarUrl =
      user.user_metadata?.avatar_url ?? user.user_metadata?.picture;

    return (
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="hidden items-center gap-3 sm:flex">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-9 w-9 rounded-full border border-white/10 object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-medium text-white/80">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="max-w-[160px] truncate text-sm text-white/80">
            {displayName}
          </span>
        </div>
        <Link
          href="/studio"
          className="whitespace-nowrap text-[13px] text-white/70 transition hover:text-white sm:text-base"
        >
          {labels.dashboard}
        </Link>
        <Link
          href="/creditos"
          className="hidden whitespace-nowrap text-base text-white/70 transition hover:text-white sm:inline"
        >
          {labels.credits}
        </Link>
        <Link
          href="/auth/signout"
          prefetch={false}
          className="rounded-full border border-white/15 px-3 py-2 text-[13px] text-white/70 transition hover:border-white/30 hover:text-white sm:px-5 sm:py-2.5 sm:text-base"
        >
          {labels.signOut}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 sm:gap-4">
      <Link
        href="/login"
        aria-label={labels.signIn}
        className="inline-flex items-center justify-center whitespace-nowrap text-[13px] text-white/70 transition hover:text-white sm:text-base"
      >
        <span className="sm:hidden">{labels.signInShort}</span>
        <span className="hidden sm:inline">{labels.signIn}</span>
      </Link>
      <Link
        href="/studio"
        className="inline-flex items-center justify-center rounded-full bg-[#F5F5F0] px-3 py-2 text-[13px] font-medium text-black transition hover:bg-white sm:px-6 sm:py-3 sm:text-base"
      >
        {labels.startFree}
      </Link>
    </div>
  );
}
