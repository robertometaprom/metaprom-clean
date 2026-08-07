"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type BalancesResponse = {
  commercialsRemaining?: number;
  advertisingAssetsRemaining?: number;
  error?: string;
};

type BalanceCardProps = {
  title: string;
  remaining: number;
};

function BalanceCard({ title, remaining }: BalanceCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-7">
      <h2 className="text-lg font-semibold tracking-tight text-[#F5F5F0] md:text-xl">
        {title}
      </h2>
      <p className="mt-4 text-3xl font-bold tracking-tight text-[#F5F5F0] md:text-4xl">
        {remaining}
      </p>
      <p className="mt-1 text-sm text-white/50">disponibles</p>
      <Link
        href="/planes"
        className="mt-6 inline-flex rounded-full border border-white/20 px-5 py-2.5 text-sm text-white/80 transition hover:border-white/35 hover:text-white"
      >
        Comprar más
      </Link>
    </div>
  );
}

export default function MisCreditos() {
  const [balances, setBalances] = useState<BalancesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/entitlements/balances");
        const data = (await response.json()) as BalancesResponse;

        if (cancelled) return;

        if (!response.ok) {
          setError(data.error ?? "No se pudieron cargar tus créditos.");
          setLoading(false);
          return;
        }

        setBalances(data);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError("Error de red al cargar tus créditos.");
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const commercialsRemaining = balances?.commercialsRemaining ?? 0;
  const advertisingAssetsRemaining =
    balances?.advertisingAssetsRemaining ?? 0;

  return (
    <section className="max-w-3xl">
      <p className="text-sm font-semibold tracking-[0.22em] text-white/45">
        METAPROM
      </p>
      <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#F5F5F0] md:text-5xl">
        Mis Créditos
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-white/55 md:text-lg">
        Consulta tus saldos disponibles. Los créditos no vencen. Para comprar
        más, ve a Planes y Precios.
      </p>

      {loading ? (
        <p className="mt-12 text-sm text-white/45">Cargando saldos…</p>
      ) : error ? (
        <p className="mt-12 text-sm text-red-300/90">{error}</p>
      ) : (
        <div className="mt-12 grid gap-4 sm:grid-cols-2 sm:gap-5">
          <BalanceCard title="Comerciales" remaining={commercialsRemaining} />
          <BalanceCard
            title="Imágenes Publicitarias"
            remaining={advertisingAssetsRemaining}
          />
        </div>
      )}

      <div className="mt-10">
        <Link
          href="/planes"
          className="inline-flex rounded-full bg-[#F5F5F0] px-6 py-3 text-sm font-medium text-black transition hover:bg-white"
        >
          Ver Planes y Precios
        </Link>
      </div>
    </section>
  );
}
