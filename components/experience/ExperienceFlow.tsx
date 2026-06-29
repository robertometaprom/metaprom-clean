"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import CommercialVideo from "@/components/landing/CommercialVideo";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import ExperienceShell from "@/components/experience/ExperienceShell";
import {
  AccentButton,
  EASE,
  ExperiencePanel,
  FadeUp,
  PrimaryButton,
  SecondaryButton,
  StepLayout,
} from "@/components/experience/ExperienceUI";
import CinematicReveal from "@/components/studio/CinematicReveal";
import { markStudioHasProjects } from "@/components/studio/StudioShell";
import { recordMarketIntelligence } from "@/lib/market-intelligence";
import {
  PRODUCT_CATALOG,
  resolveStudioWorkflow,
  type CatalogProduct,
} from "@/lib/product-catalog";
import {
  createCommercialAssets,
  getAutoSaveMessage,
  persistCreationToLibrary,
  purchaseHdCommercial,
  type AutoSaveStatus,
  type CreationStep,
} from "@/lib/studio-creation";
import type { PaymentMethod } from "@/lib/payments/types";
import { createClient } from "@/lib/supabase/client";
import {
  EXPERIENCE_DRAFT_KEY,
  type ExperienceCreation,
  type ExperiencePhase,
} from "@/lib/experience/types";
import type { LandingContent } from "@/lib/i18n";
import { formatPriceMxn, getPriceById } from "@/lib/pricing";
import { WELCOME_CHIPS } from "@/lib/studio-atmosphere";

type ExperienceFlowProps = {
  content: LandingContent;
};

const HD_PRICE = getPriceById("commercial-video") ?? 149;

const OFF_TOPIC_MESSAGE =
  "Solo puedo ayudarte a crear contenido de marketing — imágenes, videos y material para vender mejor. ¿Qué quieres promocionar?";

export default function ExperienceFlow({ content }: ExperienceFlowProps) {
  const [phase, setPhase] = useState<ExperiencePhase>("landing");
  const [intent, setIntent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [premiumImage, setPremiumImage] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [purchased, setPurchased] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [generationMessage, setGenerationMessage] = useState(
    "Creando tu imagen premium...",
  );
  const [creationStep, setCreationStep] = useState<CreationStep>("image");
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [revealFromOffer, setRevealFromOffer] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const selectedFileRef = useRef<File | null>(null);
  const videoUrlRef = useRef<string | null>(null);
  const savedProjectIdRef = useRef<string | null>(null);
  const savedAssetIdRef = useRef<string | null>(null);
  const matchedProductRef = useRef<CatalogProduct>(
    PRODUCT_CATALOG["premium-image"],
  );
  const projectMetadataRef = useRef<{
    workflow_id?: string | null;
    industry?: string | null;
    intended_destination?: string | null;
  }>({});

  const heroVideos = content.showcase.map((item) => item.commercialVideo);

  const persistDraft = useCallback(() => {
    try {
      const draft = {
        phase,
        intent,
        premiumImage,
        videoUrl,
        purchased,
        projectName: buildProjectName(intent),
      };
      sessionStorage.setItem(EXPERIENCE_DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // ignore storage errors
    }
  }, [phase, intent, premiumImage, videoUrl, purchased]);

  const goTo = useCallback((next: ExperiencePhase) => {
    setPhase(next);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setIsAuthenticated(true);
      const name =
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.email?.split("@")[0] ??
        null;
      if (name) setUserName(name.split(" ")[0] ?? name);
    });

    try {
      const raw = sessionStorage.getItem(EXPERIENCE_DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as Partial<ExperienceCreation> & {
        phase?: ExperiencePhase;
      };
      if (draft.intent) setIntent(draft.intent);
      if (draft.premiumImage) setPremiumImage(draft.premiumImage);
      if (draft.videoUrl) setVideoUrl(draft.videoUrl);
      if (draft.purchased) setPurchased(true);
      if (
        draft.phase &&
        draft.phase !== "landing" &&
        draft.phase !== "generating"
      ) {
        setPhase(draft.phase);
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  useEffect(() => {
    persistDraft();
  }, [persistDraft]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      if (videoUrlRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(videoUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (heroVideos.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveVideoIndex((current) => (current + 1) % heroVideos.length);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [heroVideos.length]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    setSelectedFile(file);
    selectedFileRef.current = file;

    if (file) {
      const url = URL.createObjectURL(file);
      previewUrlRef.current = url;
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }

    event.target.value = "";
  };

  const runProductionGeneration = useCallback(async () => {
    const file = selectedFileRef.current;
    if (!file) {
      setError("Sube una foto para continuar.");
      goTo("upload");
      return;
    }

    setPhase("generating");
    setCreationStep("image");
    setGenerationMessage("Creando tu imagen premium...");
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
      const result = await createCommercialAssets({
        file,
        customerIntent: intent,
        productMode: product.mode,
        onStep: (step, message) => {
          setCreationStep(step);
          setGenerationMessage(message);
        },
      });

      setPremiumImage(result.premiumImage);
      videoUrlRef.current = result.videoUrl;
      setVideoUrl(result.videoUrl);

      setAutoSaveStatus("saving");
      const persistResult = await persistCreationToLibrary({
        originalFile: file,
        enhancedDataUrl: result.premiumImage,
        teaserVideoBlob: result.videoBlob,
        imagePrompt: result.imagePrompt,
        videoPrompt: result.videoPrompt,
        customerIntent: intent,
        mode: product.mode,
        projectMetadata: {
          ...projectMetadataRef.current,
          workflow_id: product.id,
          industry: product.industry ?? projectMetadataRef.current.industry,
          intended_destination: product.destination,
        },
        existingProjectId: savedProjectIdRef.current,
        existingAssetId: savedAssetIdRef.current,
        localDraftKey: EXPERIENCE_DRAFT_KEY,
      });

      if (persistResult.projectId) {
        savedProjectIdRef.current = persistResult.projectId;
      }
      if (persistResult.assetId) {
        savedAssetIdRef.current = persistResult.assetId;
      }
      if (persistResult.status === "saved") markStudioHasProjects();
      setAutoSaveStatus(persistResult.status);

      setRevealFromOffer(false);
      setPhase("cinematic-reveal");
    } catch (createError) {
      console.error(createError);
      setError(
        createError instanceof Error
          ? createError.message
          : "Algo salió mal. Intenta de nuevo.",
      );
      goTo("generate");
    }
  }, [goTo, intent]);

  const handleGenerate = async () => {
    if (isAuthenticated) {
      await runProductionGeneration();
      return;
    }
    goTo("login");
  };

  const handleLoginContinueDemo = async () => {
    await runProductionGeneration();
  };

  const handleCheckout = async () => {
    if (!savedAssetIdRef.current) {
      setCheckoutMessage(
        "Inicia sesión para comprar tu comercial HD y conservarlo en tu biblioteca.",
      );
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
      }

      setPurchased(true);
      setCheckoutMessage(result.message);
      goTo("library");
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

  const resetForNewCommercial = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    setIntent("");
    setSelectedFile(null);
    setPreviewUrl(null);
    selectedFileRef.current = null;
    setPremiumImage(null);
    setVideoUrl(null);
    setPurchased(false);
    setCheckoutLoading(false);
    setCheckoutMessage(null);
    setPaymentMethod("card");
    setAutoSaveStatus("idle");
    setError(null);
    savedProjectIdRef.current = null;
    savedAssetIdRef.current = null;
    projectMetadataRef.current = {};
    matchedProductRef.current = PRODUCT_CATALOG["premium-image"];

    if (videoUrlRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(videoUrlRef.current);
    }
    videoUrlRef.current = null;

    try {
      sessionStorage.removeItem(EXPERIENCE_DRAFT_KEY);
    } catch {
      // ignore
    }

    goTo("upload");
  };

  const projectName = buildProjectName(intent);

  return (
    <ExperienceShell
      phase={phase}
      userName={userName}
      hideProgress={phase === "create-another"}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        onChange={handleFileChange}
        className="sr-only"
      />

      <AnimatePresence mode="wait">
        {phase === "landing" && (
          <motion.section
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="relative min-h-screen"
          >
            <div className="absolute inset-0">
              {heroVideos.map((src, index) => (
                <CommercialVideo
                  key={src}
                  src={src}
                  autoPlay={index === 0}
                  muted
                  loop
                  playsInline
                  preload={index <= 1 ? "auto" : "metadata"}
                  fullBleed
                  className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[1800ms] ease-in-out"
                  style={{ opacity: index === activeVideoIndex ? 1 : 0 }}
                />
              ))}
              <div className="absolute inset-0 bg-black/50" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/55" />
            </div>

            <div className="relative z-10 flex min-h-screen flex-col justify-end px-6 pb-20 pt-32 md:px-10 md:pb-28">
              <FadeUp className="mx-auto w-full max-w-5xl">
                <p className="mb-6 text-xs uppercase tracking-[0.35em] text-white/45">
                  Metaprom Experience v1
                </p>
                <h1 className="max-w-4xl text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
                  {content.cinema.headline}
                </h1>
                <p className="mt-8 max-w-2xl text-lg leading-relaxed text-[#F5F5F0]/70 md:text-xl">
                  {content.cinema.subheadline}
                </p>
                <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <PrimaryButton
                    onClick={() => goTo("upload")}
                    className="sm:w-auto"
                  >
                    {content.cinema.primaryCta}
                  </PrimaryButton>
                  <SecondaryButton
                    onClick={() => goTo("upload")}
                    className="sm:w-auto"
                  >
                    {content.cinema.secondaryCta}
                  </SecondaryButton>
                </div>
                <div className="mt-16 border-t border-white/10 pt-10 md:mt-20">
                  <p className="text-xs uppercase tracking-[0.35em] text-white/45">
                    {content.priceConfidence.label}
                  </p>
                  <p className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
                    {content.priceConfidence.priceFormatted}
                  </p>
                </div>
              </FadeUp>
            </div>
          </motion.section>
        )}

        {phase === "upload" && (
          <StepLayout
            eyebrow="Paso 1"
            title="Sube tu foto"
            subtitle="Una foto de celular es suficiente. Metaprom hace el resto."
          >
            <ExperiencePanel>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group block w-full"
              >
                <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.02] px-6 py-10 transition group-hover:border-white/30 group-hover:bg-white/[0.04]">
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt="Vista previa"
                      className="max-h-72 rounded-xl object-contain"
                    />
                  ) : (
                    <>
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5">
                        <svg
                          className="h-7 w-7 text-white/60"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                          />
                        </svg>
                      </div>
                      <p className="text-base font-medium text-white/80">
                        Toca para subir
                      </p>
                      <p className="mt-2 text-sm text-white/40">
                        JPG, PNG · hasta 20MB
                      </p>
                    </>
                  )}
                </div>
              </button>
              <div className="mt-8 space-y-3">
                <PrimaryButton
                  disabled={!selectedFile}
                  onClick={() => goTo("intent")}
                >
                  Continuar
                </PrimaryButton>
                <SecondaryButton onClick={() => goTo("landing")}>
                  Volver
                </SecondaryButton>
              </div>
            </ExperiencePanel>
          </StepLayout>
        )}

        {phase === "intent" && (
          <StepLayout
            eyebrow="Paso 2"
            title="¿Qué quieres lograr?"
            subtitle="Una frase basta. Metaprom interpreta tu intención comercial."
          >
            <ExperiencePanel>
              <form
                onSubmit={async (event: FormEvent) => {
                  event.preventDefault();
                  const trimmed = intent.trim();
                  if (!trimmed) return;

                  const resolution = resolveStudioWorkflow(trimmed, true);
                  if (resolution.blocked) {
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

                  matchedProductRef.current = resolution.product;
                  projectMetadataRef.current = {
                    workflow_id: resolution.matchedExplicitly
                      ? resolution.productId
                      : resolution.product.id,
                    industry: resolution.industry,
                    intended_destination: resolution.intendedDestination,
                  };
                  setError(null);
                  goTo("generate");
                }}
                className="space-y-6"
              >
                <textarea
                  value={intent}
                  onChange={(event) => setIntent(event.target.value)}
                  placeholder="Ej. Quiero un video para promocionar mi restaurante en TikTok..."
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-base text-[#F5F5F0] placeholder-white/30 focus:border-white/25 focus:outline-none"
                />
                <div className="flex flex-wrap gap-2">
                  {WELCOME_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setIntent(chip)}
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:border-white/25 hover:text-white"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
                <PrimaryButton type="submit" disabled={!intent.trim()}>
                  Continuar
                </PrimaryButton>
                {error && (
                  <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error}
                  </p>
                )}
                <SecondaryButton onClick={() => goTo("upload")}>
                  Volver
                </SecondaryButton>
              </form>
            </ExperiencePanel>
          </StepLayout>
        )}

        {phase === "generate" && (
          <StepLayout
            eyebrow="Paso 3"
            title="Listo para generar"
            subtitle="Revisa tu foto e intención. Metaprom creará tu comercial."
          >
            <ExperiencePanel className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                {previewUrl && (
                  <div className="overflow-hidden rounded-2xl border border-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Tu foto"
                      className="aspect-square w-full object-cover"
                    />
                    <p className="px-4 py-2 text-xs text-white/40">Tu foto</p>
                  </div>
                )}
                <div className="flex flex-col justify-center rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                    Intención
                  </p>
                  <p className="mt-3 text-base leading-relaxed text-white/75">
                    {intent}
                  </p>
                </div>
              </div>
              <AccentButton onClick={handleGenerate}>
                Generar mi comercial
              </AccentButton>
              {error && (
                <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </p>
              )}
              <SecondaryButton onClick={() => goTo("intent")}>
                Editar
              </SecondaryButton>
            </ExperiencePanel>
          </StepLayout>
        )}

        {phase === "login" && (
          <StepLayout
            eyebrow="Guardar proyecto"
            title="Inicia sesión para conservar tu comercial"
            subtitle="Solo pedimos acceso cuando tu proyecto está listo para guardarse. Tus creaciones quedan en tu biblioteca."
          >
            <ExperiencePanel className="space-y-6">
              <GoogleSignInButton
                redirectTo="/experience"
                label="Continuar con Google"
              />
              <button
                type="button"
                onClick={handleLoginContinueDemo}
                className="w-full text-center text-sm text-white/40 transition hover:text-white/65"
              >
                Continuar en demo sin guardar
              </button>
              <SecondaryButton onClick={() => goTo("generate")}>
                Volver
              </SecondaryButton>
            </ExperiencePanel>
          </StepLayout>
        )}

        {phase === "generating" && (
          <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 pb-28 pt-24 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="space-y-10"
            >
              {previewUrl && (
                <div className="relative mx-auto w-fit overflow-hidden rounded-3xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Tu foto"
                    className="h-44 w-44 rounded-3xl object-cover"
                    style={{ animation: "studio-float 2.5s ease-in-out infinite" }}
                  />
                  <div className="pointer-events-none absolute inset-0 animate-pulse rounded-3xl ring-2 ring-violet-400/30" />
                </div>
              )}
              <div className="space-y-3">
                <p className="text-2xl font-semibold">{generationMessage}</p>
                <p className="text-sm text-white/45">
                  {creationStep === "image"
                    ? "Esto toma unos segundos..."
                    : creationStep === "video"
                      ? "Tu comercial está en camino..."
                      : "Metaprom está produciendo tu comercial..."}
                </p>
              </div>
              <div className="mx-auto h-1 w-48 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-500"
                  initial={{ width: "8%" }}
                  animate={{
                    width:
                      creationStep === "image"
                        ? "35%"
                        : creationStep === "video"
                          ? "72%"
                          : "100%",
                  }}
                  transition={{ duration: 0.8, ease: EASE }}
                />
              </div>
            </motion.div>
          </div>
        )}

        {phase === "cinematic-reveal" && videoUrl && (
          <CinematicReveal
            videoUrl={videoUrl}
            priceMxn={HD_PRICE}
            autoSaveMessage={
              getAutoSaveMessage(autoSaveStatus) ??
              (isAuthenticated
                ? "Guardando en tu biblioteca..."
                : "Inicia sesión para conservar este comercial.")
            }
            initialStage={revealFromOffer ? "offer" : "fade"}
            onUnlock={() => goTo("checkout")}
            onCreateNew={() => goTo("create-another")}
            onDownloadImage={
              premiumImage
                ? () => downloadAsset(premiumImage, "metaprom-premium.jpg")
                : undefined
            }
            hasPremiumImage={Boolean(premiumImage)}
          />
        )}

        {phase === "checkout" && (
          <StepLayout
            eyebrow="Desbloquear HD"
            title="Comercial completo"
            subtitle="10–15 segundos en HD, sin marca de agua, listo para publicar."
          >
            <ExperiencePanel className="space-y-6">
              {videoUrl && (
                <div className="relative mx-auto max-w-xs overflow-hidden rounded-2xl border border-white/10">
                  <video
                    src={videoUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="aspect-[9/16] w-full object-cover opacity-90"
                  />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="rounded-lg bg-black/50 px-3 py-1.5 text-[10px] font-bold tracking-[0.2em] text-white/80 backdrop-blur-sm">
                      METAPROM
                    </span>
                  </div>
                </div>
              )}

              <p className="text-center text-3xl font-bold text-violet-300">
                {formatPriceMxn(HD_PRICE, content.locale)}
              </p>

              <div className="grid grid-cols-2 gap-2">
                {(["card", "oxxo"] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`rounded-xl border py-3 text-sm font-semibold transition ${
                      paymentMethod === method
                        ? "border-violet-400/60 bg-violet-500/15 text-violet-200"
                        : "border-white/10 text-white/60 hover:bg-white/5"
                    }`}
                  >
                    {method === "card" ? "Tarjeta" : "OXXO"}
                  </button>
                ))}
              </div>

              <AccentButton
                onClick={handleCheckout}
                disabled={checkoutLoading}
              >
                {checkoutLoading ? "Procesando..." : "Desbloquear comercial HD"}
              </AccentButton>
              {checkoutMessage && (
                <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-sm text-white/65">
                  {checkoutMessage}
                </p>
              )}
              {!isAuthenticated && autoSaveStatus !== "saved" && (
                <GoogleSignInButton
                  redirectTo="/experience"
                  label="Inicia sesión para comprar"
                />
              )}
              <SecondaryButton
                onClick={() => {
                  setRevealFromOffer(true);
                  goTo("cinematic-reveal");
                }}
              >
                Volver
              </SecondaryButton>
            </ExperiencePanel>
          </StepLayout>
        )}

        {phase === "library" && (
          <StepLayout
            eyebrow="Tu biblioteca"
            title={projectName}
            subtitle="Todo lo que creas se guarda aquí automáticamente."
          >
            <ExperiencePanel className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                {premiumImage && (
                  <div className="overflow-hidden rounded-2xl border border-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={premiumImage}
                      alt="Imagen premium"
                      className="aspect-square w-full object-cover"
                    />
                    <p className="px-4 py-2 text-xs text-white/40">
                      Imagen premium
                    </p>
                  </div>
                )}
                {videoUrl && (
                  <div className="overflow-hidden rounded-2xl border border-white/10">
                    <video
                      src={videoUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="aspect-square w-full object-cover"
                    />
                    <p className="px-4 py-2 text-xs text-white/40">
                      {purchased ? "Comercial HD" : "Avance gratuito"}
                    </p>
                  </div>
                )}
              </div>
              <p className="text-center text-sm text-white/45">{intent}</p>
              <PrimaryButton onClick={() => goTo("download-center")}>
                Ir al centro de descargas
              </PrimaryButton>
              <SecondaryButton onClick={() => goTo("create-another")}>
                Crear otro comercial
              </SecondaryButton>
            </ExperiencePanel>
          </StepLayout>
        )}

        {phase === "download-center" && (
          <StepLayout
            eyebrow="Centro de descargas"
            title="Tus archivos listos"
            subtitle="Descarga en la calidad que compraste."
          >
            <ExperiencePanel className="space-y-4">
              {premiumImage && (
                <DownloadRow
                  label="Imagen premium"
                  badge="Incluido"
                  onDownload={() =>
                    downloadAsset(premiumImage, "metaprom-premium.jpg")
                  }
                />
              )}
              {videoUrl && (
                <DownloadRow
                  label={
                    purchased
                      ? "Comercial HD · sin marca de agua"
                      : "Avance gratuito · con marca"
                  }
                  badge={purchased ? "HD" : "Preview"}
                  onDownload={() =>
                    downloadAsset(
                      videoUrl,
                      purchased
                        ? "metaprom-comercial-hd.mp4"
                        : "metaprom-comercial-preview.mp4",
                    )
                  }
                />
              )}
              {!purchased && (
                <button
                  type="button"
                  onClick={() => goTo("checkout")}
                  className="mt-4 w-full text-center text-sm text-violet-300/80 transition hover:text-violet-200"
                >
                  Desbloquear versión HD →
                </button>
              )}
              <div className="pt-4">
                <PrimaryButton onClick={() => goTo("create-another")}>
                  Crear otro comercial
                </PrimaryButton>
              </div>
            </ExperiencePanel>
          </StepLayout>
        )}

        {phase === "create-another" && (
          <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 pb-28 pt-24 text-center">
            <FadeUp>
              <p className="text-xs uppercase tracking-[0.35em] text-white/40">
                ¿Listo para el siguiente?
              </p>
              <h1 className="mt-6 text-4xl font-bold leading-tight md:text-5xl">
                Crea otro comercial
              </h1>
              <p className="mx-auto mt-6 max-w-md text-lg text-white/55">
                El mismo flujo premium. Sube una nueva foto y Metaprom hará el
                resto.
              </p>
              <div className="mt-10 space-y-3">
                <PrimaryButton onClick={resetForNewCommercial}>
                  Empezar de nuevo
                </PrimaryButton>
                <SecondaryButton onClick={() => goTo("library")}>
                  Ver mi biblioteca
                </SecondaryButton>
              </div>
            </FadeUp>
          </div>
        )}
      </AnimatePresence>
    </ExperienceShell>
  );
}

function DownloadRow({
  label,
  badge,
  onDownload,
}: {
  label: string;
  badge: string;
  onDownload: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4">
      <div>
        <p className="font-medium text-white/85">{label}</p>
        <span className="mt-1 inline-block rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/45">
          {badge}
        </span>
      </div>
      <button
        type="button"
        onClick={onDownload}
        className="shrink-0 rounded-full border border-white/20 px-4 py-2 text-sm font-medium transition hover:bg-white/10"
      >
        Descargar
      </button>
    </div>
  );
}

function buildProjectName(intentText: string): string {
  const trimmed = intentText.trim();
  if (!trimmed) return "Mi comercial";
  return trimmed.length > 42 ? `${trimmed.slice(0, 42)}…` : trimmed;
}

function downloadAsset(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
}
