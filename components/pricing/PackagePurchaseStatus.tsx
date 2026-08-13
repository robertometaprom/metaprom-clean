"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type PurchaseEntitlement = {
  quantity: number;
  entitlementKind: "commercial" | "advertising_asset";
  packageName: string;
};

type StatusResponse = {
  status?: string;
  error?: string;
  oxxoReference?: string;
  package?: PurchaseEntitlement | null;
  confirmation?: (PurchaseEntitlement & { balanceAfter: number }) | null;
};

type PackagePurchaseStatusProps = {
  sessionId: string | null;
  paymentHint: string | null;
};

function entitlementLabel(entitlement: PurchaseEntitlement): string {
  if (entitlement.entitlementKind === "commercial") {
    return entitlement.quantity === 1 ? "Comercial" : "Comerciales";
  }

  return "créditos de Imágenes Publicitarias";
}

export default function PackagePurchaseStatus({
  sessionId,
  paymentHint,
}: PackagePurchaseStatusProps) {
  // Never use payment=success as confirmation. It is only a Stripe redirect hint.
  const [status, setStatus] = useState<string | null>(null);
  const [purchasePackage, setPurchasePackage] =
    useState<PurchaseEntitlement | null>(null);
  const [confirmation, setConfirmation] = useState<
    (PurchaseEntitlement & { balanceAfter: number }) | null
  >(null);
  const [oxxoReference, setOxxoReference] = useState<string | null>(null);
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
        setPurchasePackage(data.package ?? null);
        setConfirmation(data.confirmation ?? null);
        setOxxoReference(data.oxxoReference ?? null);

        if (data.status === "completed" && data.confirmation) return;

        if (
          data.status === "awaiting_payment" ||
          data.status === "pending" ||
          (data.status === "completed" && !data.confirmation)
        ) {
          timer = setTimeout(poll, 4000);
        }
      } catch {
        if (!cancelled) setError("Error de red al consultar el pago.");
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

  if (!status) {
    return (
      <section className="max-w-xl">
        <h1 className="text-3xl font-bold tracking-tight">
          Consultando tu pago
        </h1>
        <p className="mt-4 text-base leading-relaxed text-white/60">
          Estamos verificando el estado directamente con Stripe.
        </p>
        {error ? <p className="mt-3 text-sm text-red-300/90">{error}</p> : null}
      </section>
    );
  }

  if (status === "completed" && confirmation) {
    const balanceLabel =
      confirmation.entitlementKind === "commercial"
        ? confirmation.balanceAfter === 1
          ? "Comercial disponible"
          : "Comerciales disponibles"
        : "créditos de Imágenes Publicitarias disponibles";

    return (
      <section className="max-w-xl">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-300">
          Compra completada
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">
          ¡Pago confirmado!
        </h1>
        <p className="mt-4 text-base leading-relaxed text-white/60">
          Tu compra agregó{" "}
          <strong className="font-medium text-[#F5F5F0]">
            {confirmation.quantity} {entitlementLabel(confirmation)}
          </strong>{" "}
          a tu cuenta.
        </p>
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm text-white/50">Saldo actual</p>
          <p className="mt-1 text-lg font-medium text-[#F5F5F0]">
            {confirmation.balanceAfter} {balanceLabel}
          </p>
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/studio"
            className="inline-flex rounded-full bg-[#F5F5F0] px-6 py-3 text-sm font-medium text-black"
          >
            Crear ahora
          </Link>
          <Link
            href="/creditos"
            className="inline-flex rounded-full border border-white/20 px-6 py-3 text-sm text-white/70"
          >
            Ver mis créditos
          </Link>
        </div>
      </section>
    );
  }

  if (status === "completed") {
    return (
      <section className="max-w-xl">
        <h1 className="text-3xl font-bold tracking-tight">
          Confirmando tu compra
        </h1>
        <p className="mt-4 text-base leading-relaxed text-white/60">
          Stripe confirmó el pago. Estamos verificando el abono en tu cuenta;
          esta página se actualizará automáticamente.
        </p>
        {error ? <p className="mt-3 text-sm text-red-300/90">{error}</p> : null}
      </section>
    );
  }

  if (
    status === "failed" ||
    status === "cancelled" ||
    paymentHint === "cancelled"
  ) {
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

  return (
    <section className="max-w-xl">
      <h1 className="text-3xl font-bold tracking-tight">Pago OXXO pendiente</h1>
      <p className="mt-4 text-base leading-relaxed text-white/60">
        Tu pago todavía no ha sido confirmado. Tus créditos se agregarán
        automáticamente sólo cuando OXXO y Stripe confirmen el pago.
      </p>
      {purchasePackage ? (
        <p className="mt-4 text-sm text-white/50">
          Pendientes de acreditación: {purchasePackage.quantity}{" "}
          {entitlementLabel(purchasePackage)}.
        </p>
      ) : null}
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
