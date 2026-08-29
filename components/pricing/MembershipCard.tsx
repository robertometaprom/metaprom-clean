"use client";

import { useState } from "react";
import {
  PLANES_DEFAULT_BILLING_CYCLE,
  type PlanesBillingCycle,
  type PlanesMembershipCard,
} from "@/lib/pricing";

type MembershipCardProps = {
  plan: PlanesMembershipCard;
  featured?: boolean;
  monthlyLabel: string;
  annualLabel: string;
  selectorAriaLabel: string;
};

function CycleButton({
  selected,
  onSelect,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`min-h-11 flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition sm:px-5 ${
        selected
          ? "bg-[#F5F5F0] text-black"
          : "text-white/50 hover:text-white/80"
      }`}
    >
      {children}
    </button>
  );
}

export default function MembershipCard({
  plan,
  featured,
  monthlyLabel,
  annualLabel,
  selectorAriaLabel,
}: MembershipCardProps) {
  const [cycle, setCycle] = useState<PlanesBillingCycle>(
    PLANES_DEFAULT_BILLING_CYCLE,
  );
  const option = plan[cycle];

  return (
    <article
      data-plan={plan.id}
      data-billing-cycle={cycle}
      data-price={option.priceLabel}
      data-commercials={option.commercialsLabel}
      data-membership-cta="non-transactional"
      className={`relative flex h-full flex-col rounded-sm border p-6 md:p-8 ${
        featured
          ? "border-white/35 bg-white/[0.07] shadow-[0_0_80px_rgba(245,245,240,0.06)] md:p-10"
          : "border-white/12 bg-white/[0.02]"
      }`}
    >
      {plan.badge ? (
        <p className="mb-5 text-[11px] font-semibold tracking-[0.18em] text-[#F5F5F0]/80">
          {plan.badge}
        </p>
      ) : (
        <div className="mb-5 h-[17px]" aria-hidden />
      )}

      <h3 className="text-2xl font-semibold tracking-tight text-[#F5F5F0] md:text-3xl">
        {plan.name}
      </h3>
      {plan.positioning ? (
        <p className="mt-2 text-sm text-white/45">{plan.positioning}</p>
      ) : null}

      <div
        role="group"
        aria-label={selectorAriaLabel}
        className="mt-6 inline-flex w-full rounded-full border border-white/15 bg-black/35 p-1"
      >
        <CycleButton
          selected={cycle === "monthly"}
          onSelect={() => setCycle("monthly")}
        >
          {monthlyLabel}
        </CycleButton>
        <CycleButton
          selected={cycle === "annual"}
          onSelect={() => setCycle("annual")}
        >
          {annualLabel}
        </CycleButton>
      </div>

      <p className="mt-8 text-4xl font-bold tracking-tight text-[#F5F5F0] md:text-5xl">
        {option.priceLabel}
      </p>
      <p className="mt-2 text-sm text-white/50">{option.periodLabel}</p>
      <p className="mt-3 text-base font-medium text-[#F5F5F0]/90">
        {option.commercialsLabel}
      </p>
      <div className="mt-3 min-h-[1.5rem]">
        {option.savingsLabel ? (
          <p className="text-sm font-medium text-[#F5F5F0]/80">
            {option.savingsLabel}
          </p>
        ) : null}
      </div>

      <ul className="mt-8 flex-1 space-y-2.5 text-sm leading-relaxed text-white/60">
        {plan.coreBenefits.map((feature) => (
          <li key={feature} className="flex gap-2.5">
            <span className="shrink-0 text-[#F5F5F0]/70" aria-hidden>
              ✔
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-sm leading-relaxed text-[#F5F5F0]/75">
        {plan.accumulationNote}
      </p>

      <div className="mt-8">
        <button
          type="button"
          disabled
          aria-disabled="true"
          className={`inline-flex w-full cursor-not-allowed items-center justify-center rounded-full px-6 py-3.5 text-sm font-medium ${
            featured
              ? "bg-[#F5F5F0] text-black opacity-80"
              : "border border-white/15 bg-transparent text-white/45"
          }`}
        >
          {plan.ctaLabel}
        </button>
      </div>
    </article>
  );
}
