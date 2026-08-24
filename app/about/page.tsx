import type { Metadata } from "next";
import Link from "next/link";
import PublicPageShell from "@/components/public/PublicPageShell";
import { getLocale, getMessages } from "@/lib/i18n";
import { publicIndexMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const messages = await getMessages(locale);

  return publicIndexMetadata({
    title: messages.about.metaTitle,
    description: messages.about.metaDescription,
    path: "/about",
  });
}

export default async function AboutPage() {
  const locale = await getLocale();
  const messages = await getMessages(locale);
  const copy = messages.about;

  return (
    <PublicPageShell
      locale={locale}
      brand={messages.nav.brand}
      footer={messages.footer}
      legal={messages.legalNav}
    >
      <main className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
        <h1 className="text-3xl font-bold tracking-tight text-[#F5F5F0] sm:text-5xl">
          {copy.title}
        </h1>
        <div className="mt-8 space-y-6 text-base leading-7 text-white/65 sm:text-lg sm:leading-8">
          <p>{copy.intro}</p>
          <p>
            {copy.officialWebsite}{" "}
            <Link href="/" className="text-white/80 transition hover:text-white">
              www.metaprom.com
            </Link>
            .
          </p>
          <p>{copy.studio}</p>
          <p>{copy.ai}</p>
        </div>
        <p className="mt-12">
          <Link
            href="/studio"
            className="text-sm text-white/70 transition hover:text-white"
          >
            {copy.studioCta}
          </Link>
        </p>
      </main>
    </PublicPageShell>
  );
}
