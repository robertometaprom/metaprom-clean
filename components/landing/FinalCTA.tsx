import Link from "next/link";
import type { LandingCopy } from "@/lib/portfolio";

type FinalCTAProps = {
  copy: LandingCopy["finalCta"];
};

export default function FinalCTA({ copy }: FinalCTAProps) {
  return (
    <section className="border-t border-white/5">
      <div className="mx-auto flex min-h-[70vh] max-w-5xl flex-col items-center justify-center px-6 py-32 text-center md:min-h-[80vh] md:py-40">
        <h2 className="max-w-3xl text-4xl font-bold tracking-tight text-[#F5F5F0] md:text-6xl lg:text-7xl">
          {copy.headline}
        </h2>

        <Link
          href={copy.buttonHref}
          className="mt-14 inline-flex items-center justify-center rounded-full bg-[#F5F5F0] px-10 py-5 text-base font-medium text-black transition hover:bg-white md:text-lg"
        >
          {copy.button}
        </Link>
      </div>
    </section>
  );
}
