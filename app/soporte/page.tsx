import type { Metadata } from "next";
import Link from "next/link";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import MetapromLogo from "@/components/studio/MetapromLogo";
import LegalLinks from "@/components/legal/LegalLinks";
import SupportForm from "./SupportForm";
import { getLocale, getMessages } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const messages = await getMessages(locale);

  return {
    title: messages.support.metaTitle,
    description: messages.support.metaDescription,
  };
}

export default async function SupportPage() {
  const locale = await getLocale();
  const messages = await getMessages(locale);

  return (
    <div className="min-h-screen bg-black text-[#F5F5F0]">
      <header className="border-b border-white/5">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link href="/" aria-label={messages.nav.brand}>
            <MetapromLogo variant="dark" height={32} priority />
          </Link>
          <div className="flex items-center gap-3">
            <LocaleSwitcher locale={locale} />
            <Link
              href="/"
              className="text-sm text-white/55 transition hover:text-white"
            >
              {messages.support.backHome}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-14 sm:px-8 sm:py-20">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">
            {messages.support.eyebrow}
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
            {messages.support.title}
          </h1>
          <p className="mt-6 text-base leading-7 text-white/60 sm:text-lg">
            {messages.support.lead}
          </p>
        </div>

        <div className="relative mt-10 max-w-xl">
          <SupportForm locale={locale} copy={messages.support} />
        </div>
      </main>

      <footer className="border-t border-white/5">
        <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
          <LegalLinks
            locale={locale}
            labels={messages.legalNav}
            className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/45"
          />
        </div>
      </footer>
    </div>
  );
}
