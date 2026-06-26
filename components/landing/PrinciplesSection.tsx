import type { Principle } from "@/lib/portfolio";

type PrinciplesSectionProps = {
  sentence: string;
  principles: Principle[];
};

export default function PrinciplesSection({
  sentence,
  principles,
}: PrinciplesSectionProps) {
  return (
    <section className="border-t border-white/5">
      <div className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-6 py-32 md:min-h-[80vh] md:py-40">
        <p className="text-center text-3xl font-medium tracking-tight text-[#F5F5F0] md:text-5xl lg:text-6xl">
          {sentence}
        </p>
      </div>

      <div className="mx-auto max-w-4xl space-y-24 px-6 pb-32 md:space-y-32 md:pb-40">
        {principles.map((principle, index) => (
          <article key={principle.id} className="text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-white/30">
              {String(index + 1).padStart(2, "0")}
            </p>
            <div className="mt-8 space-y-3">
              {principle.lines.map((line) => (
                <p
                  key={line}
                  className="text-2xl font-medium leading-snug text-[#F5F5F0] md:text-4xl"
                >
                  {line}
                </p>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
