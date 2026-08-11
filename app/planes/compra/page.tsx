import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import PackagePurchaseStatus from "@/components/pricing/PackagePurchaseStatus";
import MetapromLogo from "@/components/studio/MetapromLogo";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Estado de compra — Metaprom",
  description: "Confirmación de pago de paquetes Metaprom.",
};

type CompraPageProps = {
  searchParams: Promise<{
    payment?: string;
    session_id?: string;
    purchase?: string;
  }>;
};

export default async function PlanesCompraPage({ searchParams }: CompraPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent("/planes")}`);
  }

  const sessionId = params.session_id?.trim() ?? null;
  const paymentHint = params.payment?.trim() ?? null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-[#F5F5F0]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(245,245,240,0.08),_transparent_55%)]"
      />

      <header className="relative z-10 border-b border-white/5">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5 sm:px-6">
          <Link href="/" aria-label="Metaprom">
            <MetapromLogo variant="dark" height={32} priority />
          </Link>
          <Link
            href="/planes"
            className="text-sm text-white/60 transition hover:text-white"
          >
            Volver a Planes
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-5 py-16 sm:px-6 md:py-24">
        <PackagePurchaseStatus
          sessionId={sessionId}
          paymentHint={paymentHint}
        />
      </main>
    </div>
  );
}
