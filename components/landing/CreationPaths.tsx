import type { CreationPath } from "@/lib/portfolio";

type CreationPathsProps = {
  headline: string;
  paths: CreationPath[];
};

export default function CreationPaths({ headline, paths }: CreationPathsProps) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-32 md:py-40">
      <h2 className="max-w-3xl text-3xl font-bold tracking-tight text-[#F5F5F0] md:text-5xl">
        {headline}
      </h2>

      <div className="mt-20 grid gap-6 md:grid-cols-3 md:gap-8">
        {paths.map((path) => (
          <article
            key={path.id}
            className="rounded-sm border border-white/10 bg-white/[0.02] p-8 transition hover:border-white/20 md:p-10"
          >
            <span className="text-2xl" aria-hidden>
              {path.icon}
            </span>
            <h3 className="mt-8 text-xl font-semibold text-[#F5F5F0] md:text-2xl">
              {path.title}
            </h3>
            <p className="mt-4 text-base leading-relaxed text-white/55">
              {path.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
