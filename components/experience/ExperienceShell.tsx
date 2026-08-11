"use client";

import { motion } from "framer-motion";
import MetapromLogo from "@/components/studio/MetapromLogo";
import {
  EXPERIENCE_PHASE_LABELS,
  EXPERIENCE_PHASES,
  type ExperiencePhase,
} from "@/lib/experience/types";

type ExperienceShellProps = {
  children: React.ReactNode;
  phase: ExperiencePhase;
  userName?: string | null;
  hideProgress?: boolean;
};

const EASE = [0.22, 1, 0.36, 1] as const;

export default function ExperienceShell({
  children,
  phase,
  userName,
  hideProgress = false,
}: ExperienceShellProps) {
  const phaseIndex = EXPERIENCE_PHASES.indexOf(phase);
  const showHeader = phase !== "landing" && phase !== "cinematic-reveal";

  return (
    <div className="relative min-h-screen bg-black text-[#F5F5F0]">
      {showHeader && (
        <header className="fixed inset-x-0 top-0 z-40 border-b border-white/5 bg-black/60 backdrop-blur-xl">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <MetapromLogo variant="dark" height={28} />
            {userName ? (
              <span className="text-sm text-white/50">{userName}</span>
            ) : (
              <span className="text-xs uppercase tracking-[0.25em] text-white/30">
                Experience v1
              </span>
            )}
          </div>
        </header>
      )}

      <motion.main
        key={phase}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.55, ease: EASE }}
        className="relative min-h-screen"
      >
        {children}
      </motion.main>

      {!hideProgress && phase !== "landing" && phase !== "cinematic-reveal" && (
        <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-white/5 bg-black/70 px-6 py-4 backdrop-blur-xl">
          <div className="mx-auto flex max-w-5xl items-center gap-3">
            <div className="flex flex-1 gap-1">
              {EXPERIENCE_PHASES.slice(1, -1).map((step, index) => {
                const stepIndex = index + 1;
                const active = stepIndex === phaseIndex;
                const complete = stepIndex < phaseIndex;

                return (
                  <div
                    key={step}
                    className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
                      active
                        ? "bg-white/80"
                        : complete
                          ? "bg-violet-500/60"
                          : "bg-white/10"
                    }`}
                    title={EXPERIENCE_PHASE_LABELS[step]}
                  />
                );
              })}
            </div>
            <span className="hidden text-[10px] uppercase tracking-[0.2em] text-white/35 sm:inline">
              {EXPERIENCE_PHASE_LABELS[phase]}
            </span>
          </div>
        </footer>
      )}
    </div>
  );
}
