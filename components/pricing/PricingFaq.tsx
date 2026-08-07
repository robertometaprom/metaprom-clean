"use client";

import { useState } from "react";
import type { PricingFaqItem } from "@/lib/pricing";

type PricingFaqProps = {
  title: string;
  items: readonly PricingFaqItem[];
};

function FaqItem({ item }: { item: PricingFaqItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-white/10">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-6 py-5 text-left transition hover:text-white"
      >
        <h3 className="text-base font-semibold tracking-tight text-[#F5F5F0] md:text-lg">
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
          <div className="space-y-3 pb-6 text-sm leading-relaxed text-white/55 md:text-base">
            {item.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PricingFaq({ title, items }: PricingFaqProps) {
  return (
    <section className="border-t border-white/10 pt-10">
      <h2 className="text-xl font-semibold tracking-tight text-[#F5F5F0] md:text-2xl">
        {title}
      </h2>
      <div className="mt-6">
        {items.map((item) => (
          <FaqItem key={item.question} item={item} />
        ))}
      </div>
    </section>
  );
}
