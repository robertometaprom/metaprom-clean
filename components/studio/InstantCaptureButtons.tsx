"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { IMAGE_ACCEPT, isMobileDevice } from "@/lib/instant-capture";
import WebcamCaptureOverlay from "@/components/studio/WebcamCaptureOverlay";

type InstantCaptureButtonsProps = {
  onFileSelected: (file: File) => void;
  variant?: "light" | "dark";
  layout?: "row" | "stack";
  className?: string;
};

export default function InstantCaptureButtons({
  onFileSelected,
  variant = "light",
  layout = "row",
  className = "",
}: InstantCaptureButtonsProps) {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    setMobile(isMobileDevice());
  }, []);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onFileSelected(file);
  };

  const baseButton =
    variant === "dark"
      ? "flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-3.5 text-sm font-semibold text-white/85 transition hover:border-white/30 hover:bg-white/[0.08] active:scale-[0.98]"
      : "flex flex-1 items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-3.5 text-sm font-semibold text-neutral-800 shadow-sm transition hover:border-violet-300 hover:bg-violet-50/40 active:scale-[0.98]";

  const layoutClass =
    layout === "stack" ? "flex flex-col gap-3" : "flex flex-col gap-3 sm:flex-row";

  return (
    <>
      <input
        ref={galleryInputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        onChange={handleInputChange}
        className="sr-only"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleInputChange}
        className="sr-only"
      />

      <div className={`${layoutClass} ${className}`}>
        <button
          type="button"
          onClick={() => {
            if (mobile) {
              cameraInputRef.current?.click();
            } else {
              setWebcamOpen(true);
            }
          }}
          className={baseButton}
        >
          <CameraIcon className={variant === "dark" ? "text-white/60" : "text-violet-600"} />
          {mobile ? "Abrir cámara" : "Tomar foto"}
        </button>
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          className={baseButton}
        >
          <UploadIcon className={variant === "dark" ? "text-white/60" : "text-violet-600"} />
          {mobile ? "Elegir de galería" : "Subir imagen"}
        </button>
      </div>

      {!mobile && (
        <WebcamCaptureOverlay
          open={webcamOpen}
          onClose={() => setWebcamOpen(false)}
          onCapture={(file) => {
            setWebcamOpen(false);
            onFileSelected(file);
          }}
        />
      )}
    </>
  );
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg className={`h-5 w-5 ${className ?? ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={`h-5 w-5 ${className ?? ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}
