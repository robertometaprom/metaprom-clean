import Link from "next/link";
import MetapromLogo from "@/components/studio/MetapromLogo";
import LegalLinks from "@/components/legal/LegalLinks";

type LegalPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  updated: string;
  children: React.ReactNode;
};

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-white/10 pt-8">
      <h2 className="text-xl font-semibold tracking-tight text-[#F5F5F0] sm:text-2xl">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-[15px] leading-7 text-white/65 sm:text-base">
        {children}
      </div>
    </section>
  );
}

export default function LegalPage({
  eyebrow,
  title,
  description,
  updated,
  children,
}: LegalPageProps) {
  return (
    <div className="min-h-screen bg-black text-[#F5F5F0]">
      <header className="border-b border-white/5">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" aria-label="Metaprom AI">
            <MetapromLogo variant="dark" height={32} priority />
          </Link>
          <Link
            href="/"
            className="text-sm text-white/55 transition hover:text-white"
          >
            Volver al inicio
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-14 sm:px-8 sm:py-20">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">
            {eyebrow}
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
            {title}
          </h1>
          <p className="mt-6 text-base leading-7 text-white/60 sm:text-lg">
            {description}
          </p>
          <p className="mt-4 text-sm text-white/35">Última actualización: {updated}</p>
        </div>

        <div className="mt-12 space-y-10">{children}</div>
      </main>

      <footer className="border-t border-white/5">
        <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
          <LegalLinks className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/45" />
          <p className="mt-4 text-xs text-white/30">© Metaprom AI</p>
        </div>
      </footer>
    </div>
  );
}
