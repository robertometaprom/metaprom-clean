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
  createCommercialAssets,
  getAutoSaveMessage,
  persistCreationToLibrary,
  purchaseHdCommercial,
  type AutoSaveStatus,
  type CreationStep,
} from "@/lib/studio-creation";
import type { PaymentMethod } from "@/lib/payments/types";
import { formatPriceMxn, getPriceById } from "@/lib/pricing";
import CinematicReveal from "@/components/studio/CinematicReveal";

const STUDIO_DRAFT_KEY = "metaprom_studio_draft";

type Phase =
  | "welcome"
  | "unavailable"
  | "upload"
  | "creating"
  | "cinematic-reveal"
  | "premium-offer"
  | "purchase-hd";

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
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>("idle");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [premiumReady, setPremiumReady] = useState(false);

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
  const imagePromptRef = useRef("");
  const videoPromptRef = useRef("");
  const projectMetadataRef = useRef<{
    workflow_id?: string | null;
    industry?: string | null;
    intended_destination?: string | null;
  }>({});

  useEffect(() => {
    selectedFileRef.current = selectedFile;
  }, [selectedFile]);

  useEffect(() => {
    onWelcomeChange?.(phase === "welcome");
  }, [phase, onWelcomeChange]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      if (videoUrlRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(videoUrlRef.current);
      }
    };
  }, []);

  const autoSaveMessage = getAutoSaveMessage(autoSaveStatus);

  const persistToLibrary = useCallback(
    async (input: {
      originalFile: File;
      enhancedDataUrl: string;
      teaserVideoBlob?: Blob;
      imagePrompt: string;
      videoPrompt: string;
    }) => {
      const product = matchedProductRef.current;
      const customerIntent = customerIntentRef.current.trim();

      setAutoSaveStatus("saving");

      const result = await persistCreationToLibrary({
        originalFile: input.originalFile,
        enhancedDataUrl: input.enhancedDataUrl,
        teaserVideoBlob: input.teaserVideoBlob,
        imagePrompt: input.imagePrompt,
        videoPrompt: input.videoPrompt,
        customerIntent,
        mode: product.mode,
        projectMetadata: {
          ...projectMetadataRef.current,
          workflow_id: product.id,
          industry: product.industry ?? projectMetadataRef.current.industry,
          intended_destination: product.destination,
        },
        existingProjectId: savedProjectIdRef.current,
        existingAssetId: savedAssetIdRef.current,
        localDraftKey: STUDIO_DRAFT_KEY,
      });

      if (result.projectId) savedProjectIdRef.current = result.projectId;
      if (result.assetId) savedAssetIdRef.current = result.assetId;
      if (result.status === "saved") markStudioHasProjects();
      setAutoSaveStatus(result.status);
    },
    [],
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

    if (videoUrlRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(videoUrlRef.current);
    }
    videoUrlRef.current = null;

    try {
      const product = matchedProductRef.current;
      const customerIntent = customerIntentRef.current.trim();

      const result = await createCommercialAssets({
        file,
        customerIntent,
        productMode: product.mode,
        onStep: (step, message) => {
          setCreationStep(step);
          setCreationMessage(message);
        },
      });

      imagePromptRef.current = result.imagePrompt;
      videoPromptRef.current = result.videoPrompt;
      setPremiumImage(result.premiumImage);
      videoUrlRef.current = result.videoUrl;
      setVideoUrl(result.videoUrl);

      void persistToLibrary({
        originalFile: file,
        enhancedDataUrl: result.premiumImage,
        teaserVideoBlob: result.videoBlob,
        imagePrompt: result.imagePrompt,
        videoPrompt: result.videoPrompt,
      });

      setPhase("cinematic-reveal");
    } catch (createError) {
      console.error(createError);
      setError(
        createError instanceof Error
          ? createError.message
          : "Algo salió mal. Intenta de nuevo.",
      );
      setPhase("upload");
    }
  }, [persistToLibrary]);

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
      projectMetadataRef.current = {
        workflow_id: resolution.matchedExplicitly
          ? resolution.productId
          : resolution.product.id,
        industry: resolution.industry,
        intended_destination: resolution.intendedDestination,
      };
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
    link.download = premiumReady
      ? "metaprom-comercial-hd.mp4"
      : "metaprom-comercial-preview.mp4";
    link.click();
  };

  const handlePurchaseHd = async () => {
    if (!savedAssetIdRef.current) {
      setCheckoutMessage("Inicia sesión para comprar tu comercial HD.");
      return;
    }

    setCheckoutLoading(true);
    setCheckoutMessage(null);

    try {
      const result = await purchaseHdCommercial({
        assetId: savedAssetIdRef.current,
        paymentMethod,
        onStatus: setCheckoutMessage,
      });

      if (result.premiumVideoUrl) {
        if (videoUrlRef.current?.startsWith("blob:")) {
          URL.revokeObjectURL(videoUrlRef.current);
        }
        videoUrlRef.current = null;
        setVideoUrl(result.premiumVideoUrl);
        setPremiumReady(true);
      }

      setCheckoutMessage(result.message);
    } catch (purchaseError) {
      console.error(purchaseError);
      setCheckoutMessage(
        purchaseError instanceof Error
          ? purchaseError.message
          : "No pudimos completar la compra.",
      );
    } finally {
      setCheckoutLoading(false);
    }
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
    setPremiumReady(false);
    setCheckoutMessage(null);
    setCheckoutLoading(false);
    savedProjectIdRef.current = null;
    savedAssetIdRef.current = null;
    imagePromptRef.current = "";
    videoPromptRef.current = "";
    projectMetadataRef.current = {};
    setAutoSaveStatus("idle");
    selectedFileRef.current = null;

    if (videoUrlRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(videoUrlRef.current);
    }
    videoUrlRef.current = null;

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

        {(phase === "cinematic-reveal" || phase === "premium-offer") &&
          videoUrl && (
            <CinematicReveal
              videoUrl={videoUrl}
              priceMxn={HD_COMMERCIAL_PRICE}
              autoSaveMessage={autoSaveMessage}
              initialStage={phase === "premium-offer" ? "offer" : "fade"}
              onUnlock={() => setPhase("purchase-hd")}
              onCreateNew={resetFlow}
              onDownloadImage={premiumImage ? handleDownloadImage : undefined}
              hasPremiumImage={Boolean(premiumImage)}
            />
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
                Video comercial de 10–15 segundos en HD, sin marca de agua, listo
                para publicar.
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
                {!premiumReady && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="rounded-lg bg-black/50 px-3 py-1.5 text-xs font-semibold tracking-widest text-white/80 backdrop-blur-sm">
                      METAPROM
                    </span>
                  </div>
                )}
                <p className="bg-neutral-50 px-4 py-2 text-center text-xs text-neutral-500">
                  {premiumReady
                    ? "Comercial HD · sin marca de agua"
                    : "Avance gratuito · compra HD para descargar sin marca"}
                </p>
              </div>
            )}

            <div className="space-y-3">
              {!premiumReady && (
                <>
                  <p className="text-center text-sm text-neutral-600">
                    Elige cómo quieres pagar
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("card")}
                      className={`rounded-xl border py-2.5 text-sm font-semibold transition ${
                        paymentMethod === "card"
                          ? "border-violet-500 bg-violet-50 text-violet-800"
                          : "border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                      }`}
                    >
                      Tarjeta
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("oxxo")}
                      className={`rounded-xl border py-2.5 text-sm font-semibold transition ${
                        paymentMethod === "oxxo"
                          ? "border-violet-500 bg-violet-50 text-violet-800"
                          : "border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                      }`}
                    >
                      OXXO
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handlePurchaseHd}
                    disabled={checkoutLoading}
                    className="w-full rounded-2xl bg-neutral-900 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {checkoutLoading
                      ? "Procesando..."
                      : "Desbloquea el comercial completo"}
                  </button>
                </>
              )}

              {premiumReady && videoUrl && (
                <button
                  type="button"
                  onClick={handleDownloadVideo}
                  className="w-full rounded-2xl bg-violet-600 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
                >
                  Descargar comercial HD
                </button>
              )}

              {checkoutMessage && (
                <p className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-center text-sm text-neutral-700">
                  {checkoutMessage}
                </p>
              )}

              <button
                type="button"
                onClick={() => setPhase("premium-offer")}
                className="w-full rounded-2xl border border-neutral-200 py-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
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
