import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import MisCreditos from "@/components/creditos/MisCreditos";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Mis Créditos — Metaprom",
  description: "Consulta tus comerciales e imágenes publicitarias disponibles.",
};

export default async function CreditosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent("/creditos")}`);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-[#F5F5F0]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(245,245,240,0.08),_transparent_55%)]"
      />

      <header className="relative z-10 border-b border-white/5">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5 sm:px-6">
          <Link href="/" className="text-xl font-semibold tracking-tight">
            Metaprom
          </Link>
          <nav className="flex items-center gap-4 sm:gap-5">
            <Link
              href="/studio"
              className="text-sm text-white/60 transition hover:text-white"
            >
              Estudio
            </Link>
            <Link
              href="/planes"
              className="text-sm text-white/60 transition hover:text-white"
            >
              Planes
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-5 py-14 sm:px-6 md:py-20">
        <MisCreditos />
      </main>
    </div>
  );
}
