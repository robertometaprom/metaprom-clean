"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import StudioHero from "@/components/studio/StudioHero";
import StudioAtmosphere from "@/components/studio/StudioAtmosphere";
import StudioPlatforms from "@/components/studio/StudioPlatforms";
import StudioTrustBar from "@/components/studio/StudioTrustBar";
import { markStudioHasProjects } from "@/components/studio/StudioShell";
import { WELCOME_CHIPS } from "@/lib/studio-atmosphere";
import {
  PRODUCT_CATALOG,
  resolveStudioWorkflow,
  type CatalogProduct,
} from "@/lib/product-catalog";
import { recordMarketIntelligence } from "@/lib/market-intelligence";
import {
  buildAutoProjectName,
  blobToDataUrl,
  createBibliotecaProject,
  saveBibliotecaAssets,
  updateBibliotecaAsset,
  BibliotecaAuthError,
} from "@/lib/biblioteca";
import { formatPriceMxn, getPriceById } from "@/lib/pricing";
import {
  buildStudioImagePrompt,
  buildStudioVideoPrompt,
} from "@/lib/studio-prompts";

type Phase =
  | "welcome"
  | "unavailable"
  | "upload"
  | "creating"
  | "wow"
  | "next-actions"
  | "purchase-hd";

type CreationStep = "image" | "video" | "done";

type AutoSaveStatus = "idle" | "saving" | "saved" | "local-only";

const STUDIO_DRAFT_KEY = "metaprom_studio_draft";

const OFF_TOPIC_MESSAGE =
  "Solo puedo ayudarte a crear contenido de marketing — imágenes, videos y material para vender mejor. ¿Qué te gustaría crear hoy?";

const HD_COMMERCIAL_PRICE = getPriceById("commercial-video") ?? 149;

const EASE = [0.22, 1, 0.36, 1] as const;

type CreativeDirectorProps = {
  onWelcomeChange?: (isWelcome: boolean) => void;
};

export default function CreativeDirector({
  onWelcomeChange,
}: CreativeDirectorProps) {
  const [phase, setPhase] = useState<Phase>("welcome");
  const [input, setInput] = useState("");
  const [matchedProduct, setMatchedProduct] = useState<CatalogProduct | null>(
    null,
  );

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [premiumImage, setPremiumImage] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [creationStep, setCreationStep] = useState<CreationStep>("image");
  const [creationMessage, setCreationMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>("idle");

  const previewUrlRef = useRef<string | null>(null);
  const videoUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedFileRef = useRef<File | null>(null);
  const matchedProductRef = useRef<CatalogProduct>(
    PRODUCT_CATALOG["premium-image"],
  );
  const customerIntentRef = useRef("");
  const savedProjectIdRef = useRef<string | null>(null);
  const savedAssetIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedFileRef.current = selectedFile;
  }, [selectedFile]);

  useEffect(() => {
    onWelcomeChange?.(phase === "welcome");
  }, [phase, onWelcomeChange]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (phase === "next-actions") {
      const timer = window.setTimeout(() => setShowActions(true), 2000);
      return () => window.clearTimeout(timer);
    }
    setShowActions(false);
  }, [phase]);

  const persistDraftLocally = useCallback(
    (draft: {
      premiumImage: string;
      videoDataUrl?: string;
      customerIntent: string;
    }) => {
      try {
        sessionStorage.setItem(STUDIO_DRAFT_KEY, JSON.stringify(draft));
        setAutoSaveStatus("local-only");
      } catch {
        // ignore storage errors
      }
    },
    [],
  );

  const autoSaveImage = useCallback(
    async (imageUrl: string) => {
      const product = matchedProductRef.current;
      const customerIntent = customerIntentRef.current.trim();
      const originalName = selectedFileRef.current?.name ?? "producto";

      setAutoSaveStatus("saving");

      try {
        if (!savedProjectIdRef.current) {
          const project = await createBibliotecaProject(
            buildAutoProjectName(customerIntent),
          );
          savedProjectIdRef.current = project.id;

          const [asset] = await saveBibliotecaAssets([
            {
              project_id: project.id,
              original_name: originalName,
              image_url: imageUrl,
              mode: product.mode,
              ai_instructions: customerIntent || null,
            },
          ]);
          savedAssetIdRef.current = asset.id;
        } else if (savedAssetIdRef.current) {
          await updateBibliotecaAsset(savedAssetIdRef.current, {
            image_url: imageUrl,
          });
        } else {
          const [asset] = await saveBibliotecaAssets([
            {
              project_id: savedProjectIdRef.current,
              original_name: originalName,
              image_url: imageUrl,
              mode: product.mode,
              ai_instructions: customerIntent || null,
            },
          ]);
          savedAssetIdRef.current = asset.id;
        }

        markStudioHasProjects();
        setAutoSaveStatus("saved");
      } catch (saveError) {
        if (saveError instanceof BibliotecaAuthError) {
          persistDraftLocally({
            premiumImage: imageUrl,
            customerIntent,
          });
        } else {
          console.error(saveError);
          setAutoSaveStatus("idle");
        }
      }
    },
    [persistDraftLocally],
  );

  const autoSaveVideo = useCallback(
    async (blob: Blob, imageUrl: string) => {
      const customerIntent = customerIntentRef.current.trim();

      try {
        const videoDataUrl = await blobToDataUrl(blob);

        if (savedAssetIdRef.current) {
          await updateBibliotecaAsset(savedAssetIdRef.current, {
            video_url: videoDataUrl,
          });
          markStudioHasProjects();
          setAutoSaveStatus("saved");
        } else {
          persistDraftLocally({
            premiumImage: imageUrl,
            videoDataUrl,
            customerIntent,
          });
        }
      } catch (saveError) {
        if (saveError instanceof BibliotecaAuthError) {
          const videoDataUrl = await blobToDataUrl(blob);
          persistDraftLocally({
            premiumImage: imageUrl,
            videoDataUrl,
            customerIntent,
          });
        } else {
          console.error(saveError);
        }
      }
    },
    [persistDraftLocally],
  );

  const runCreation = useCallback(async () => {
    const file = selectedFileRef.current;
    if (!file) {
      setError("Sube una foto para continuar.");
      setPhase("upload");
      return;
    }

    setPhase("creating");
    setCreationStep("image");
    setCreationMessage("Creando tu imagen premium...");
    setError(null);
    setPremiumImage(null);
    setVideoUrl(null);
    setAutoSaveStatus("idle");
    savedProjectIdRef.current = null;
    savedAssetIdRef.current = null;

    if (videoUrlRef.current) {
      URL.revokeObjectURL(videoUrlRef.current);
      videoUrlRef.current = null;
    }

    try {
      const product = matchedProductRef.current;
      const customerIntent = customerIntentRef.current.trim();
      const imagePrompt = buildStudioImagePrompt(customerIntent, product.mode);

      const formData = new FormData();
      formData.append("image", file);
      formData.append("mode", "custom");
      formData.append("aiInstructions", imagePrompt);

      const response = await fetch("/api/enhancement", {
        method: "POST",
        body: formData,
      });

      const data = await parseJsonResponse(response);

      if (!response.ok || !data.image) {
        throw new Error(
          mapCreationError(data.error) || "No pudimos crear tu imagen.",
        );
      }

      setPremiumImage(data.image);
      void autoSaveImage(data.image);

      setCreationStep("video");
      setCreationMessage("Preparando tu comercial...");

      const videoPrompt = buildStudioVideoPrompt(customerIntent);
      const videoForm = new FormData();
      videoForm.append("image", dataUrlToFile(data.image, "commercial.jpg"));
      videoForm.append("prompt", videoPrompt);

      const videoResponse = await fetch("/api/video", {
        method: "POST",
        body: videoForm,
      });

      if (!videoResponse.ok) {
        const videoData = await parseJsonResponse(videoResponse);
        throw new Error(
          mapCreationError(videoData.error) ||
            "No pudimos crear tu comercial.",
        );
      }

      const blob = await videoResponse.blob();
      if (blob.size === 0) {
        throw new Error("No pudimos crear tu comercial.");
      }

      const url = URL.createObjectURL(blob);
      videoUrlRef.current = url;
      setVideoUrl(url);
      void autoSaveVideo(blob, data.image);

      setCreationStep("done");
      setPhase("wow");

      setTimeout(() => setPhase("next-actions"), 2800);
    } catch (createError) {
      console.error(createError);
      setError(
        createError instanceof Error
          ? createError.message
          : "Algo salió mal. Intenta de nuevo.",
      );
      setPhase("upload");
    }
  }, [autoSaveImage, autoSaveVideo]);

  const handleIntentSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      const trimmed = input.trim();
      const hasPhoto = Boolean(selectedFileRef.current);

      if (!trimmed && !hasPhoto) return;

      const resolution = resolveStudioWorkflow(trimmed, hasPhoto);

      if (resolution.blocked) {
        setPhase("unavailable");
        setError(OFF_TOPIC_MESSAGE);
        return;
      }

      await recordMarketIntelligence({
        requested_service: resolution.requestedService,
        industry: resolution.industry,
        intended_destination: resolution.intendedDestination,
        matched_workflow: resolution.matchedExplicitly,
        workflow_id: resolution.matchedExplicitly
          ? resolution.productId
          : undefined,
      });

      setMatchedProduct(resolution.product);
      matchedProductRef.current = resolution.product;
      customerIntentRef.current = trimmed;
      setError(null);

      if (hasPhoto) {
        await runCreation();
      } else {
        setPhase("upload");
      }
    },
    [input, runCreation],
  );

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    setSelectedFile(file);
    selectedFileRef.current = file;
    setPremiumImage(null);
    setVideoUrl(null);
    setError(null);

    if (file) {
      const url = URL.createObjectURL(file);
      previewUrlRef.current = url;
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }

    event.target.value = "";
  };

  const handleExampleClick = (example: string) => {
    setInput(example);
  };

  const handleCreateWow = async () => {
    await runCreation();
  };

  const handleDownloadImage = () => {
    if (!premiumImage) return;
    const link = document.createElement("a");
    link.href = premiumImage;
    link.download = "metaprom-premium.jpg";
    link.click();
  };

  const handleDownloadVideo = () => {
    if (!videoUrl) return;
    const link = document.createElement("a");
    link.href = videoUrl;
    link.download = "metaprom-comercial-preview.mp4";
    link.click();
  };

  const resetFlow = () => {
    setPhase("welcome");
    setInput("");
    setMatchedProduct(null);
    matchedProductRef.current = PRODUCT_CATALOG["premium-image"];
    customerIntentRef.current = "";
    setSelectedFile(null);
    setPremiumImage(null);
    setVideoUrl(null);
    setError(null);
    setAutoSaveStatus("idle");
    setShowActions(false);
    savedProjectIdRef.current = null;
    savedAssetIdRef.current = null;
    selectedFileRef.current = null;

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
  };

  const contextualUploadMessage = matchedProduct
    ? getUploadMessage(matchedProduct)
    : "Sube una foto de lo que vendes.";

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        onChange={handleFileChange}
        className="sr-only"
      />

      {phase === "welcome" && <StudioHero />}

      {phase === "welcome" ? (
        <div className="relative bg-[#ececec] pb-8">
          <StudioAtmosphere>
            <div className="relative mx-auto max-w-2xl px-2 pb-4 pt-2 sm:px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
                className="relative z-10 rounded-3xl border border-neutral-200/80 bg-white px-6 py-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)] sm:px-10 sm:py-10"
              >
                <div className="space-y-2 text-center">
                  <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
                    ¿Qué te gustaría{" "}
                    <span className="bg-gradient-to-r from-violet-600 to-purple-500 bg-clip-text text-transparent">
                      crear
                    </span>{" "}
                    hoy?
                  </h2>
                  <p className="text-sm text-neutral-500 sm:text-base">
                    Sube tu foto, cuéntame tu idea y yo me encargo del video.
                  </p>
                </div>

                <form onSubmit={handleIntentSubmit} className="mt-8 space-y-5">
                  <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Cuéntame qué quieres lograr..."
                      rows={4}
                      className="w-full resize-none bg-transparent px-5 pb-14 pt-4 text-base text-neutral-800 placeholder-neutral-400 focus:outline-none"
                    />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-3 pb-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 shadow-sm transition hover:border-neutral-300 hover:text-neutral-700"
                        aria-label="Adjuntar foto"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                      <button
                        type="submit"
                        disabled={!input.trim() && !selectedFile}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md transition hover:from-violet-600 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Enviar"
                      >
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <label
                    className="group block cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50/50 px-6 py-8 transition group-hover:border-violet-300 group-hover:bg-violet-50/30">
                      {previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={previewUrl}
                          alt="Vista previa"
                          className="max-h-40 rounded-xl object-contain"
                        />
                      ) : (
                        <>
                          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                          </div>
                          <p className="text-sm font-medium text-neutral-700">
                            O arrastra tu foto aquí
                          </p>
                          <p className="mt-1 text-xs text-neutral-400">
                            JPG, PNG hasta 20MB
                          </p>
                        </>
                      )}
                    </div>
                  </label>
                </form>

                {error && (
                  <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                  </p>
                )}

                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {WELCOME_CHIPS.map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => handleExampleClick(example)}
                      className="rounded-full bg-violet-50 px-4 py-2 text-sm text-violet-700 transition hover:bg-violet-100"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          </StudioAtmosphere>

          <StudioPlatforms />
          <StudioTrustBar />
        </div>
      ) : (
        <div className="mx-auto max-w-2xl bg-[#ececec] px-6 pb-24 pt-8">
          <AnimatePresence mode="wait">
        {phase === "unavailable" && (
          <motion.div
            key="unavailable"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-6 rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-lg"
          >
            <p className="text-lg leading-relaxed text-neutral-700">{error}</p>
            <button
              type="button"
              onClick={resetFlow}
              className="rounded-2xl bg-neutral-900 px-8 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              Probar otra idea
            </button>
          </motion.div>
        )}

        {phase === "upload" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="space-y-8 rounded-3xl border border-neutral-200 bg-white p-8 shadow-lg"
          >
            <div className="space-y-3 text-center">
              <p className="text-sm text-neutral-400">{input.trim()}</p>
              <h2 className="text-2xl font-bold leading-tight text-neutral-900 sm:text-3xl">
                {contextualUploadMessage}
              </h2>
            </div>

            <label
              className="group block cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="overflow-hidden rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50 transition group-hover:border-violet-300 group-hover:bg-violet-50/30">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="Vista previa"
                    className="mx-auto max-h-80 w-full object-contain p-4"
                  />
                ) : (
                  <div className="flex min-h-56 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </div>
                    <p className="text-base font-medium text-neutral-700">
                      Toca para subir tu foto
                    </p>
                    <p className="text-sm text-neutral-400">
                      Una foto de celular es suficiente
                    </p>
                  </div>
                )}
              </div>
            </label>

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleCreateWow}
                disabled={!selectedFile}
                className="flex-1 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 py-4 text-base font-semibold text-white transition hover:from-violet-600 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Crear
              </button>
              <button
                type="button"
                onClick={resetFlow}
                className="rounded-2xl px-6 py-4 text-sm font-semibold text-neutral-500 transition hover:text-neutral-800"
              >
                Cambiar idea
              </button>
            </div>
          </motion.div>
        )}

        {phase === "creating" && (
          <motion.div
            key="creating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex min-h-[50vh] flex-col items-center justify-center space-y-8 rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-lg"
          >
            {previewUrl && (
              <div className="relative overflow-hidden rounded-3xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Tu foto"
                  className="h-40 w-40 rounded-3xl object-cover"
                  style={{ animation: "studio-float 2.5s ease-in-out infinite" }}
                />
                <div className="pointer-events-none absolute inset-0 animate-pulse rounded-3xl ring-2 ring-violet-400/40" />
              </div>
            )}
            <div className="space-y-2">
              <p className="text-xl font-semibold text-neutral-900">{creationMessage}</p>
              <p className="text-sm text-neutral-500">
                {creationStep === "image"
                  ? "Esto toma unos segundos..."
                  : creationStep === "video"
                    ? "Tu comercial está en camino..."
                    : "¡Listo!"}
              </p>
            </div>
          </motion.div>
        )}

        {(phase === "wow" || phase === "next-actions") && (
          <motion.div
            key="wow"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="space-y-10 rounded-3xl border border-neutral-200 bg-white p-8 shadow-lg"
          >
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-bold text-neutral-900 sm:text-3xl">
                {phase === "wow" ? "Mira esto." : "¿Qué te gustaría hacer ahora?"}
              </h2>
              {autoSaveStatus === "saved" && (
                <p className="text-sm text-green-600">
                  Guardado automáticamente en tu biblioteca.
                </p>
              )}
              {autoSaveStatus === "local-only" && (
                <p className="text-sm text-amber-600">
                  Guardado en este dispositivo. Inicia sesión para conservarlo en
                  tu biblioteca.
                </p>
              )}
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              {previewUrl && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.08em] text-neutral-400">
                    Antes
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Foto original"
                    className="w-full rounded-2xl border border-neutral-200 object-cover"
                  />
                </div>
              )}
              {premiumImage && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.08em] text-violet-600">
                    Resultado
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={premiumImage}
                    alt="Imagen premium"
                    className="w-full rounded-2xl border border-violet-200 object-cover shadow-md shadow-violet-100"
                  />
                </div>
              )}
            </div>

            {videoUrl && (
              <div className="relative mx-auto max-w-xs overflow-hidden rounded-2xl border border-neutral-200 shadow-md">
                <video
                  src={videoUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="aspect-[9/16] w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="rounded-lg bg-black/50 px-4 py-2 text-sm font-semibold tracking-widest text-white/80 backdrop-blur-sm">
                    METAPROM
                  </span>
                </div>
                <p className="bg-neutral-50 px-4 py-2 text-center text-xs text-neutral-500">
                  Avance de video · HD disponible
                </p>
              </div>
            )}

            {phase === "next-actions" && showActions && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="space-y-6"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <ActionButton onClick={handleDownloadImage}>
                    Descargar imagen premium
                  </ActionButton>
                  {videoUrl && (
                    <ActionButton onClick={handleDownloadVideo}>
                      Descargar avance de video
                    </ActionButton>
                  )}
                  <ActionButton
                    onClick={() => setPhase("purchase-hd")}
                    variant="secondary"
                  >
                    Comprar comercial HD
                  </ActionButton>
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={resetFlow}
                    className="text-sm text-neutral-400 transition hover:text-neutral-700"
                  >
                    Crear algo nuevo
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {phase === "purchase-hd" && (
          <motion.div
            key="purchase-hd"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-md space-y-8 rounded-3xl border border-neutral-200 bg-white p-8 shadow-lg"
          >
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-bold text-neutral-900">
                Comercial HD
              </h2>
              <p className="text-3xl font-bold text-violet-600">
                {formatPriceMxn(HD_COMMERCIAL_PRICE, "es")}
              </p>
              <p className="text-neutral-500">
                Video comercial de 20–30 segundos, sin marca de agua, listo para
                publicar en redes sociales.
              </p>
            </div>

            {videoUrl && (
              <div className="relative mx-auto max-w-xs overflow-hidden rounded-2xl border border-neutral-200">
                <video
                  src={videoUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="aspect-[9/16] w-full object-cover"
                />
                <p className="bg-neutral-50 px-4 py-2 text-center text-xs text-neutral-500">
                  Avance actual · HD disponible
                </p>
              </div>
            )}

            <div className="space-y-3">
              <p className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-center text-sm text-violet-800">
                Tu comercial HD se producirá aquí mismo en el estudio. Pronto
                podrás completar tu compra sin salir de esta pantalla.
              </p>
              <button
                type="button"
                onClick={() => setPhase("next-actions")}
                className="w-full rounded-2xl bg-neutral-900 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
              >
                Volver
              </button>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
        </div>
      )}
    </>
  );
}

function ActionButton({
  children,
  onClick,
  variant = "primary",
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "primary" | "secondary";
}) {
  const classes =
    variant === "primary"
      ? "bg-neutral-900 text-white hover:bg-neutral-800"
      : "border border-neutral-200 bg-neutral-50 text-neutral-800 hover:bg-neutral-100";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-5 py-4 text-left text-sm font-semibold transition ${classes}`}
    >
      {children}
    </button>
  );
}

function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new File([bytes], filename, { type: mime });
}

function getUploadMessage(product: CatalogProduct): string {
  switch (product.id) {
    case "amazon-optimization":
      return "Sube tu foto y la haremos vender mejor.";
    case "restaurant-poster":
      return "Sube una foto de tu platillo o local.";
    case "hd-video":
      return "Sube una foto y crearemos tu comercial.";
    default:
      return "Sube una foto de lo que vendes.";
  }
}

async function parseJsonResponse(
  response: Response,
): Promise<{ image?: string; error?: string }> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return { error: `Error del servidor (${response.status}).` };
  }

  try {
    return (await response.json()) as { image?: string; error?: string };
  } catch {
    return { error: "Respuesta inválida del servidor." };
  }
}

function mapCreationError(message?: string): string | undefined {
  if (!message) return undefined;

  const normalized: Record<string, string> = {
    "Enhancement failed": "No pudimos crear tu imagen.",
    "No image uploaded": "Sube una foto para continuar.",
    "No image generated": "No pudimos crear tu imagen.",
    "Video generation failed.": "No pudimos crear tu comercial.",
  };

  return normalized[message] ?? message;
}
