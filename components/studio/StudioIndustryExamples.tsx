"use client";

import Image from "next/image";
import {
  INDUSTRY_EXAMPLES,
  type IndustryExampleIcon,
} from "@/lib/studio-atmosphere";

type StudioIndustryExamplesProps = {
  onExampleSelect?: (prompt: string) => void;
};

function IndustryIcon({ type }: { type: IndustryExampleIcon }) {
  const className = "h-3.5 w-3.5 text-violet-600";

  switch (type) {
    case "restaurant":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v14M8 6v4M16 6v4M4 10h16" />
        </svg>
      );
    case "real-estate":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10h14V10" />
        </svg>
      );
    case "ecommerce":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      );
    case "coffee":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 8h10v6a4 4 0 01-4 4H8a4 4 0 01-4-4V8zM18 10h1a2 2 0 010 4h-1" />
        </svg>
      );
    case "beauty":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M12 22a10 10 0 110-20 10 10 0 010 20z" />
        </svg>
      );
    case "automotive":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 11l1.5-4.5h11L19 11M5 11v6h2v-2h10v2h2v-6M7 17h.01M17 17h.01" />
        </svg>
      );
  }
}

export default function StudioIndustryExamples({
  onExampleSelect,
}: StudioIndustryExamplesProps) {
  return (
    <section id="industry-examples" className="mx-auto mt-8 max-w-6xl px-4 pb-4 sm:px-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
        {INDUSTRY_EXAMPLES.map((example) => (
          <button
            key={example.id}
            type="button"
            onClick={() => onExampleSelect?.(example.prompt)}
            className="group overflow-hidden rounded-2xl border border-neutral-200/80 bg-white text-left shadow-sm transition hover:border-violet-200 hover:shadow-md"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100">
              <Image
                src={example.imageSrc}
                alt={example.label}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                className="object-cover transition duration-300 group-hover:scale-[1.03]"
              />
            </div>
            <div className="space-y-1 px-3 py-3">
              <div className="flex items-center gap-1.5">
                <IndustryIcon type={example.icon} />
                <span className="text-sm font-semibold text-neutral-900">
                  {example.label}
                </span>
              </div>
              <p className="text-xs leading-snug text-neutral-500">
                {example.subtitle}
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
