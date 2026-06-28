import type { LandingContent } from "@/lib/i18n";

type SimpleStepsProps = {
  steps: LandingContent["steps"];
};

function StepIcon({ id }: { id: string }) {
  const className = "h-8 w-8 md:h-10 md:w-10";

  switch (id) {
    case "photo":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={className}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.5c-.38.655-.59 1.398-.59 2.15V18.75A2.25 2.25 0 0 0 6.75 21h10.5A2.25 2.25 0 0 0 19.5 18.75V9.65c0-.752-.21-1.495-.59-2.15a2.31 2.31 0 0 0-1.641-1.325L12 5.25l-4.533 1.6Z"
          />
          <circle cx="12" cy="13" r="3" />
        </svg>
      );
    case "transform":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={className}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z"
          />
        </svg>
      );
    case "download":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={className}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M7.5 11.25 12 15.75m0 0 4.5-4.5M12 15.75V3"
          />
        </svg>
      );
    case "publish":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={className}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
          />
        </svg>
      );
    default:
      return null;
  }
}

function FlowArrow() {
  return (
    <div className="flex justify-center py-4 md:py-0">
      <span className="text-2xl text-white/20 md:hidden" aria-hidden>
        ↓
      </span>
      <span className="hidden text-2xl text-white/20 md:inline" aria-hidden>
        →
      </span>
    </div>
  );
}

export default function SimpleSteps({ steps }: SimpleStepsProps) {
  return (
    <section id="how-it-works" className="border-t border-white/5">
      <div className="mx-auto max-w-5xl px-6 py-32 md:py-40">
        <div className="flex flex-col items-center md:flex-row md:items-start md:justify-between md:gap-6">
          {steps.map((step, index) => (
            <div key={step.id} className="flex flex-col items-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border border-white/10 text-[#F5F5F0] md:h-28 md:w-28">
                <StepIcon id={step.id} />
              </div>
              <p className="mt-8 max-w-[180px] text-center text-base font-medium leading-snug text-[#F5F5F0] md:text-lg">
                {step.label}
              </p>
              {index < steps.length - 1 && <FlowArrow />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
