"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export const EASE = [0.22, 1, 0.36, 1] as const;

type FadeUpProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
};

export function FadeUp({ children, delay = 0, className = "" }: FadeUpProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

type ExperiencePanelProps = {
  children: ReactNode;
  className?: string;
};

export function ExperiencePanel({ children, className = "" }: ExperiencePanelProps) {
  return (
    <div
      className={`rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-sm md:p-10 ${className}`}
    >
      {children}
    </div>
  );
}

type PrimaryButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
};

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
  className = "",
}: PrimaryButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex w-full items-center justify-center rounded-full bg-[#F5F5F0] px-8 py-4 text-base font-medium text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

type SecondaryButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
};

export function SecondaryButton({
  children,
  onClick,
  className = "",
}: SecondaryButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex w-full items-center justify-center rounded-full border border-white/20 px-8 py-4 text-base font-medium text-[#F5F5F0] transition hover:border-white/40 hover:bg-white/5 ${className}`}
    >
      {children}
    </button>
  );
}

type AccentButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
};

export function AccentButton({
  children,
  onClick,
  disabled,
  className = "",
}: AccentButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-violet-900/30 transition hover:from-violet-600 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

type StepLayoutProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function StepLayout({ eyebrow, title, subtitle, children }: StepLayoutProps) {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 pb-28 pt-24 md:px-10">
      <FadeUp className="space-y-3 text-center">
        {eyebrow && (
          <p className="text-xs uppercase tracking-[0.35em] text-white/40">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-5xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mx-auto max-w-lg text-base leading-relaxed text-white/55 md:text-lg">
            {subtitle}
          </p>
        )}
      </FadeUp>
      <FadeUp delay={0.12} className="mt-10">
        {children}
      </FadeUp>
    </div>
  );
}
