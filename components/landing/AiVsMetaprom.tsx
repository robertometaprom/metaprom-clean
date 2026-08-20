import type { LandingContent } from "@/lib/i18n";

type AiVsMetapromProps = {
  copy: LandingContent["aiVs"];
};

export default function AiVsMetaprom({ copy }: AiVsMetapromProps) {
  return (
    <section
      id="ai-vs-metaprom"
      className="border-t border-white/5"
      aria-labelledby="ai-vs-heading"
    >
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-36">
        <h2 id="ai-vs-heading" className="sr-only">
          {`${copy.generate} ${copy.produce}`}
        </h2>

        <div className="grid gap-10 md:grid-cols-2 md:gap-16">
          <div>
            <p className="text-3xl font-bold tracking-tight text-white/50 md:text-4xl">
              {copy.generate}
            </p>
            <p className="mt-6 max-w-md text-base leading-relaxed text-white/55 md:text-lg">
              {copy.body}
            </p>
          </div>

          <div>
            <p className="text-3xl font-bold tracking-tight text-[#F5F5F0] md:text-4xl">
              {copy.produce}
            </p>
            <p className="mt-6 max-w-md text-base leading-relaxed text-white/65 md:text-lg">
              {copy.process}
            </p>
            <ul className="mt-8 flex flex-wrap gap-2">
              {copy.beats.map((beat) => (
                <li
                  key={beat}
                  className="rounded-full border border-white/10 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-white/55"
                >
                  {beat}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-16 max-w-2xl md:mt-20">
          <p className="text-xl font-semibold leading-snug text-[#F5F5F0] md:text-2xl">
            {copy.closeLearn}
          </p>
          <p className="mt-3 text-xl font-semibold leading-snug text-white/55 md:text-2xl">
            {copy.closeCreate}
          </p>
        </div>
      </div>
    </section>
  );
}
