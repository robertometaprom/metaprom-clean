"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
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
import StudioIndustryExamples from "@/components/studio/StudioIndustryExamples";
import StudioPlatforms from "@/components/studio/StudioPlatforms";
import StudioTrustBar from "@/components/studio/StudioTrustBar";
import { markStudioHasProjects } from "@/components/studio/StudioShell";
import Checkout from "@/components/checkout/Checkout";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import {
  PROMPT_CATEGORY_CHIPS,
  type PromptCategoryIcon,
} from "@/lib/studio-atmosphere";
import {
  PRODUCT_CATALOG,
  resolveStudioWorkflow,
  type CatalogProduct,
} from "@/lib/product-catalog";
import { recordMarketIntelligence } from "@/lib/market-intelligence";
import {
  completeCheckoutAfterRedirect,
  createCommercialAssets,
  getAutoSaveMessage,
  mapCreationError,
  persistCreationToLibrary,
  purchaseHdCommercial,
  type AutoSaveStatus,
  type CreationStep,
} from "@/lib/studio-creation";
import type { PaymentProviderDisplayMetadata } from "@/lib/payments";
import type { PaymentMethod } from "@/lib/payments/types";
import { getPricingPackageById } from "@/lib/pricing";
import CinematicReveal from "@/components/studio/CinematicReveal";
import CreativeDirectorPanel from "@/components/studio/CreativeDirectorPanel";
import DestinationStep from "@/components/studio/DestinationStep";
import InstantCaptureButtons from "@/components/studio/InstantCaptureButtons";
import type { ProjectContext } from "@/lib/creative-director/types";
import type { CompanionMoment } from "@/lib/studio/creative-director-companion";
import { primeCinematicFullscreen } from "@/lib/cinematic-fullscreen";
import type { StudioDestination } from "@/lib/studio-destination";
import { buildPublicPreviewUrl } from "@/lib/preview/share-url";
import {
  buildAuthRedirectUrl,
  claimStudioDraft,
  fetchStudioDraft,
  readResumeTokenFromLocation,
  readStoredResumeToken,
  saveStudioDraft,
  stripResumeTokenFromUrl,
} from "@/lib/studio-draft/client";
import type {
  StudioDraftPendingAction,
  StudioDraftResponse,
} from "@/lib/studio-draft/types";
import type { ConversationMessage } from "@/lib/creative-director/types";
import { createClient } from "@/lib/supabase/client";
import type { SerializablePanelMessage } from "@/components/studio/CreativeDirectorPanel";

type Phase =
  | "welcome"
  | "unavailable"
  | "upload"
  | "destination"
  | "intent"
  | "creating"
  | "preview"
  | "checkout"
  | "processing_payment"
  | "processing_premium"
  | "ready"
  | "error";

const OFF_TOPIC_MESSAGE =
  "Solo puedo ayudarte a crear contenido de marketing — imágenes, videos y material para vender mejor. ¿Qué te gustaría crear hoy?";

const HD_COMMERCIAL_PRICE =
  getPricingPackageById("commercial_1")?.displayPrice ?? 180;

const CHECKOUT_PAYMENT_METHODS = [
  { id: "card" as const, label: "Tarjeta" },
  { id: "oxxo" as const, label: "OXXO" },
];

const EASE = [0.22, 1, 0.36, 1] as const;

function describeRuntimeError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ""}`;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

type CreativeDirectorProps = {
  paymentProviderDisplay: PaymentProviderDisplayMetadata;
  onWelcomeChange?: (isWelcome: boolean) => void;
  onOpenLibrary?: (focus?: {
    projectId?: string;
    assetId?: string;
  }) => void;
  onLibraryUpdated?: (focus?: {
    projectId?: string;
    assetId?: string;
  }) => void;
};

export default function CreativeDirector({
  paymentProviderDisplay,
  onWelcomeChange,
  onOpenLibrary,
  onLibraryUpdated,
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
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [checkoutAssetId, setCheckoutAssetId] = useState<string | null>(null);
  const [shareSlug, setShareSlug] = useState<string | null>(null);
  const [premiumReady, setPremiumReady] = useState(false);
  const [destination, setDestination] = useState<StudioDestination | null>(
    null,
  );
  const [directorPanelOpen, setDirectorPanelOpen] = useState(false);
  const [pendingCompanionMoment, setPendingCompanionMoment] =
    useState<CompanionMoment | null>(null);
  const [directorSessionKey, setDirectorSessionKey] = useState("initial");
  const [resumeToken, setResumeToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [draftRecoveryError, setDraftRecoveryError] = useState<string | null>(
    null,
  );
  const [showRegistrationInvite, setShowRegistrationInvite] = useState(false);
  const [directorMessages, setDirectorMessages] = useState<
    SerializablePanelMessage[]
  >([]);

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
    destination?: StudioDestination | null;
  }>({});
  const destinationRef = useRef<StudioDestination | null>(null);
  const teaserVideoBlobStore = useRef<Blob | null>(null);
  const resumeHandledRef = useRef(false);
  const authRedirectToRef = useRef("/studio");

  useEffect(() => {
    selectedFileRef.current = selectedFile;
  }, [selectedFile]);

  useEffect(() => {
    onWelcomeChange?.(phase === "welcome");
  }, [phase, onWelcomeChange]);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAuthenticated(Boolean(user));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session?.user));
    });

    return () => subscription.unsubscribe();
  }, []);

  const buildDraftPayload = useCallback(
    (pendingAction?: StudioDraftPendingAction | null) => {
      const product = matchedProductRef.current;
      const conversationHistory: ConversationMessage[] = directorMessages.map(
        (message) => ({
          role: message.role,
          content: message.content,
        }),
      );

      return {
        resumeToken: resumeToken ?? undefined,
        phase: (phase === "checkout" ||
        phase === "processing_payment" ||
        phase === "processing_premium" ||
        phase === "ready"
          ? phase
          : "preview") as "preview" | "checkout" | "processing_payment" | "processing_premium" | "ready",
        customerIntent: customerIntentRef.current.trim(),
        imagePrompt: imagePromptRef.current,
        videoPrompt: videoPromptRef.current,
        workflowId:
          projectMetadataRef.current.workflow_id ?? product.id ?? null,
        industry: projectMetadataRef.current.industry ?? null,
        intendedDestination:
          destinationRef.current?.platform ??
          projectMetadataRef.current.intended_destination ??
          null,
        destination: destinationRef.current,
        productMode: product.mode,
        conversationHistory,
        pendingAction: pendingAction ?? null,
      };
    },
    [directorMessages, phase, resumeToken],
  );

  const persistAnonymousDraft = useCallback(
    async (
      pendingAction?: StudioDraftPendingAction | null,
      overrides?: {
        enhancedDataUrl?: string;
        teaserVideoBlob?: Blob | null;
      },
    ) => {
      const file = selectedFileRef.current;
      const enhancedDataUrl = overrides?.enhancedDataUrl ?? premiumImage;
      if (!file || !enhancedDataUrl) {
        throw new Error("No hay suficiente información para guardar tu borrador.");
      }

      const result = await saveStudioDraft({
        payload: buildDraftPayload(pendingAction),
        originalFile: file,
        enhancedDataUrl,
        teaserVideoBlob:
          overrides?.teaserVideoBlob ?? teaserVideoBlobStore.current,
      });

      setResumeToken(result.resumeToken);
      authRedirectToRef.current = buildAuthRedirectUrl(result.resumeToken);
      return result.resumeToken;
    },
    [buildDraftPayload, premiumImage],
  );

  const restoreStudioFromDraft = useCallback(
    async (draftResponse: StudioDraftResponse) => {
      const { draft, urls } = draftResponse;

      setResumeToken(draft.resume_token);
      authRedirectToRef.current = buildAuthRedirectUrl(draft.resume_token);
      setDraftRecoveryError(null);

      customerIntentRef.current = draft.customer_intent ?? "";
      setInput(draft.customer_intent ?? "");
      imagePromptRef.current = draft.image_prompt ?? "";
      videoPromptRef.current = draft.video_prompt ?? "";
      projectMetadataRef.current = {
        workflow_id: draft.workflow_id,
        industry: draft.industry,
        intended_destination: draft.intended_destination,
        destination: draft.destination,
      };
      destinationRef.current = draft.destination;
      setDestination(draft.destination);

      const productId = (draft.workflow_id ??
        "premium-image") as keyof typeof PRODUCT_CATALOG;
      const product =
        PRODUCT_CATALOG[productId] ?? PRODUCT_CATALOG["premium-image"];
      setMatchedProduct(product);
      matchedProductRef.current = product;

      if (urls.enhancedUrl) {
        setPremiumImage(urls.enhancedUrl);
      }

      if (urls.teaserUrl) {
        if (videoUrlRef.current?.startsWith("blob:")) {
          URL.revokeObjectURL(videoUrlRef.current);
        }
        videoUrlRef.current = urls.teaserUrl;
        setVideoUrl(urls.teaserUrl);
      }

      if (urls.originalUrl) {
        if (previewUrlRef.current?.startsWith("blob:")) {
          URL.revokeObjectURL(previewUrlRef.current);
        }
        previewUrlRef.current = urls.originalUrl;
        setPreviewUrl(urls.originalUrl);

        try {
          const response = await fetch(urls.originalUrl);
          const blob = await response.blob();
          const file = new File(
            [blob],
            draft.original_name || "original.jpg",
            {
              type: draft.original_content_type || blob.type || "image/jpeg",
            },
          );
          setSelectedFile(file);
          selectedFileRef.current = file;
        } catch (fetchError) {
          console.error("Failed to restore original file from draft", fetchError);
        }
      }

      if (draft.conversation_history?.length) {
        setDirectorMessages(
          draft.conversation_history.map((message, index) => ({
            id: `restored-${index}-${draft.resume_token}`,
            role: message.role,
            content: message.content,
          })),
        );
      }

      const restoredPhase =
        draft.phase === "checkout" ||
        draft.phase === "processing_payment" ||
        draft.phase === "processing_premium" ||
        draft.phase === "ready"
          ? draft.phase
          : "preview";
      setPhase(restoredPhase);
      setAutoSaveStatus("local-only");
      setDirectorPanelOpen(false);
      setShowRegistrationInvite(false);
    },
    [],
  );

  const applyClaimResult = useCallback(
    async (
      claimResult: Awaited<ReturnType<typeof claimStudioDraft>>,
    ) => {
      savedProjectIdRef.current = claimResult.projectId;
      savedAssetIdRef.current = claimResult.assetId;
      setCheckoutAssetId(claimResult.assetId);
      if (claimResult.shareSlug) {
        setShareSlug(claimResult.shareSlug);
      }
      setAutoSaveStatus("saved");
      markStudioHasProjects();
      onLibraryUpdated?.({
        projectId: claimResult.projectId,
        assetId: claimResult.assetId,
      });

      if (claimResult.pendingAction === "unlock") {
        setPhase("checkout");
      } else {
        setPhase("preview");
        onOpenLibrary?.({
          projectId: claimResult.projectId,
          assetId: claimResult.assetId,
        });
      }

      setShowRegistrationInvite(false);
      setPendingCompanionMoment(null);
    },
    [onLibraryUpdated, onOpenLibrary],
  );

  const requestAuthentication = useCallback(
    async (pendingAction: StudioDraftPendingAction) => {
      setDraftRecoveryError(null);

      try {
        await persistAnonymousDraft(pendingAction);
        setPendingCompanionMoment("save_invitation");
        setShowRegistrationInvite(true);
        setDirectorPanelOpen(true);
      } catch (saveError) {
        console.error(saveError);
        setDraftRecoveryError(
          saveError instanceof Error
            ? saveError.message
            : "No pudimos preparar tu borrador para continuar.",
        );
      }
    },
    [persistAnonymousDraft],
  );

  useEffect(() => {
    if (resumeHandledRef.current) return;

    const urlToken = readResumeTokenFromLocation();
    const storedToken = readStoredResumeToken();
    const token = urlToken ?? storedToken;

    if (!token) return;

    let cancelled = false;

    const resume = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const claimResult = await claimStudioDraft(token);
          if (cancelled) return;
          await applyClaimResult(claimResult);
          resumeHandledRef.current = true;
          return;
        }

        const draftResponse = await fetchStudioDraft(token);
        if (cancelled) return;
        await restoreStudioFromDraft(draftResponse);
        resumeHandledRef.current = true;
      } catch (resumeError) {
        if (cancelled) return;
        console.error(resumeError);
        setDraftRecoveryError(
          resumeError instanceof Error
            ? resumeError.message
            : "No pudimos recuperar tu sesión anterior.",
        );
        if (urlToken) {
          stripResumeTokenFromUrl();
        }
      }
    };

    void resume();

    return () => {
      cancelled = true;
    };
  }, [applyClaimResult, restoreStudioFromDraft]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const sessionId = params.get("session_id");

    if (payment !== "success" && payment !== "cancelled") return;

    window.history.replaceState({}, "", "/studio");

    let cancelled = false;

    const timer = window.setTimeout(() => {
      if (cancelled) return;

      if (payment === "cancelled") {
        setPhase("checkout");
        setCheckoutMessage("El checkout fue cancelado. Puedes intentar de nuevo.");
        return;
      }

      if (!sessionId) {
        setPhase("error");
        setCheckoutMessage("No pudimos confirmar la sesión de pago.");
        return;
      }

      setPhase("processing_payment");
      setCheckoutMessage("Confirmando tu pago...");

      completeCheckoutAfterRedirect(sessionId, setCheckoutMessage)
        .then((result) => {
          if (cancelled) return;

          if (result.assetId) {
            savedAssetIdRef.current = result.assetId;
            setCheckoutAssetId(result.assetId);
          }

          if (result.premiumVideoUrl) {
            if (videoUrlRef.current?.startsWith("blob:")) {
              URL.revokeObjectURL(videoUrlRef.current);
            }
            videoUrlRef.current = null;
            setVideoUrl(result.premiumVideoUrl);
            setPremiumReady(true);
          }

          setCheckoutMessage(result.message);
          setPhase(result.premiumVideoUrl ? "ready" : "processing_premium");
          onLibraryUpdated?.({
            projectId: savedProjectIdRef.current ?? undefined,
            assetId: result.assetId,
          });

          if (result.premiumVideoUrl) {
            onOpenLibrary?.({
              projectId: savedProjectIdRef.current ?? undefined,
              assetId: result.assetId,
            });
          }
        })
        .catch((paymentError) => {
          if (cancelled) return;

          const runtimeError = describeRuntimeError(paymentError);
          console.error("[metaprom-runtime-trace] checkout redirect failed", {
            error: runtimeError,
          });
          setPhase("error");
          setCheckoutMessage(runtimeError);
        })
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [onLibraryUpdated, onOpenLibrary]);

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
          intended_destination:
            destinationRef.current?.platform ?? product.destination,
          destination: destinationRef.current,
        },
        existingProjectId: savedProjectIdRef.current,
        existingAssetId: savedAssetIdRef.current,
        // Commercial production: image enhancement is internal; do not require
        // Advertising Image packages.
        billAdvertisingAsset: false,
      });

      if (result.projectId) savedProjectIdRef.current = result.projectId;
      if (result.assetId) {
        savedAssetIdRef.current = result.assetId;
        setCheckoutAssetId(result.assetId);
      }
      if (result.shareSlug) {
        setShareSlug(result.shareSlug);
      }
      if (result.status === "saved") {
        markStudioHasProjects();
        onLibraryUpdated?.({
          projectId: result.projectId ?? undefined,
          assetId: result.assetId ?? undefined,
        });
      } else if (result.status === "local-only") {
        try {
          await persistAnonymousDraft(null, {
            enhancedDataUrl: input.enhancedDataUrl,
            teaserVideoBlob: input.teaserVideoBlob,
          });
        } catch (draftError) {
          console.error("Anonymous draft persistence failed", draftError);
        }
      } else if (result.status === "requires-package") {
        setError(
          result.message ??
            "Necesitas Imágenes Publicitarias disponibles para crear esta pieza.",
        );
      }
      setAutoSaveStatus(result.status);
    },
    [onLibraryUpdated, persistAnonymousDraft],
  );

  useEffect(() => {
    if (!isAuthenticated || autoSaveStatus !== "local-only") return;

    const file = selectedFileRef.current;
    if (!file || !premiumImage || savedAssetIdRef.current) return;

    void persistToLibrary({
      originalFile: file,
      enhancedDataUrl: premiumImage,
      teaserVideoBlob: teaserVideoBlobStore.current ?? undefined,
      imagePrompt: imagePromptRef.current,
      videoPrompt: videoPromptRef.current,
    });
  }, [autoSaveStatus, isAuthenticated, persistToLibrary, premiumImage]);

  const runCreation = useCallback(async () => {
    const file = selectedFileRef.current;
    if (!file) {
      setError("Sube una foto para continuar.");
      setPhase("upload");
      return;
    }

    primeCinematicFullscreen();

    setPhase("creating");
    setCreationStep("image");
    setCreationMessage("Preparando tu escena comercial...");
    setError(null);
    setPremiumImage(null);
    setVideoUrl(null);
    setAutoSaveStatus("idle");
    setShareSlug(null);
    savedProjectIdRef.current = null;
    savedAssetIdRef.current = null;
    setCheckoutAssetId(null);

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
        destination: destinationRef.current,
        onStep: (step, message) => {
          setCreationStep(step);
          setCreationMessage(message);
        },
      });

      imagePromptRef.current = result.imagePrompt;
      videoPromptRef.current = result.videoPrompt;
      setPremiumImage(result.premiumImage);
      teaserVideoBlobStore.current = result.videoBlob;
      videoUrlRef.current = result.videoUrl;
      setVideoUrl(result.videoUrl);

      await persistToLibrary({
        originalFile: file,
        enhancedDataUrl: result.premiumImage,
        teaserVideoBlob: result.videoBlob,
        imagePrompt: result.imagePrompt,
        videoPrompt: result.videoPrompt,
      });

      setPhase("preview");
      setPendingCompanionMoment("preview");
    } catch (createError) {
      console.error(createError);
      setError(
        mapCreationError(
          createError instanceof Error ? createError.message : undefined,
        ) || "Algo salió mal. Intenta de nuevo.",
      );
      setPhase("upload");
    }
  }, [persistToLibrary]);

  const handleIntentSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      const trimmed = input.trim();
      const hasPhoto = Boolean(selectedFileRef.current);

      if (!trimmed) return;

      if (!hasPhoto) {
        setPhase("upload");
        return;
      }

      const resolution = resolveStudioWorkflow(trimmed, hasPhoto);

      if (resolution.blocked) {
        setPhase("unavailable");
        setError(OFF_TOPIC_MESSAGE);
        return;
      }

      await recordMarketIntelligence({
        requested_service: resolution.requestedService,
        industry: resolution.industry,
        intended_destination:
          destinationRef.current?.platform ?? resolution.intendedDestination,
        matched_workflow: resolution.matchedExplicitly,
        workflow_id: resolution.matchedExplicitly
          ? resolution.productId
          : undefined,
      });

      setMatchedProduct(resolution.product);
      matchedProductRef.current = resolution.product;
      customerIntentRef.current = trimmed;
      projectMetadataRef.current = {
        ...projectMetadataRef.current,
        workflow_id: resolution.matchedExplicitly
          ? resolution.productId
          : resolution.product.id,
        industry: resolution.industry,
        intended_destination:
          destinationRef.current?.platform ?? resolution.intendedDestination,
        destination: destinationRef.current,
      };
      setError(null);

      await runCreation();
    },
    [input, runCreation],
  );

  const handleDestinationContinue = useCallback(
    (selected: StudioDestination) => {
      setDestination(selected);
      destinationRef.current = selected;
      projectMetadataRef.current = {
        ...projectMetadataRef.current,
        destination: selected,
        intended_destination: selected.platform,
      };
      setPhase("intent");
    },
    [],
  );

  const applySelectedFile = useCallback(
    (file: File, options?: { autoContinue?: boolean }) => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }

      setSelectedFile(file);
      selectedFileRef.current = file;
      setPremiumImage(null);
      setVideoUrl(null);
      setError(null);

      const url = URL.createObjectURL(file);
      previewUrlRef.current = url;
      setPreviewUrl(url);

      if (!options?.autoContinue || phase !== "upload") return;

      setPhase("destination");
    },
    [phase],
  );

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    applySelectedFile(file, {
      autoContinue: phase === "upload",
    });
  };

  const handleExampleClick = (example: string) => {
    setInput(example);
    if (phase === "welcome") {
      setPhase("upload");
    }
  };

  const handleCreateWow = () => {
    if (!selectedFile) return;
    setPhase("destination");
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

  const startCheckoutPurchase = async (
    paymentMethod: PaymentMethod,
    onStatus: (message: string) => void,
  ) => {
    if (!savedAssetIdRef.current) {
      throw new Error("Inicia sesión para comprar tu comercial HD.");
    }

    setCheckoutMessage(null);
    setPhase("processing_payment");

    try {
      return await purchaseHdCommercial({
        assetId: savedAssetIdRef.current,
        paymentMethod,
        onStatus: (message) => {
          setCheckoutMessage(message);
          onStatus(message);

          if (message.includes("Produciendo")) {
            setPhase("processing_premium");
          }
        },
      });
    } catch (purchaseError) {
      setPhase("error");
      throw purchaseError;
    }
  };

  const handleCheckoutSuccess = (
    result: Awaited<ReturnType<typeof purchaseHdCommercial>>,
  ) => {
    if (result.redirected) {
      setCheckoutMessage(result.message);
      return;
    }

    if (result.premiumVideoUrl) {
      if (videoUrlRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(videoUrlRef.current);
      }
      videoUrlRef.current = null;
      setVideoUrl(result.premiumVideoUrl);
      setPremiumReady(true);
    } else {
      setPhase("processing_premium");
    }

    setCheckoutMessage(result.message);

    if (result.premiumVideoUrl) {
      setPhase("ready");
      onLibraryUpdated?.({
        projectId: savedProjectIdRef.current ?? undefined,
        assetId: savedAssetIdRef.current ?? undefined,
      });
      handleOpenLibrary();
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
    setDestination(null);
    destinationRef.current = null;
    setDirectorPanelOpen(false);
    setPendingCompanionMoment(null);
    setDirectorSessionKey(`${Date.now()}`);
    setCheckoutMessage(null);
    setResumeToken(null);
    setShowRegistrationInvite(false);
    setDirectorMessages([]);
    setDraftRecoveryError(null);
    teaserVideoBlobStore.current = null;
    authRedirectToRef.current = "/studio";
    resumeHandledRef.current = false;
    savedProjectIdRef.current = null;
    savedAssetIdRef.current = null;
    setCheckoutAssetId(null);
    setShareSlug(null);
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

  const handleOpenLibrary = useCallback(() => {
    if (!isAuthenticated || autoSaveStatus === "local-only") {
      void requestAuthentication("save");
      return;
    }

    onOpenLibrary?.({
      projectId: savedProjectIdRef.current ?? undefined,
      assetId: savedAssetIdRef.current ?? undefined,
    });
  }, [autoSaveStatus, isAuthenticated, onOpenLibrary, requestAuthentication]);

  const handleUnlock = useCallback(() => {
    if (!isAuthenticated || !savedAssetIdRef.current) {
      void requestAuthentication("unlock");
      return;
    }

    setPhase("checkout");
  }, [isAuthenticated, requestAuthentication]);

  const contextualUploadMessage = matchedProduct
    ? getUploadMessage(matchedProduct)
    : "Sube una foto de lo que vendes.";

  const creativeDirectorProjectContext: ProjectContext = {
    currentImage: previewUrl ? { url: previewUrl } : undefined,
    currentCommercialDescription: input.trim() || undefined,
    destination: destination
      ? {
          platform: destination.platform,
          aspectRatio: destination.aspectRatio,
          width: destination.width,
          height: destination.height,
        }
      : undefined,
    workflow: matchedProduct?.id,
    previousPreview: videoUrl ? { url: videoUrl } : undefined,
  };

  const handleCompanionMomentHandled = useCallback((moment: CompanionMoment) => {
    setPendingCompanionMoment((current) =>
      current === moment ? null : current,
    );
  }, []);

  const handleOpenDirectorPanel = useCallback(() => {
    setDirectorPanelOpen(true);
  }, []);

  const handleUseDirectorProposal = useCallback((narrative: string) => {
    setInput(narrative);
    customerIntentRef.current = narrative;
    setError(null);
  }, []);

  const checkoutProvider = {
    id: paymentProviderDisplay.id,
    label: paymentProviderDisplay.label,
    paymentMethods: CHECKOUT_PAYMENT_METHODS,
    startPurchase: startCheckoutPurchase,
  };

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
                id="studio-prompt"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
                className="relative z-10 rounded-3xl border border-neutral-200/80 bg-white px-6 py-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)] sm:px-10 sm:py-10"
              >
                <div className="space-y-2 text-center">
                  <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
                    Sube tu{" "}
                    <span className="bg-gradient-to-r from-violet-600 to-purple-500 bg-clip-text text-transparent">
                      foto
                    </span>
                  </h2>
                  <p className="text-sm text-neutral-500 sm:text-base">
                    Toma una foto de lo que vendes — Metaprom crea tu comercial.
                  </p>
                </div>

                <div className="mt-8">
                  <button
                    type="button"
                    onClick={() => setPhase("upload")}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 py-4 text-base font-semibold text-white transition hover:from-violet-600 hover:to-purple-700"
                  >
                    Subir o tomar foto
                    <span aria-hidden="true">→</span>
                  </button>
                </div>

                {error && (
                  <div className="mt-4 space-y-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    <p className="whitespace-pre-line">{error}</p>
                    {autoSaveStatus === "requires-package" && (
                      <Link
                        href="/planes"
                        className="inline-flex font-semibold text-red-700 underline underline-offset-2"
                      >
                        Ver planes
                      </Link>
                    )}
                  </div>
                )}
              </motion.div>
            </div>
          </StudioAtmosphere>

          <StudioIndustryExamples onExampleSelect={handleExampleClick} />
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
            <p className="whitespace-pre-line text-lg leading-relaxed text-neutral-700">{error}</p>
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
              <h2 className="text-2xl font-bold leading-tight text-neutral-900 sm:text-3xl">
                {contextualUploadMessage}
              </h2>
            </div>

            <InstantCaptureButtons
              onFileSelected={(file) =>
                applySelectedFile(file, { autoContinue: true })
              }
            />

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
                  <div className="flex min-h-32 flex-col items-center justify-center gap-2 px-6 py-8 text-center">
                    <p className="text-sm text-neutral-500">
                      o arrastra tu foto aquí
                    </p>
                    <p className="text-xs text-neutral-400">
                      Una foto de celular es suficiente
                    </p>
                  </div>
                )}
              </div>
            </label>

            {error && (
              <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                <p className="whitespace-pre-line">{error}</p>
                {autoSaveStatus === "requires-package" && (
                  <Link
                    href="/planes"
                    className="inline-flex font-semibold text-red-700 underline underline-offset-2"
                  >
                    Ver planes
                  </Link>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleCreateWow}
                disabled={!selectedFile}
                className="flex-1 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 py-4 text-base font-semibold text-white transition hover:from-violet-600 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continuar
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

        {phase === "destination" && (
          <motion.div
            key="destination"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="-mx-6 rounded-3xl bg-black px-6 py-8 sm:-mx-0"
          >
            {previewUrl && (
              <div className="mb-6 flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Vista previa"
                  className="max-h-24 rounded-xl border border-white/10 object-contain"
                />
              </div>
            )}
            <DestinationStep
              onContinue={handleDestinationContinue}
              onBack={() => setPhase("upload")}
            />
          </motion.div>
        )}

        {phase === "intent" && (
          <motion.div
            key="intent"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="-mx-6 space-y-8 rounded-3xl bg-black px-6 py-8 sm:-mx-0"
          >
            <div className="space-y-3 text-center">
              {destination && (
                <p className="text-sm text-white/45">
                  {destination.platform} · {destination.aspectRatio}
                </p>
              )}
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                ¿Qué te gustaría crear hoy?
              </h2>
              <p className="text-base text-white/55">
                Describe tu comercial. Metaprom interpreta tu intención.
              </p>
            </div>

            <form onSubmit={handleIntentSubmit} className="space-y-5">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Describe tu comercial. Ej: hamburguesa artesanal en cámara lenta..."
                  className="w-full bg-transparent py-4 pl-5 pr-36 text-base text-white placeholder:text-white/35 focus:outline-none"
                />
                <div className="absolute inset-y-0 right-2 flex items-center">
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500 via-purple-500 to-cyan-400 px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span aria-hidden="true">✨</span>
                    Generar
                  </button>
                </div>
              </div>

              {error && (
                <div className="space-y-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  <p className="whitespace-pre-line">{error}</p>
                  {autoSaveStatus === "requires-package" && (
                    <Link
                      href="/planes"
                      className="inline-flex font-semibold text-red-200 underline underline-offset-2"
                    >
                      Ver planes
                    </Link>
                  )}
                </div>
              )}

              <div className="border-t border-white/10 pt-5 text-center">
                <p className="text-sm text-white/45">¿Necesitas ayuda?</p>
                <button
                  type="button"
                  onClick={() => setDirectorPanelOpen(true)}
                  className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white/85 transition hover:border-white/25 hover:bg-white/[0.08] hover:text-white"
                >
                  <span aria-hidden="true">✨</span>
                  Habla con el Director Creativo
                </button>
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                {PROMPT_CATEGORY_CHIPS.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => handleExampleClick(chip.prompt)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-white/75 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                  >
                    <PromptCategoryIcon type={chip.icon} />
                    {chip.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setPhase("destination")}
                className="w-full rounded-2xl py-3 text-sm font-semibold text-white/50 transition hover:text-white/80"
              >
                Volver
              </button>
            </form>
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
                  ? "Preparando la escena de tu comercial..."
                  : creationStep === "video"
                    ? "Produciendo tu comercial..."
                    : "¡Tu comercial está listo!"}
              </p>
            </div>
          </motion.div>
        )}

        {phase === "preview" &&
          videoUrl && (
            <CinematicReveal
              videoUrl={videoUrl}
              priceMxn={HD_COMMERCIAL_PRICE}
              autoSaveMessage={autoSaveMessage}
              onAutoSaveClick={handleOpenLibrary}
              initialStage="fade"
              onUnlock={handleUnlock}
              onCreateNew={resetFlow}
              onDownloadImage={premiumImage ? handleDownloadImage : undefined}
              hasPremiumImage={Boolean(premiumImage)}
              shareSlug={shareSlug}
              publicPreviewUrl={shareSlug ? buildPublicPreviewUrl(shareSlug) : null}
              onOpenCreativeDirector={handleOpenDirectorPanel}
            />
          )}

        {draftRecoveryError && (
          <div className="mx-auto mb-4 max-w-md rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            {draftRecoveryError}
          </div>
        )}

        {(phase === "checkout" ||
          phase === "processing_payment" ||
          phase === "processing_premium" ||
          phase === "error") && (
          <motion.div
            key="checkout"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <Checkout
              purchaseId={checkoutAssetId}
              price={HD_COMMERCIAL_PRICE}
              currency="MXN"
              provider={checkoutProvider}
              previewVideoUrl={videoUrl}
              error={checkoutMessage}
              onSuccess={handleCheckoutSuccess}
              onCancel={() => setPhase("preview")}
            />
            {!checkoutAssetId && showRegistrationInvite && (
              <div className="mx-auto max-w-md">
                <GoogleSignInButton
                  redirectTo={authRedirectToRef.current}
                  label="Crear cuenta gratuita para continuar"
                />
              </div>
            )}
          </motion.div>
        )}

        {phase === "ready" && videoUrl && (
          <motion.div
            key="ready"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-md space-y-4 rounded-3xl border border-neutral-200 bg-white p-8 shadow-lg"
          >
            <Checkout
              purchaseId={checkoutAssetId}
              price={HD_COMMERCIAL_PRICE}
              currency="MXN"
              provider={checkoutProvider}
              previewVideoUrl={videoUrl}
              isUnlocked
              error={checkoutMessage}
              onSuccess={handleCheckoutSuccess}
              onCancel={() => setPhase("preview")}
            />
            <button
              type="button"
              onClick={handleDownloadVideo}
              className="w-full rounded-2xl bg-violet-600 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
            >
              Descargar comercial HD
            </button>
          </motion.div>
        )}
        </AnimatePresence>
        </div>
      )}

      <CreativeDirectorPanel
        open={directorPanelOpen}
        stackLayer={phase === "preview" ? "elevated" : "default"}
        onClose={() => setDirectorPanelOpen(false)}
        projectContext={creativeDirectorProjectContext}
        onUseProposal={handleUseDirectorProposal}
        pendingCompanionMoment={pendingCompanionMoment}
        onCompanionMomentHandled={handleCompanionMomentHandled}
        sessionKey={directorSessionKey}
        initialMessages={directorMessages}
        onMessagesChange={setDirectorMessages}
        authRedirectTo={authRedirectToRef.current}
        showRegistrationInvite={showRegistrationInvite}
      />
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
      return "Toma una foto y crearemos tu comercial.";
    default:
      return "Toma una foto de lo que vendes — creamos tu comercial.";
  }
}

function PromptCategoryIcon({ type }: { type: PromptCategoryIcon }) {
  const className = "h-3.5 w-3.5 text-white/50";

  switch (type) {
    case "food":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v14M8 6v4M16 6v4M4 10h16" />
        </svg>
      );
    case "real-estate":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10h14V10" />
        </svg>
      );
    case "fashion":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      );
    case "coffee":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 8h10v6a4 4 0 01-4 4H8a4 4 0 01-4-4V8zM18 10h1a2 2 0 010 4h-1" />
        </svg>
      );
    case "beauty":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M12 22a10 10 0 110-20 10 10 0 010 20z" />
        </svg>
      );
    case "automotive":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 11l1.5-4.5h11L19 11M5 11v6h2v-2h10v2h2v-6M7 17h.01M17 17h.01" />
        </svg>
      );
    case "more":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      );
  }
}
