import type { LandingContent } from "@/lib/i18n";

type SimpleStepsProps = {
  productFlow: LandingContent["productFlow"];
};

function StepIcon({ id }: { id: string }) {
  const className = "h-7 w-7 md:h-8 md:w-8";

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
    case "direction":
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
            d="M7.5 8.25h9m-9 3.75h5.25M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
      );
    case "premium":
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
            d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A1.5 1.5 0 0 0 21.75 19.5V6.75A1.5 1.5 0 0 0 20.25 5.25H3.75A1.5 1.5 0 0 0 2.25 6.75v12.75A1.5 1.5 0 0 0 3.75 21Z"
          />
        </svg>
      );
    case "commercial":
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
            d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
          />
        </svg>
      );
    default:
      return null;
  }
}

export default function SimpleSteps({ productFlow }: SimpleStepsProps) {
  const startSteps = productFlow.steps.slice(0, 2);
  const outcomeSteps = productFlow.steps.slice(2);

  return (
    <section
      id="how-it-works"
      className="border-t border-white/5"
      aria-labelledby="how-it-works-heading"
    >
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-36">
        <h2 id="how-it-works-heading" className="sr-only">
          {productFlow.aria}
        </h2>

        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {startSteps.map((step, index) => (
            <li
              key={step.id}
              className="flex min-w-0 flex-col rounded-sm border border-white/10 bg-white/[0.02] p-6 md:p-7"
            >
              <div className="flex items-center justify-between gap-3 text-white/45">
                <span className="text-xs font-medium tracking-[0.25em]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <StepIcon id={step.id} />
              </div>
              <h3 className="mt-8 text-2xl font-bold tracking-tight text-[#F5F5F0] md:text-3xl">
                {step.title}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-white/55 md:text-base">
                {step.body}
              </p>
            </li>
          ))}

          {outcomeSteps.map((step, index) => (
            <li
              key={step.id}
              className="flex min-w-0 flex-col rounded-sm border border-white/10 bg-white/[0.02] p-6 md:p-7"
            >
              <div className="flex items-center justify-between gap-3 text-white/45">
                <span className="text-xs font-medium tracking-[0.25em]">
                  {String(index + 3).padStart(2, "0")}
                </span>
                <StepIcon id={step.id} />
              </div>
              <h3 className="mt-8 text-2xl font-bold tracking-tight text-[#F5F5F0] md:text-3xl">
                {step.title}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-white/55 md:text-base">
                {step.body}
              </p>
            </li>
          ))}
        </ol>

        <p className="mt-12 max-w-2xl text-base leading-relaxed text-white/50 md:mt-16 md:text-lg">
          {productFlow.supporting}
        </p>
      </div>
    </section>
  );
}
