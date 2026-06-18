"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import GoogleSignInButton from "@/components/GoogleSignInButton";

const ERROR_MESSAGES: Record<string, string> = {
  auth_callback_error:
    "No se pudo completar el inicio de sesión. Inténtalo de nuevo.",
};

export default function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";
  const errorCode = searchParams.get("error");
  const errorMessage = errorCode ? ERROR_MESSAGES[errorCode] : null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-220px] h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-120px] h-[400px] w-[400px] rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
        <div
          className="
            rounded-3xl
            border
            border-white/10
            bg-black/40
            p-8
            backdrop-blur-2xl
            shadow-[0_0_40px_rgba(168,85,247,0.08)]
          "
        >
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-cyan-500" />
            <h1 className="text-3xl font-bold tracking-tight">Metaprom AI</h1>
            <p className="mt-2 text-sm text-white/60">
              Inicia sesión para acceder a tu Biblioteca y herramientas de
              mejora de imágenes.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {errorMessage}
            </div>
          )}

          <GoogleSignInButton redirectTo={redirectTo} />

          <p className="mt-6 text-center text-xs text-white/40">
            Usamos Google como método principal de acceso.
          </p>
        </div>

        <p className="mt-8 text-center text-sm text-white/50">
          <Link href="/" className="transition hover:text-white">
            Volver al inicio
          </Link>
        </p>
      </div>
    </main>
  );
}
