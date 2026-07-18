import Link from "next/link";
import type { ReactNode } from "react";

type PublicPreviewStateShellProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export default function PublicPreviewStateShell({
  title,
  description,
  action,
}: PublicPreviewStateShellProps) {
  return (
    <main className="flex min-h-screen flex-col bg-black text-[#F5F5F0]">
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="max-w-md text-xl font-medium tracking-tight md:text-2xl">
          {title}
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/50">
          {description}
        </p>
        {action ? <div className="mt-8">{action}</div> : null}
      </div>
    </main>
  );
}

type PublicPreviewStateActionProps = {
  href: string;
  label: string;
};

export function PublicPreviewStateAction({
  href,
  label,
}: PublicPreviewStateActionProps) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-6 text-sm font-medium text-[#F5F5F0] transition hover:border-white/30"
    >
      {label}
    </Link>
  );
}
