"use client";

import type { Locale } from "@/lib/i18n";

type LocaleSwitcherProps = {
  locale: Locale;
  variant?: "dark" | "light";
  className?: string;
};

function localeHref(nextLocale: Locale): string {
  const next =
    typeof window === "undefined"
      ? "/"
      : `${window.location.pathname}${window.location.search}`;
  return `/api/locale?locale=${nextLocale}&next=${encodeURIComponent(next)}`;
}

export default function LocaleSwitcher({
  locale,
  variant = "dark",
  className = "",
}: LocaleSwitcherProps) {
  const frame =
    variant === "light"
      ? "border-neutral-200 bg-white text-neutral-700"
      : "border-white/15 bg-white/5 text-white";
  const idle =
    variant === "light"
      ? "text-neutral-500 hover:text-neutral-900"
      : "text-white/55 hover:text-white";
  const active =
    variant === "light"
      ? "bg-neutral-100 text-neutral-900"
      : "bg-white/15 text-white";

  return (
    <div
      className={`inline-flex shrink-0 items-center overflow-hidden rounded-full border text-[11px] font-semibold tracking-wide ${frame} ${className}`}
      role="group"
      aria-label={locale === "en" ? "Language" : "Idioma"}
    >
      {(["es", "en"] as const).map((code) => (
        <a
          key={code}
          href={`/api/locale?locale=${code}`}
          onClick={(event) => {
            event.preventDefault();
            window.location.assign(localeHref(code));
          }}
          className={`px-2 py-1 uppercase ${locale === code ? active : idle}`}
          aria-current={locale === code ? "true" : undefined}
        >
          {code}
        </a>
      ))}
    </div>
  );
}
