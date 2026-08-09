"use client";

import { useEffect, useRef, useState } from "react";
import type { CreationStep } from "@/lib/studio-creation";

export type StudioProgressStatus = "idle" | "running" | "complete" | "error";

export type StudioProgressBand = {
  floor: number;
  ceiling: number;
  label: string;
  stage: string;
};

export const STUDIO_LONG_WAIT_COPY =
  "Está tomando un poco más de lo habitual. Seguimos trabajando.";

type UseStudioProgressOptions = {
  running: boolean;
  floor: number;
  ceiling: number;
  complete: boolean;
  error: boolean;
  /** Bumps when a new attempt starts so progress can restart cleanly. */
  runId: number;
  longWaitAfterMs?: number;
};

/**
 * Presentation-only estimated progress.
 * Never decreases while a run is active; 100% only when `complete` is true.
 */
export function useStudioProgress({
  running,
  floor,
  ceiling,
  complete,
  error,
  runId,
  longWaitAfterMs = 40_000,
}: UseStudioProgressOptions): {
  progress: number;
  longWait: boolean;
  status: StudioProgressStatus;
} {
  const [progress, setProgress] = useState(0);
  const [longWait, setLongWait] = useState(false);
  const progressRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);
  const lastRunIdRef = useRef(runId);

  useEffect(() => {
    if (runId === lastRunIdRef.current) return;
    lastRunIdRef.current = runId;
    progressRef.current = 0;
    setProgress(0);
    setLongWait(false);
    startedAtRef.current = null;
  }, [runId]);

  useEffect(() => {
    if (error) {
      setLongWait(false);
      return;
    }

    if (complete) {
      progressRef.current = 100;
      setProgress(100);
      setLongWait(false);
      startedAtRef.current = null;
      return;
    }

    if (!running) {
      return;
    }

    if (startedAtRef.current == null) {
      startedAtRef.current = Date.now();
    }

    const softCeiling = Math.max(1, Math.min(ceiling, 99));
    const nextFloor = Math.max(3, Math.min(floor, softCeiling));
    if (progressRef.current < nextFloor) {
      progressRef.current = nextFloor;
      setProgress(Math.floor(nextFloor));
    }

    const tick = window.setInterval(() => {
      const startedAt = startedAtRef.current ?? Date.now();
      const elapsed = Date.now() - startedAt;
      if (elapsed >= longWaitAfterMs) {
        setLongWait(true);
      }

      const current = progressRef.current;
      if (current >= softCeiling) {
        return;
      }

      const remaining = softCeiling - current;
      const proximity = remaining / Math.max(softCeiling - nextFloor, 1);
      const base = Math.max(0.12, remaining * (0.025 + proximity * 0.035));
      const slowFactor = elapsed >= longWaitAfterMs ? 0.22 : 1;
      const delta = base * slowFactor * (0.65 + Math.random() * 0.7);
      const next = Math.min(softCeiling, current + delta);

      if (next > current) {
        progressRef.current = next;
        setProgress(Math.floor(next));
      }
    }, 320);

    return () => window.clearInterval(tick);
  }, [running, floor, ceiling, complete, error, longWaitAfterMs]);

  const status: StudioProgressStatus = error
    ? "error"
    : complete
      ? "complete"
      : running
        ? "running"
        : "idle";

  return { progress, longWait, status };
}

export function getAdvertisingImageBand(
  step: CreationStep,
  preparing = false,
): StudioProgressBand {
  if (preparing) {
    return {
      floor: 5,
      ceiling: 15,
      label: "Preparando tu solicitud",
      stage: "Analizando tu material…",
    };
  }

  if (step === "done") {
    return {
      floor: 90,
      ceiling: 96,
      label: "Procesando resultado",
      stage: "Preparando entrega…",
    };
  }

  return {
    floor: 25,
    ceiling: 85,
    label: "Generando tu imagen",
    stage: "Aplicando tus instrucciones…",
  };
}

export function getCommercialCreationBand(
  step: CreationStep,
  options: { preparing?: boolean; persisting?: boolean } = {},
): StudioProgressBand {
  if (options.persisting) {
    return {
      floor: 90,
      ceiling: 96,
      label: "Preparando preview",
      stage: "Guardando tu avance…",
    };
  }

  if (options.preparing) {
    return {
      floor: 5,
      ceiling: 15,
      label: "Preparando producción",
      stage: "Preparando escena…",
    };
  }

  if (step === "done") {
    return {
      floor: 90,
      ceiling: 96,
      label: "Procesando video",
      stage: "Preparando preview…",
    };
  }

  if (step === "video") {
    return {
      floor: 25,
      ceiling: 85,
      label: "Generando comercial",
      stage: "Produciendo tu comercial…",
    };
  }

  // Image enhancement wait — stays within the 0–25 commercial image band.
  return {
    floor: 15,
    ceiling: 25,
    label: "Preparando producción",
    stage: "Preparando escena…",
  };
}

export function getFinalizeImageBand(): StudioProgressBand {
  return {
    floor: 20,
    ceiling: 92,
    label: "Finalizando imagen",
    stage: "Guardando en tu Biblioteca…",
  };
}

export function getPremiumProcessingBand(
  phase: "processing_payment" | "processing_premium",
  message: string | null,
): StudioProgressBand {
  if (phase === "processing_payment") {
    return {
      floor: 5,
      ceiling: 35,
      label: "Procesando pago",
      stage: message?.trim() || "Confirmando tu pago…",
    };
  }

  return {
    floor: 35,
    ceiling: 92,
    label: "Produciendo comercial HD",
    stage: message?.trim() || "Produciendo tu comercial HD…",
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
