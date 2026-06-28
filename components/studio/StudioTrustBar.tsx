import { TRUST_ITEMS } from "@/lib/studio-atmosphere";

function TrustIcon({ type }: { type: (typeof TRUST_ITEMS)[number]["icon"] }) {
  const className = "h-5 w-5 shrink-0 text-violet-500";

  if (type === "droplet") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c-1.5 2.5-4 6.2-4 9.5a4 4 0 108 0C16 9.2 13.5 5.5 12 3z" />
      </svg>
    );
  }
  if (type === "check") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}

export default function StudioTrustBar() {
  return (
    <section className="mx-auto max-w-4xl border-t border-neutral-200 px-6 py-10">
      <div className="grid gap-6 sm:grid-cols-3 sm:gap-4">
        {TRUST_ITEMS.map((item, index) => (
          <div
            key={item.text}
            className={`flex items-start gap-3 ${
              index > 0 ? "sm:border-l sm:border-neutral-200 sm:pl-6" : ""
            }`}
          >
            <TrustIcon type={item.icon} />
            <p className="text-sm leading-snug text-neutral-600">{item.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
