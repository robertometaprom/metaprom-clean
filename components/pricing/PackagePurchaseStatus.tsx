"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type StatusResponse = {
  status?: string;
  productId?: string;
  error?: string;
  oxxoReference?: string;
};

type BalancesResponse = {
  commercialsRemaining?: number;
  advertisingAssetsRemaining?: number;
  error?: string;
};

type PackagePurchaseStatusProps = {
  sessionId: string | null;
  paymentHint: string | null;
};

export default function PackagePurchaseStatus({
  sessionId,
  paymentHint,
}: PackagePurchaseStatusProps) {
  const [status, setStatus] = useState<string | null>(paymentHint);
  const [productId, setProductId] = useState<string | null>(null);
  const [oxxoReference, setOxxoReference] = useState<string | null>(null);
  const [balances, setBalances] = useState<BalancesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const response = await fetch(
          `/api/payments/checkout?sessionId=${encodeURIComponent(sessionId!)}`,
        );
        const data = (await response.json()) as StatusResponse;

        if (cancelled) return;

        if (!response.ok) {
          setError(data.error ?? "No se pudo consultar el pago.");
          return;
        }

        setStatus(data.status ?? null);
        setProductId(data.productId ?? null);
        setOxxoReference(data.oxxoReference ?? null);

        if (data.status === "completed") {
          const balRes = await fetch("/api/entitlements/balances");
          if (balRes.ok) {
            const bal = (await balRes.json()) as BalancesResponse;
            if (!cancelled) setBalances(bal);
          }
          return;
        }

        if (
          data.status === "awaiting_payment" ||
          data.status === "pending"
        ) {
          timer = setTimeout(poll, 4000);
        }
      } catch {
        if (!cancelled) {
          setError("Error de red al consultar el pago.");
        }
      }
    }

    void poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId]);

  if (!sessionId) {
    return (
      <section className="max-w-xl">
        <h1 className="text-3xl font-bold tracking-tight">Compra</h1>
        <p className="mt-4 text-white/55">
          No encontramos una sesión de pago. Vuelve a Planes para elegir un
          paquete.
        </p>
        <Link
          href="/planes"
          className="mt-8 inline-flex rounded-full bg-[#F5F5F0] px-6 py-3 text-sm font-medium text-black"
        >
          Ver planes
        </Link>
      </section>
    );
  }

  if (status === "completed") {
    return (
      <section className="max-w-xl">
        <h1 className="text-3xl font-bold tracking-tight">Pago confirmado</h1>
        <p className="mt-4 text-base leading-relaxed text-white/60">
          Tu paquete{productId ? ` (${productId})` : ""} fue acreditado. Los
          saldos no vencen. Usa una unidad al iniciar un proyecto elegible —
          no generamos todos los items del paquete de inmediato.
        </p>
        {balances ? (
          <ul className="mt-8 space-y-2 text-sm text-white/70">
            <li>
              Comerciales restantes:{" "}
              <span className="text-[#F5F5F0]">
                {balances.commercialsRemaining ?? 0}
              </span>
            </li>
            <li>
              Imágenes publicitarias restantes:{" "}
              <span className="text-[#F5F5F0]">
                {balances.advertisingAssetsRemaining ?? 0}
              </span>
            </li>
          </ul>
        ) : null}
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/studio"
            className="inline-flex rounded-full bg-[#F5F5F0] px-6 py-3 text-sm font-medium text-black"
          >
            Ir a Studio
          </Link>
          <Link
            href="/planes"
            className="inline-flex rounded-full border border-white/20 px-6 py-3 text-sm text-white/70"
          >
            Ver planes
          </Link>
        </div>
      </section>
    );
  }

  if (status === "failed" || status === "cancelled" || paymentHint === "cancelled") {
    return (
      <section className="max-w-xl">
        <h1 className="text-3xl font-bold tracking-tight">Pago no completado</h1>
        <p className="mt-4 text-base leading-relaxed text-white/60">
          El pago falló, expiró o fue cancelado. No se acreditó ningún saldo.
        </p>
        {error ? <p className="mt-3 text-sm text-red-300/90">{error}</p> : null}
        <Link
          href="/planes"
          className="mt-8 inline-flex rounded-full bg-[#F5F5F0] px-6 py-3 text-sm font-medium text-black"
        >
          Volver a Planes
        </Link>
      </section>
    );
  }

  // awaiting_payment / pending — especially OXXO
  return (
    <section className="max-w-xl">
      <h1 className="text-3xl font-bold tracking-tight">Pago pendiente</h1>
      <p className="mt-4 text-base leading-relaxed text-white/60">
        Creaste una referencia de pago (por ejemplo OXXO). El proyecto{" "}
        <strong className="font-medium text-[#F5F5F0]/80">no está pagado</strong>{" "}
        todavía. La producción y el saldo del paquete comienzan solo cuando
        Stripe confirma el pago en efectivo.
      </p>
      {oxxoReference ? (
        <p className="mt-6 text-sm text-white/70">
          Referencia:{" "}
          <span className="font-medium text-[#F5F5F0]">{oxxoReference}</span>
        </p>
      ) : null}
      <p className="mt-4 text-sm text-white/45">
        Esta página se actualiza automáticamente cuando Stripe confirma el pago.
      </p>
      {error ? <p className="mt-3 text-sm text-red-300/90">{error}</p> : null}
      <Link
        href="/planes"
        className="mt-8 inline-flex rounded-full border border-white/20 px-6 py-3 text-sm text-white/70"
      >
        Volver a Planes
      </Link>
    </section>
  );
}
