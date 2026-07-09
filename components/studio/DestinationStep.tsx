"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  buildDestinationFromOption,
  CUSTOM_ASPECT_PRESETS,
  DESTINATION_OPTIONS,
  isDestinationComplete,
  type DestinationOptionId,
  type StudioDestination,
  type StudioDestinationAspectRatio,
} from "@/lib/studio-destination";

const EASE = [0.22, 1, 0.36, 1] as const;

type DestinationStepProps = {
  onContinue: (destination: StudioDestination) => void;
  onBack?: () => void;
};

export default function DestinationStep({
  onContinue,
  onBack,
}: DestinationStepProps) {
  const [selectedId, setSelectedId] = useState<DestinationOptionId | null>(
    null,
  );
  const [customPreset, setCustomPreset] =
    useState<StudioDestinationAspectRatio>("9:16");
  const [customWidth, setCustomWidth] = useState("");
  const [customHeight, setCustomHeight] = useState("");

  const selectedOption = DESTINATION_OPTIONS.find(
    (option) => option.id === selectedId,
  );
  const showCustomPanel = selectedOption?.isCustom === true;
  const canContinue = isDestinationComplete(selectedId, {
    aspectPreset: customPreset,
    width: customWidth ? Number(customWidth) : undefined,
    height: customHeight ? Number(customHeight) : undefined,
  });

  const handleContinue = () => {
    if (!selectedOption || !canContinue) return;

    const destination = buildDestinationFromOption(selectedOption, {
      aspectPreset: customPreset,
      width: customWidth ? Number(customWidth) : undefined,
      height: customHeight ? Number(customHeight) : undefined,
    });

    onContinue(destination);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="space-y-8"
    >
      <div className="space-y-3 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Where will you publish this commercial?
        </h2>
        <p className="text-base text-white/55">
          We&apos;ll automatically optimize your commercial for that destination.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {DESTINATION_OPTIONS.map((option) => {
          const isSelected = selectedId === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setSelectedId(option.id)}
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                isSelected
                  ? "border-violet-400/60 bg-violet-500/15 ring-1 ring-violet-400/40"
                  : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.08]"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl leading-none" aria-hidden="true">
                  {option.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white">{option.platform}</p>
                  <p className="mt-0.5 text-sm text-white/50">{option.subtitle}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {showCustomPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-sm font-medium text-white/80">
                Choose aspect ratio
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CUSTOM_ASPECT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setCustomPreset(preset.id)}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                      customPreset === preset.id
                        ? "border-violet-400/60 bg-violet-500/15 text-white"
                        : "border-white/10 text-white/70 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {preset.label}
                    {preset.id !== "custom" && (
                      <span className="mt-0.5 block text-xs font-normal text-white/45">
                        {preset.aspectRatio}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {customPreset === "custom" && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1.5">
                    <span className="text-xs text-white/50">Width</span>
                    <input
                      type="number"
                      min={1}
                      value={customWidth}
                      onChange={(event) => setCustomWidth(event.target.value)}
                      placeholder="1080"
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-white/25 focus:outline-none"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs text-white/50">Height</span>
                    <input
                      type="number"
                      min={1}
                      value={customHeight}
                      onChange={(event) => setCustomHeight(event.target.value)}
                      placeholder="1350"
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-white/25 focus:outline-none"
                    />
                  </label>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleContinue}
          disabled={!canContinue}
          className="flex-1 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 py-4 text-base font-semibold text-white transition hover:from-violet-600 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continuar
        </button>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="rounded-2xl px-6 py-4 text-sm font-semibold text-white/50 transition hover:text-white/80"
          >
            Volver
          </button>
        )}
      </div>
    </motion.div>
  );
}
