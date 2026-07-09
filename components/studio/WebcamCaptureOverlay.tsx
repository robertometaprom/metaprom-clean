"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fileFromWebcamCapture } from "@/lib/instant-capture";

type WebcamCaptureOverlayProps = {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
};

export default function WebcamCaptureOverlay({
  open,
  onClose,
  onCapture,
}: WebcamCaptureOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setReady(false);
  }, []);

  useEffect(() => {
    if (!open) {
      stopStream();
      setError(null);
      return;
    }

    let cancelled = false;

    void navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          void video.play().then(() => setReady(true));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("No pudimos acceder a tu cámara. Prueba subir una foto.");
        }
      });

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [open, stopStream]);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const file = fileFromWebcamCapture(canvas, video);
    if (!file) return;

    stopStream();
    onCapture(file);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <canvas ref={canvasRef} className="hidden" aria-hidden />
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-neutral-900 shadow-2xl">
        <div className="relative aspect-[4/3] bg-black">
          {error ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
              <p className="text-sm text-white/70">{error}</p>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className="h-full w-full object-cover"
              />
              {!ready && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                </div>
              )}
            </>
          )}
        </div>
        {!error && (
          <div className="flex gap-3 p-4">
            <button
              type="button"
              onClick={() => {
                stopStream();
                onClose();
              }}
              className="flex-1 rounded-xl border border-white/15 py-3 text-sm font-semibold text-white/70 transition hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCapture}
              disabled={!ready}
              className="flex-1 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 py-3 text-sm font-semibold text-white transition hover:from-violet-600 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Capturar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
