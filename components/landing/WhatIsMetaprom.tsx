import type { LandingContent } from "@/lib/i18n";

type WhatIsMetapromProps = {
  copy: LandingContent["whatIs"];
};

export default function WhatIsMetaprom({ copy }: WhatIsMetapromProps) {
  return (
    <section
      id="what-is"
      className="border-t border-white/5"
      aria-labelledby="what-is-heading"
    >
      <div className="mx-auto max-w-5xl px-6 py-24 md:py-36">
        <h2
          id="what-is-heading"
          className="max-w-3xl text-3xl font-bold tracking-tight text-[#F5F5F0] md:text-5xl"
        >
          {copy.headline}
        </h2>

        <p className="mt-8 max-w-3xl text-lg leading-relaxed text-white/70 md:mt-10 md:text-xl">
          {copy.lead}
        </p>
        <p className="mt-6 max-w-3xl text-base leading-relaxed text-white/60 md:text-lg">
          {copy.offer}
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <p className="rounded-sm border border-white/10 bg-white/[0.02] p-6 text-base leading-relaxed text-white/65 md:p-8 md:text-lg">
            {copy.noSkills}
          </p>
          <p className="rounded-sm border border-white/10 bg-white/[0.02] p-6 text-base font-medium leading-relaxed text-[#F5F5F0] md:p-8 md:text-lg">
            {copy.director}
          </p>
        </div>

        <p className="mt-16 max-w-4xl text-3xl font-bold leading-[1.15] tracking-tight text-[#F5F5F0] md:mt-20 md:text-5xl">
          <span className="block text-white/55">{copy.sloganGenerate}</span>
          <span className="mt-2 block">{copy.sloganProduce}</span>
        </p>
      </div>
    </section>
  );
}
