import type { Metadata } from "next";
import Link from "next/link";
import ShowcaseGrid from "@/components/landing/ShowcaseGrid";
import PublicPageShell from "@/components/public/PublicPageShell";
import { getLandingContent, getLocale, getMessages } from "@/lib/i18n";
import { publicIndexMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const messages = await getMessages(locale);

  return publicIndexMetadata({
    title: messages.examples.metaTitle,
    description: messages.examples.metaDescription,
    path: "/examples",
  });
}

export default async function ExamplesPage() {
  const locale = await getLocale();
  const messages = await getMessages(locale);
  const content = await getLandingContent();
  const copy = messages.examples;

  return (
    <PublicPageShell
      locale={locale}
      brand={messages.nav.brand}
      footer={messages.footer}
      legal={messages.legalNav}
    >
      <main className="bg-black text-[#F5F5F0]">
        <div className="mx-auto max-w-7xl px-5 pt-16 sm:px-8 sm:pt-24 md:px-6">
          <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-[#F5F5F0] sm:text-5xl">
            {copy.title}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">
            {copy.lead}
          </p>
        </div>

        <ShowcaseGrid
          labels={content.showcaseLabels}
          items={content.showcase}
        />

        <div className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 md:px-6">
          <Link
            href="/studio"
            className="text-sm text-white/70 transition hover:text-white"
          >
            {copy.studioCta}
          </Link>
        </div>
      </main>
    </PublicPageShell>
  );
}
