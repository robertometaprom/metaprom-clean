"use client";

import { useState } from "react";
import type { LandingContent } from "@/lib/i18n";

type LandingFaqProps = {
  copy: LandingContent["faq"];
};

function FaqItem({
  item,
}: {
  item: LandingContent["faq"]["items"][number];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-white/10">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex min-h-14 w-full items-center justify-between gap-4 py-5 text-left md:gap-6"
      >
        <h3 className="min-w-0 text-base font-semibold tracking-tight text-[#F5F5F0] md:text-lg">
          {item.question}
        </h3>
        <span
          aria-hidden
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 text-base text-white/70"
        >
          {open ? "−" : "+"}
        </span>
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <p className="pb-6 text-sm leading-relaxed text-white/55 md:text-base">
            {item.answer}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LandingFaq({ copy }: LandingFaqProps) {
  return (
    <section
      id="faq"
      className="border-t border-white/5"
      aria-labelledby="faq-heading"
    >
      <div className="mx-auto max-w-3xl px-6 py-24 md:py-36">
        <h2
          id="faq-heading"
          className="text-3xl font-bold tracking-tight text-[#F5F5F0] md:text-5xl"
        >
          {copy.title}
        </h2>
        <div className="mt-10 md:mt-14">
          {copy.items.map((item) => (
            <FaqItem key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
