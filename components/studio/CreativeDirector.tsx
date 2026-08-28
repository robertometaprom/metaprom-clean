"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { usePreviewViewedAnalytics } from "@/components/analytics/use-preview-viewed";
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
  AdvertisingImageAuthRequiredError,
  AdvertisingImagePackageRequiredError,
  completeCheckoutAfterRedirect,
  createAdvertisingImage,
  createCommercialAssets,
  getAutoSaveMessage,
  mapCreationError,
  persistCreationToLibrary,
  retryCreationPersistence,
  purchaseHdCommercial,
  type AutoSaveStatus,
  type CreationMode,
  type CreationStep,
} from "@/lib/studio-creation";
import type { StudioPersistenceRecovery } from "@/lib/studio-persistence";
import {
  ADVERTISING_IMAGE_AUTH_REQUIRED_MESSAGE,
  ADVERTISING_IMAGE_PACKAGE_REQUIRED_MESSAGE,
  ADVERTISING_IMAGE_WELCOME_AVAILABLE_MESSAGE,
} from "@/lib/entitlements/advertising-image-gate";
import {
  clearAdvertisingGenerateContinuity,
  readAdvertisingGenerateContinuity,
  saveAdvertisingGenerateContinuity,
} from "@/lib/studio/advertising-generate-continuity";
import type { PaymentProviderDisplayMetadata } from "@/lib/payments";
import type { PaymentMethod } from "@/lib/payments/types";
import { getPricingPackageById } from "@/lib/pricing";
import CinematicReveal from "@/components/studio/CinematicReveal";
import CreativeDirectorPanel from "@/components/studio/CreativeDirectorPanel";
import type { CommercialProposal } from "@/lib/creative-director/types";
import type {
  CommercialProductionProfile,
  PromotionalOverlays,
} from "@/lib/commercial-production-profile";
import type { OverlayStyle } from "@/lib/overlay-style-contract";
import DestinationStep from "@/components/studio/DestinationStep";
import DirectorReviewInvite from "@/components/studio/DirectorReviewInvite";
import DirectorResultReview from "@/components/studio/DirectorResultReview";
import InstantCaptureButtons from "@/components/studio/InstantCaptureButtons";
import DirectorStage from "@/components/studio/DirectorStage";
import StudioProgress from "@/components/studio/StudioProgress";
import {
  formatSourceFileSelectionMessage,
  IMAGE_ACCEPT,
  validateSourceImageFiles,
} from "@/lib/instant-capture";
import {
  getAdvertisingImageBand,
  getBatchAdvertisingBand,
  getCommercialCreationBand,
  getFinalizeImageBand,
  getPremiumProcessingBand,
  sleep,
  useStudioProgress,
} from "@/lib/studio-progress";
import {
  BatchInsufficientCreditsError,
  runBatchAdvertisingImages,
  type BatchAdvertisingItem,
  type BatchAdvertisingProgress,
} from "@/lib/studio/batch-advertising-orchestrator";
import {
  IMAGE_INTENT_CHOICES,
  resolveImageIntent,
  type ImageIntent,
} from "@/lib/studio/image-intent";
import type { ProjectContext } from "@/lib/creative-director/types";
import type { CompanionMoment } from "@/lib/studio/creative-director-companion";
import {
  type DirectorReviewFocus,
} from "@/lib/studio/director-review";
import { DIRECTOR_ARTWORK_SRC } from "@/lib/studio/director-stage";
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

/** Commercial Multi-Photo remains out of scope for Batch V1. */
const COMMERCIAL_BATCH_BLOCKED_MESSAGE =
  "El lote multi-foto está disponible solo para Imagen Publicitaria.";

const BATCH_RESELECT_MESSAGE =
  "Vuelve a seleccionar las fotos del lote para continuar. No se generó ninguna imagen.";

type Phase =
  | "welcome"
  | "unavailable"
  | "upload"
  | "creation_mode"
  | "destination"
  | "intent"
  | "image_intent"
  | "creating"
  | "batch_result"
  | "preview"
  | "image_result"
  | "image_ready"
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

/** Intent prompt: grow with content; scroll only after a generous cap. */
const INTENT_PROMPT_MAX_HEIGHT_PX = 384;

/** Local visual-only REVIEW mock slug — not a persisted production share. */
const UX4A_REVIEW_MOCK_SHARE_SLUG = "UX4AREVIEW2";
const UX4A_REVIEW_MOCK_VIDEO_URL = "/showcase/coffee/commercial.mp4";

/**
 * UX4A/UX4B local visual mock (?ux4aReview=1).
 * Local-safe only: development or localhost — never a public production shortcut.
 */
function isUx4aReviewMockRequest(): boolean {
  if (typeof window === "undefined") return false;
  if (new URLSearchParams(window.location.search).get("ux4aReview") !== "1") {
    return false;
  }
  if (process.env.NODE_ENV === "development") return true;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

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
  /** When true, compact presence sits left of the Biblioteca panel (desktop). */
  libraryOpen?: boolean;
  onOpenLibrary?: (focus?: {
    projectId?: string;
    assetId?: string;
  }) => void;
  onLibraryUpdated?: (focus?: {
    projectId?: string;
    assetId?: string;
  }) => void;
  premiumUnlockRequest?: {
    id: number;
    assetId: string;
    paymentMethod: PaymentMethod;
  } | null;
  chrome?: {
    signIn: string;
    signUp: string;
  };
};

export default function CreativeDirector({
  paymentProviderDisplay,
  onWelcomeChange,
  libraryOpen = false,
  onOpenLibrary,
  onLibraryUpdated,
  premiumUnlockRequest = null,
  chrome,
}: CreativeDirectorProps) {
  // Lazy init so ?ux4aReview=1 survives React Strict Mode remounts and does not
  // lose to the phase-cleanup effect that runs on the initial "welcome" paint.
  const [phase, setPhase] = useState<Phase>(() =>
    isUx4aReviewMockRequest() ? "preview" : "welcome",
  );
  const [input, setInput] = useState("");
  const [matchedProduct, setMatchedProduct] = useState<CatalogProduct | null>(
    null,
  );
  /** Dual Creation intent — set by chooser now; Director may set later. */
  const [creationMode, setCreationMode] = useState<CreationMode | null>(() =>
    isUx4aReviewMockRequest() ? "commercial" : null,
  );

  /**
   * Job inputs. Single-image production uses length === 1 unchanged.
   * Batch Multi-Photo Phase A allows 2..40 local Files with no generation.
   */
  const [sourceFiles, setSourceFiles] = useState<File[]>([]);
  const selectedFile = sourceFiles[0] ?? null;
  const isBatchSelection = sourceFiles.length > 1;
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  /** Object URLs aligned with sourceFiles for thumbnails / primary preview. */
  const [sourcePreviewUrls, setSourcePreviewUrls] = useState<string[]>([]);
  /** Batch Multi-Photo runtime state (client-only; not a DB queue). */
  const [batchItems, setBatchItems] = useState<BatchAdvertisingItem[]>([]);
  const [batchProjectId, setBatchProjectId] = useState<string | null>(null);
  const [batchProgressMessage, setBatchProgressMessage] = useState("");
  const batchItemsRef = useRef<BatchAdvertisingItem[]>([]);
  const batchProjectIdRef = useRef<string | null>(null);
  const [premiumImage, setPremiumImage] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(() =>
    isUx4aReviewMockRequest() ? UX4A_REVIEW_MOCK_VIDEO_URL : null,
  );
  const [creationStep, setCreationStep] = useState<CreationStep>("image");
  const [creationMessage, setCreationMessage] = useState("");
  const [creationPreparing, setCreationPreparing] = useState(false);
  const [commercialPersisting, setCommercialPersisting] = useState(false);
  const [creationProgressComplete, setCreationProgressComplete] =
    useState(false);
  const [creationProgressRunId, setCreationProgressRunId] = useState(0);
  const [finalizeProgressComplete, setFinalizeProgressComplete] =
    useState(false);
  const [finalizeProgressRunId, setFinalizeProgressRunId] = useState(0);
  const [premiumProgressComplete, setPremiumProgressComplete] = useState(false);
  const [premiumProgressRunId, setPremiumProgressRunId] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>("idle");
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [checkoutAssetId, setCheckoutAssetId] = useState<string | null>(null);
  const [shareSlug, setShareSlug] = useState<string | null>(() =>
    isUx4aReviewMockRequest() ? UX4A_REVIEW_MOCK_SHARE_SLUG : null,
  );
  const [premiumReady, setPremiumReady] = useState(false);
  const [destination, setDestination] = useState<StudioDestination | null>(
    null,
  );
  /** Fresh Studio opens in ACTIVE Director introduction; resume/payment may close. */
  const [directorPanelOpen, setDirectorPanelOpen] = useState(
    () => !isUx4aReviewMockRequest(),
  );
  const [pendingCompanionMoment, setPendingCompanionMoment] =
    useState<CompanionMoment | null>(null);
  const [directorSessionKey, setDirectorSessionKey] = useState("initial");
  const [resumeToken, setResumeToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [draftRecoveryError, setDraftRecoveryError] = useState<string | null>(
    null,
  );
  const [showRegistrationInvite, setShowRegistrationInvite] = useState(false);
  const [advertisingCreditsRemaining, setAdvertisingCreditsRemaining] =
    useState<number | null>(null);
  const [advertisingCreditMessage, setAdvertisingCreditMessage] = useState<
    string | null
  >(null);
  const welcomeGrantAttemptedRef = useRef(false);
  const [directorMessages, setDirectorMessages] = useState<
    SerializablePanelMessage[]
  >([]);
  /** Brief confirmation after Director “Usar esta propuesta” — not a session reset. */
  const [directorProposalApplied, setDirectorProposalApplied] = useState(false);
  /** CinematicReveal stage — REVIEW presentation activates at offer. */
  const [revealStage, setRevealStage] = useState<
    "fade" | "logo" | "playback" | "offer" | null
  >(() => (isUx4aReviewMockRequest() ? "offer" : null));
  const [directorReviewFocus, setDirectorReviewFocus] =
    useState<DirectorReviewFocus>("invite");
  /** Local visual mock for UX4A REVIEW without provider generation. */
  const [reviewVisualMock, setReviewVisualMock] = useState(() =>
    isUx4aReviewMockRequest(),
  );
  const [analyticsRunId, setAnalyticsRunId] = useState<string | null>(null);

  usePreviewViewedAnalytics({
    phase,
    videoUrl,
    premiumImage,
    assetId: checkoutAssetId,
    shareSlug,
    creationMode,
    runId: analyticsRunId,
    skip: reviewVisualMock,
  });

  const previewUrlRef = useRef<string | null>(null);
  const sourcePreviewUrlsRef = useRef<string[]>([]);
  const reviewDirectorHostRef = useRef<HTMLDivElement | null>(null);
  const intentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const videoUrlRef = useRef<string | null>(
    isUx4aReviewMockRequest() ? UX4A_REVIEW_MOCK_VIDEO_URL : null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sourceFilesRef = useRef<File[]>([]);
  const matchedProductRef = useRef<CatalogProduct>(
    PRODUCT_CATALOG["premium-image"],
  );
  const customerIntentRef = useRef("");
  const videoVisualIntentRef = useRef<string | null>(null);
  const productionProfileRef = useRef<CommercialProductionProfile | null>(null);
  const promotionalOverlaysRef = useRef<PromotionalOverlays | null>(null);
  const overlayStyleRef = useRef<OverlayStyle | null>(null);
  const requiredNarrativeBeatsRef = useRef<string[] | null>(null);
  /** Resolved Advertising Image intent for the current job (batch-shared). */
  const imageIntentRef = useRef<ImageIntent | null>(null);
  const [imageIntentQuestion, setImageIntentQuestion] = useState(
    "¿Qué quieres hacer con tus fotos?",
  );
  const savedProjectIdRef = useRef<string | null>(null);
  const savedAssetIdRef = useRef<string | null>(null);
  const premiumUnlockRequestHandledRef = useRef<number | null>(null);
  const persistenceRecoveryRef = useRef<StudioPersistenceRecovery | null>(null);
  const imagePromptRef = useRef("");
  const videoPromptRef = useRef("");
  const generationMetadataRef = useRef<
    ReturnType<typeof createCommercialAssets> extends Promise<infer Result>
      ? Result extends { generationMetadata: infer Metadata }
        ? Metadata | null
        : null
      : null
  >(null);
  const projectMetadataRef = useRef<{
    workflow_id?: string | null;
    industry?: string | null;
    intended_destination?: string | null;
    destination?: StudioDestination | null;
  }>({});
  const destinationRef = useRef<StudioDestination | null>(null);
  const creationModeRef = useRef<CreationMode | null>(
    isUx4aReviewMockRequest() ? "commercial" : null,
  );
  const teaserVideoBlobStore = useRef<Blob | null>(null);
  const resumeHandledRef = useRef(false);
  const authRedirectToRef = useRef("/studio");
  const finalizingImageRef = useRef(false);
  const generatingImageRef = useRef(false);
  /** Fresh Studio / resetFlow intro — not phase changes or intentional close. */
  const directorIntroHandledRef = useRef(false);

  useEffect(() => {
    creationModeRef.current = creationMode;
  }, [creationMode]);

  useEffect(() => {
    sourceFilesRef.current = sourceFiles;
  }, [sourceFiles]);

  useEffect(() => {
    sourcePreviewUrlsRef.current = sourcePreviewUrls;
  }, [sourcePreviewUrls]);

  const revokeBlobUrl = useCallback((url: string | null | undefined) => {
    if (url?.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  }, []);

  const revokeSourcePreviewUrls = useCallback(
    (urls: string[]) => {
      for (const url of urls) {
        revokeBlobUrl(url);
      }
    },
    [revokeBlobUrl],
  );

  const syncPrimaryPreview = useCallback((url: string | null) => {
    previewUrlRef.current = url;
    setPreviewUrl(url);
  }, []);

  const setSourceSelection = useCallback(
    (files: File[], urls: string[]) => {
      sourceFilesRef.current = files;
      setSourceFiles(files);
      sourcePreviewUrlsRef.current = urls;
      setSourcePreviewUrls(urls);
      syncPrimaryPreview(urls[0] ?? null);
    },
    [syncPrimaryPreview],
  );

  /** Single-file path used by draft restore — collapses to 0..1. */
  const setPrimarySourceFile = useCallback(
    (file: File | null) => {
      const next = file ? [file] : [];
      sourceFilesRef.current = next;
      setSourceFiles(next);
    },
    [],
  );

  useEffect(() => {
    onWelcomeChange?.(phase === "welcome");
  }, [phase, onWelcomeChange]);

  const enforceBatchReselectIfNeeded = useCallback(
    (batchExpectedCount: number | undefined) => {
      if (!batchExpectedCount || batchExpectedCount <= 1) return false;
      // File[] does not survive auth navigation. Never silently use sourceFiles[0].
      if (sourceFilesRef.current.length >= batchExpectedCount) return false;

      revokeSourcePreviewUrls(sourcePreviewUrlsRef.current);
      setSourceSelection([], []);
      setPremiumImage(null);
      setVideoUrl(null);
      setBatchItems([]);
      batchItemsRef.current = [];
      setBatchProjectId(null);
      batchProjectIdRef.current = null;
      setError(BATCH_RESELECT_MESSAGE);
      setPhase("upload");
      setDirectorPanelOpen(false);
      setShowRegistrationInvite(false);
      setPendingCompanionMoment(null);
      return true;
    },
    [revokeSourcePreviewUrls, setSourceSelection],
  );

  const restoreAdvertisingGenerateContinuity = useCallback(() => {
    const snapshot = readAdvertisingGenerateContinuity();
    if (!snapshot) return false;

    setCreationMode(snapshot.creationMode);
    creationModeRef.current = snapshot.creationMode;
    customerIntentRef.current = snapshot.customerIntent;
    setInput(snapshot.input || snapshot.customerIntent);
    imagePromptRef.current = snapshot.imagePrompt;
    if (snapshot.workflowId) {
      const productId = snapshot.workflowId as keyof typeof PRODUCT_CATALOG;
      const product =
        PRODUCT_CATALOG[productId] ?? PRODUCT_CATALOG["premium-image"];
      setMatchedProduct(product);
      matchedProductRef.current = product;
      projectMetadataRef.current = {
        ...projectMetadataRef.current,
        workflow_id: snapshot.workflowId,
        industry: snapshot.industry,
      };
    }
    if (snapshot.directorMessages?.length) {
      setDirectorMessages(
        snapshot.directorMessages.map((message, index) => ({
          id: `continuity-${index}`,
          role: message.role,
          content: message.content,
        })),
      );
    }
    if (snapshot.directorSessionKey) {
      setDirectorSessionKey(snapshot.directorSessionKey);
    }
    setShowRegistrationInvite(false);
    setPendingCompanionMoment(null);
    setDirectorPanelOpen(false);

    if (enforceBatchReselectIfNeeded(snapshot.batchExpectedCount)) {
      return true;
    }

    setPhase("intent");
    return true;
  }, [enforceBatchReselectIfNeeded]);

  const ensureWelcomeAdvertisingImage = useCallback(async () => {
    if (welcomeGrantAttemptedRef.current) return;
    welcomeGrantAttemptedRef.current = true;

    try {
      const response = await fetch(
        "/api/entitlements/welcome-advertising-image",
        { method: "POST" },
      );
      const payload = (await response.json().catch(() => null)) as {
        advertisingAssetsRemaining?: number;
        message?: string | null;
        granted?: boolean;
        reason?: string;
      } | null;

      if (!response.ok) {
        welcomeGrantAttemptedRef.current = false;
        return;
      }

      if (typeof payload?.advertisingAssetsRemaining === "number") {
        setAdvertisingCreditsRemaining(payload.advertisingAssetsRemaining);
      }

      if (payload?.message) {
        setAdvertisingCreditMessage(payload.message);
      } else if (
        payload?.granted ||
        (payload?.advertisingAssetsRemaining ?? 0) > 0
      ) {
        setAdvertisingCreditMessage(ADVERTISING_IMAGE_WELCOME_AVAILABLE_MESSAGE);
      }
    } catch {
      welcomeGrantAttemptedRef.current = false;
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      const authenticated = Boolean(user);
      setIsAuthenticated(authenticated);
      if (authenticated) {
        void ensureWelcomeAdvertisingImage();
        restoreAdvertisingGenerateContinuity();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // INITIAL_SESSION can emit session=null before cookies hydrate and would
      // overwrite a valid getUser() result — only apply a positive INITIAL_SESSION
      // or real auth transitions (SIGNED_IN / SIGNED_OUT / TOKEN_REFRESHED / etc.).
      if (event === "INITIAL_SESSION") {
        if (session?.user) {
          setIsAuthenticated(true);
          setShowRegistrationInvite(false);
          void ensureWelcomeAdvertisingImage();
          restoreAdvertisingGenerateContinuity();
        }
        return;
      }

      const authenticated = Boolean(session?.user);
      setIsAuthenticated(authenticated);
      if (authenticated) {
        setShowRegistrationInvite(false);
        void ensureWelcomeAdvertisingImage();
        restoreAdvertisingGenerateContinuity();
      } else {
        welcomeGrantAttemptedRef.current = false;
        setAdvertisingCreditsRemaining(null);
        setAdvertisingCreditMessage(null);
        setShowRegistrationInvite(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [ensureWelcomeAdvertisingImage, restoreAdvertisingGenerateContinuity]);

  // Fresh Studio starts with Director open. Resume/payment are not introductions.
  // /planes Hablar con Director (/studio?director=1) lands in the same cinematic experience.
  // Runs once on mount — not on phase changes / rerenders. Intentional close is respected.
  useEffect(() => {
    if (directorIntroHandledRef.current) return;
    directorIntroHandledRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const hasResume = Boolean(
      readResumeTokenFromLocation() || readStoredResumeToken(),
    );
    const explicitDirector = params.get("director") === "1";
    // UX4A visual approval — skip expensive generation; jump to Commercial REVIEW.
    // Keep ?ux4aReview=1 in the URL so Strict Mode remounts / refreshes stay in mock.
    const ux4aReviewMock = isUx4aReviewMockRequest();

    if (ux4aReviewMock) {
      setCreationMode("commercial");
      creationModeRef.current = "commercial";
      setVideoUrl(UX4A_REVIEW_MOCK_VIDEO_URL);
      videoUrlRef.current = UX4A_REVIEW_MOCK_VIDEO_URL;
      // Visual-only mock share slug for local REVIEW / WhatsApp QR inspection.
      // Not a persisted production share — QR encodes a local handoff URL only.
      setShareSlug(UX4A_REVIEW_MOCK_SHARE_SLUG);
      setReviewVisualMock(true);
      setRevealStage("offer");
      setDirectorReviewFocus("invite");
      setDirectorPanelOpen(false);
      setPhase("preview");
      return;
    }

    if (explicitDirector) {
      // Preserve intent across existing auth redirects (e.g. panel sign-in).
      authRedirectToRef.current = "/studio?director=1";
      params.delete("director");
      const next = params.toString();
      window.history.replaceState(
        {},
        "",
        next ? `/studio?${next}` : "/studio",
      );
      setDirectorPanelOpen(true);
      return;
    }

    if (hasResume || payment === "success" || payment === "cancelled") {
      setDirectorPanelOpen(false);
    }
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
        enhancedDataUrl?: string | null;
        teaserVideoBlob?: Blob | null;
        /** Generate-gate: allow original + conversation without enhanced image. */
        allowWithoutEnhanced?: boolean;
      },
    ) => {
      const file = sourceFilesRef.current[0] ?? null;
      const enhancedDataUrl =
        overrides?.enhancedDataUrl === undefined
          ? premiumImage
          : overrides.enhancedDataUrl;
      const allowWithoutEnhanced = overrides?.allowWithoutEnhanced === true;

      if (!file) {
        throw new Error("No hay suficiente información para guardar tu borrador.");
      }
      if (!enhancedDataUrl && !allowWithoutEnhanced) {
        throw new Error("No hay suficiente información para guardar tu borrador.");
      }

      const result = await saveStudioDraft({
        payload: buildDraftPayload(pendingAction),
        originalFile: file,
        enhancedDataUrl: enhancedDataUrl || null,
        teaserVideoBlob:
          overrides?.teaserVideoBlob ?? teaserVideoBlobStore.current,
      });

      setResumeToken(result.resumeToken);
      authRedirectToRef.current = buildAuthRedirectUrl(result.resumeToken);
      return result.resumeToken;
    },
    [buildDraftPayload, premiumImage],
  );

  const requestAuthenticationForGenerate = useCallback(async () => {
    setDraftRecoveryError(null);
    setError(null);

    const batchExpectedCount = sourceFilesRef.current.length;

    saveAdvertisingGenerateContinuity({
      creationMode: "advertising_image",
      customerIntent: customerIntentRef.current.trim(),
      imagePrompt: imagePromptRef.current,
      input: input.trim() || customerIntentRef.current.trim(),
      directorMessages: directorMessages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      directorSessionKey,
      workflowId:
        projectMetadataRef.current.workflow_id ??
        matchedProductRef.current.id,
      industry: projectMetadataRef.current.industry ?? null,
      ...(batchExpectedCount > 1 ? { batchExpectedCount } : {}),
    });

    try {
      await persistAnonymousDraft("save", {
        enhancedDataUrl: null,
        allowWithoutEnhanced: true,
      });
    } catch (saveError) {
      // Continuity snapshot still covers prompt/Director; photo draft is best-effort.
      console.error(saveError);
    }

    setPendingCompanionMoment("generate_invitation");
    setShowRegistrationInvite(true);
    setDirectorPanelOpen(true);
    setPhase("intent");
    setError(ADVERTISING_IMAGE_AUTH_REQUIRED_MESSAGE);
  }, [directorMessages, directorSessionKey, input, persistAnonymousDraft]);

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
        setCreationMode("commercial");
        creationModeRef.current = "commercial";
      } else if (urls.enhancedUrl) {
        // Image-only draft → standalone Advertising Image journey.
        setCreationMode("advertising_image");
        creationModeRef.current = "advertising_image";
      }

      if (urls.originalUrl) {
        revokeSourcePreviewUrls(sourcePreviewUrlsRef.current);
        sourcePreviewUrlsRef.current = [urls.originalUrl];
        setSourcePreviewUrls([urls.originalUrl]);
        syncPrimaryPreview(urls.originalUrl);

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
          setPrimarySourceFile(file);
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
      } else {
        setDirectorMessages([]);
      }
      setDirectorSessionKey(`restored-${draft.resume_token}`);

      const isAdvertisingDraft =
        !urls.teaserUrl &&
        (Boolean(urls.enhancedUrl) ||
          draft.workflow_id === "premium-image" ||
          Boolean(readAdvertisingGenerateContinuity()));
      if (isAdvertisingDraft && !urls.teaserUrl) {
        setCreationMode("advertising_image");
        creationModeRef.current = "advertising_image";
      }

      const awaitingGenerate =
        isAdvertisingDraft && !urls.enhancedUrl;
      const restoredPhase =
        draft.phase === "checkout" ||
        draft.phase === "processing_payment" ||
        draft.phase === "processing_premium" ||
        draft.phase === "ready"
          ? draft.phase
          : awaitingGenerate
            ? "intent"
            : isAdvertisingDraft
              ? "image_result"
              : "preview";
      setPhase(restoredPhase);
      setAutoSaveStatus(awaitingGenerate ? "idle" : "local-only");
      setDirectorPanelOpen(false);
      setShowRegistrationInvite(false);
    },
    [revokeSourcePreviewUrls, setPrimarySourceFile, syncPrimaryPreview],
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

      const isAdvertisingClaim =
        !claimResult.hadTeaser ||
        creationModeRef.current === "advertising_image";

      if (claimResult.pendingAction === "unlock") {
        setCreationMode("commercial");
        creationModeRef.current = "commercial";
        setPhase("checkout");
      } else if (isAdvertisingClaim) {
        setCreationMode("advertising_image");
        creationModeRef.current = "advertising_image";
        setPhase("image_ready");
        onOpenLibrary?.({
          projectId: claimResult.projectId,
          assetId: claimResult.assetId,
        });
      } else {
        setCreationMode("commercial");
        creationModeRef.current = "commercial";
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
          // Generate-gate resume: restore prepared Advertising Image intent
          // without claiming/persisting (no image yet — wait for explicit Generar).
          const continuity = readAdvertisingGenerateContinuity();
          const draftResponse = await fetchStudioDraft(token).catch(() => null);
          if (cancelled) return;

          if (continuity || (draftResponse && !draftResponse.urls.enhancedUrl)) {
            if (draftResponse) {
              await restoreStudioFromDraft(draftResponse);
            }
            restoreAdvertisingGenerateContinuity();
            void ensureWelcomeAdvertisingImage();
            resumeHandledRef.current = true;
            return;
          }

          const claimResult = await claimStudioDraft(token);
          if (cancelled) return;
          await applyClaimResult(claimResult);
          void ensureWelcomeAdvertisingImage();
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
  }, [
    applyClaimResult,
    ensureWelcomeAdvertisingImage,
    restoreAdvertisingGenerateContinuity,
    restoreStudioFromDraft,
  ]);

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

      setPremiumProgressComplete(false);
      setPremiumProgressRunId((current) => current + 1);
      setPhase("processing_payment");
      setCheckoutMessage("Confirmando tu pago...");

      completeCheckoutAfterRedirect(sessionId, (message) => {
        setCheckoutMessage(message);
        if (message.includes("Produciendo")) {
          setPhase("processing_premium");
        }
      })
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
            setPremiumProgressComplete(true);
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
          setPremiumProgressComplete(false);
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
      for (const url of sourcePreviewUrlsRef.current) {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      }
      // Primary preview may be a draft HTTP URL or the same blob as [0].
      if (
        previewUrlRef.current?.startsWith("blob:") &&
        !sourcePreviewUrlsRef.current.includes(previewUrlRef.current)
      ) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      if (videoUrlRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(videoUrlRef.current);
      }
    };
  }, []);

  const autoSaveMessage = getAutoSaveMessage(autoSaveStatus);

  const isAdvertisingCreation = creationMode === "advertising_image";
  const batchCompletedCount = batchItems.filter(
    (item) => item.status === "completed",
  ).length;
  const isBatchCreating =
    phase === "creating" &&
    isAdvertisingCreation &&
    (batchItems.length > 1 || sourceFiles.length > 1);
  const creationBand = isBatchCreating
    ? getBatchAdvertisingBand(
        batchCompletedCount,
        batchItems.length,
        { complete: creationProgressComplete },
      )
    : isAdvertisingCreation
      ? getAdvertisingImageBand(creationStep, creationPreparing)
      : getCommercialCreationBand(creationStep, {
          preparing: creationPreparing,
          persisting: commercialPersisting,
        });
  const creationProgress = useStudioProgress({
    running: phase === "creating" && !creationProgressComplete,
    floor: creationBand.floor,
    ceiling: creationBand.ceiling,
    complete: creationProgressComplete,
    error: false,
    runId: creationProgressRunId,
  });

  const finalizeBand = getFinalizeImageBand();
  const finalizeProgress = useStudioProgress({
    running: autoSaveStatus === "saving" && phase === "image_result",
    floor: finalizeBand.floor,
    ceiling: finalizeBand.ceiling,
    complete: finalizeProgressComplete,
    error: Boolean(error) && autoSaveStatus !== "saving",
    runId: finalizeProgressRunId,
  });

  const premiumPhaseActive =
    phase === "processing_payment" || phase === "processing_premium";
  const premiumBand = getPremiumProcessingBand(
    phase === "processing_premium" ? "processing_premium" : "processing_payment",
    checkoutMessage,
  );
  const premiumProgress = useStudioProgress({
    running: premiumPhaseActive && !premiumProgressComplete,
    floor: premiumBand.floor,
    ceiling: premiumBand.ceiling,
    complete: premiumProgressComplete,
    error: phase === "error",
    runId: premiumProgressRunId,
  });

  const persistToLibrary = useCallback(
    async (input: {
      originalFile: File;
      enhancedDataUrl: string;
      teaserVideoBlob?: Blob;
      imagePrompt: string;
      videoPrompt: string;
      billAdvertisingAsset?: boolean;
      generationMetadata?: NonNullable<typeof generationMetadataRef.current>;
    }) => {
      const product = matchedProductRef.current;
      const customerIntent = customerIntentRef.current.trim();
      const billAdvertisingAsset = input.billAdvertisingAsset ?? false;

      setAutoSaveStatus("saving");

      const result = await persistCreationToLibrary({
        originalFile: input.originalFile,
        enhancedDataUrl: input.enhancedDataUrl,
        teaserVideoBlob: input.teaserVideoBlob,
        imagePrompt: input.imagePrompt,
        videoPrompt: input.videoPrompt,
        customerIntent,
        visualGenerationIntent: videoVisualIntentRef.current ?? undefined,
        promotionalOverlays: promotionalOverlaysRef.current,
        productionProfile: productionProfileRef.current,
        overlayStyle: overlayStyleRef.current,
        requiredNarrativeBeats: requiredNarrativeBeatsRef.current,
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
        // Commercial: false. Standalone Advertising Image finalize: true.
        billAdvertisingAsset,
        generationMetadata:
          input.generationMetadata ?? generationMetadataRef.current ?? undefined,
      });

      if (result.status === "saved" && result.projectId) {
        savedProjectIdRef.current = result.projectId;
      }
      if (result.status === "saved" && result.assetId) {
        savedAssetIdRef.current = result.assetId;
        setCheckoutAssetId(result.assetId);
      }
      if (result.status === "saved" && result.shareSlug) {
        setShareSlug(result.shareSlug);
      }
      if (result.status === "saved") {
        persistenceRecoveryRef.current = null;
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
      } else if (result.status === "persistence-error") {
        persistenceRecoveryRef.current = result.recovery ?? null;
        if (result.projectId) {
          savedProjectIdRef.current = result.projectId;
        }
        if (result.assetId) {
          savedAssetIdRef.current = result.assetId;
          setCheckoutAssetId(result.assetId);
        }
        setError(
          result.message ??
            "Tu comercial está listo, pero no pudimos terminar de guardarlo.",
        );
      }
      setAutoSaveStatus(result.status);
      return result;
    },
    [onLibraryUpdated, persistAnonymousDraft],
  );

  const retryCommercialPersistence = useCallback(async () => {
    const recovery = persistenceRecoveryRef.current;
    if (!recovery) return;

    setAutoSaveStatus("saving");
    setError(null);
    setCommercialPersisting(true);
    const result = await retryCreationPersistence(recovery);
    setAutoSaveStatus(result.status);

    if (result.status !== "saved" || !result.assetId || !result.projectId) {
      persistenceRecoveryRef.current = result.recovery ?? recovery;
      setCommercialPersisting(false);
      setError(
        result.message ??
          "Tu comercial está listo, pero no pudimos terminar de guardarlo.",
      );
      return;
    }

    savedProjectIdRef.current = result.projectId;
    savedAssetIdRef.current = result.assetId;
    setCheckoutAssetId(result.assetId);
    setShareSlug(result.shareSlug);
    persistenceRecoveryRef.current = null;
    setCommercialPersisting(false);
    markStudioHasProjects();
    onLibraryUpdated?.({ projectId: result.projectId, assetId: result.assetId });
    setCreationProgressComplete(true);
    setPhase("preview");
  }, [onLibraryUpdated]);

  useEffect(() => {
    if (!isAuthenticated || autoSaveStatus !== "local-only") return;

    const file = sourceFilesRef.current[0] ?? null;
    if (!file || !premiumImage || savedAssetIdRef.current) return;

    const isAdvertising =
      creationModeRef.current === "advertising_image";

    // Advertising: successful generation persist consumes 1 credit.
    // Commercial: teaser persist never bills advertising_asset.
    void persistToLibrary({
      originalFile: file,
      enhancedDataUrl: premiumImage,
      teaserVideoBlob: isAdvertising
        ? undefined
        : (teaserVideoBlobStore.current ?? undefined),
      imagePrompt: imagePromptRef.current,
      videoPrompt: isAdvertising ? "" : videoPromptRef.current,
      billAdvertisingAsset: isAdvertising,
    });
  }, [autoSaveStatus, isAuthenticated, persistToLibrary, premiumImage]);

  const applyBatchProgress = useCallback(
    (progress: BatchAdvertisingProgress) => {
      batchItemsRef.current = progress.items;
      setBatchItems(progress.items);
      batchProjectIdRef.current = progress.projectId;
      setBatchProjectId(progress.projectId);
      setBatchProgressMessage(progress.message);
      if (progress.projectId) {
        savedProjectIdRef.current = progress.projectId;
      }
      setCreationPreparing(false);
      setCreationStep("image");
      setCreationMessage(progress.message);
    },
    [],
  );

  const runBatchCreation = useCallback(
    async (options?: { retryFailedOnly?: boolean }) => {
      if (generatingImageRef.current) return;

      const mode = creationModeRef.current;
      if (mode !== "advertising_image") {
        setError(COMMERCIAL_BATCH_BLOCKED_MESSAGE);
        setPhase("intent");
        return;
      }

      if (!isAuthenticated) {
        await requestAuthenticationForGenerate();
        return;
      }

      const files = sourceFilesRef.current;
      const existingItems = batchItemsRef.current;
      const retryFailedOnly = options?.retryFailedOnly === true;

      if (retryFailedOnly) {
        if (existingItems.length === 0) return;
        const failedIds = existingItems
          .filter((item) => item.status === "failed")
          .map((item) => item.id);
        if (failedIds.length === 0) return;

        generatingImageRef.current = true;
        setPhase("creating");
        setDirectorPanelOpen(false);
        setCreationPreparing(true);
        setCreationProgressComplete(false);
        setCreationProgressRunId((current) => current + 1);
        setCreationMessage("Verificando créditos…");
        setError(null);
        setAutoSaveStatus("idle");

        try {
          const product = matchedProductRef.current;
          const result = await runBatchAdvertisingImages({
            files,
            customerIntent: customerIntentRef.current.trim(),
            productMode: product.mode,
            imageIntent: imageIntentRef.current ?? undefined,
            projectMetadata: {
              ...projectMetadataRef.current,
              workflow_id: product.id,
              industry: product.industry ?? projectMetadataRef.current.industry,
              intended_destination:
                destinationRef.current?.platform ?? product.destination,
              destination: destinationRef.current,
            },
            existingProjectId: batchProjectIdRef.current,
            existingItems,
            onlyItemIds: failedIds,
            onProgress: applyBatchProgress,
          });

          applyBatchProgress(result);

          if (result.phase === "blocked") {
            setAdvertisingCreditsRemaining(result.remainingCredits ?? 0);
            setAutoSaveStatus("requires-package");
            setError(result.message);
            setPhase("batch_result");
            return;
          }

          const newlyCompleted = result.items.filter(
            (item) =>
              failedIds.includes(item.id) && item.status === "completed",
          ).length;
          if (newlyCompleted > 0) {
            setAdvertisingCreditsRemaining((current) =>
              typeof current === "number"
                ? Math.max(0, current - newlyCompleted)
                : current,
            );
            setAdvertisingCreditMessage(null);
          }

          if (result.projectId) {
            onLibraryUpdated?.({ projectId: result.projectId });
          }

          setCreationProgressComplete(true);
          await sleep(500);
          setPhase("batch_result");
        } catch (batchError) {
          console.error(batchError);
          setError(
            batchError instanceof BatchInsufficientCreditsError
              ? batchError.message
              : mapCreationError(
                  batchError instanceof Error
                    ? batchError.message
                    : undefined,
                ) || "Algo salió mal con el lote. Intenta de nuevo.",
          );
          if (batchError instanceof BatchInsufficientCreditsError) {
            setAutoSaveStatus("requires-package");
            setAdvertisingCreditsRemaining(batchError.remaining);
          }
          setPhase("batch_result");
        } finally {
          generatingImageRef.current = false;
        }
        return;
      }

      if (files.length < 2) {
        setError("Selecciona al menos 2 fotos para el lote.");
        setPhase("upload");
        return;
      }

      generatingImageRef.current = true;
      setPhase("creating");
      setDirectorPanelOpen(false);
      setCreationPreparing(true);
      setCreationProgressComplete(false);
      setCreationProgressRunId((current) => current + 1);
      setCreationMessage("Verificando créditos…");
      setBatchProgressMessage("Verificando créditos…");
      setError(null);
      setPremiumImage(null);
      setVideoUrl(null);
      setAutoSaveStatus("idle");
      setShareSlug(null);
      savedProjectIdRef.current = null;
      savedAssetIdRef.current = null;
      setCheckoutAssetId(null);
      setBatchItems([]);
      batchItemsRef.current = [];
      setBatchProjectId(null);
      batchProjectIdRef.current = null;

      try {
        const product = matchedProductRef.current;
        const result = await runBatchAdvertisingImages({
          files,
          customerIntent: customerIntentRef.current.trim(),
          productMode: product.mode,
          imageIntent: imageIntentRef.current ?? undefined,
          projectMetadata: {
            ...projectMetadataRef.current,
            workflow_id: product.id,
            industry: product.industry ?? projectMetadataRef.current.industry,
            intended_destination:
              destinationRef.current?.platform ?? product.destination,
            destination: destinationRef.current,
          },
          onProgress: applyBatchProgress,
        });

        applyBatchProgress(result);

        if (result.phase === "blocked") {
          setAdvertisingCreditsRemaining(result.remainingCredits ?? 0);
          setAutoSaveStatus("requires-package");
          setError(result.message);
          setPhase("intent");
          return;
        }

        if (result.completedCount > 0) {
          setAdvertisingCreditsRemaining((current) =>
            typeof current === "number"
              ? Math.max(0, current - result.completedCount)
              : current,
          );
          setAdvertisingCreditMessage(null);
          clearAdvertisingGenerateContinuity();
        }

        if (result.projectId) {
          onLibraryUpdated?.({ projectId: result.projectId });
        }

        setCreationProgressComplete(true);
        await sleep(650);
        setPhase("batch_result");
      } catch (batchError) {
        console.error(batchError);
        if (batchError instanceof AdvertisingImageAuthRequiredError) {
          await requestAuthenticationForGenerate();
          return;
        }
        setError(
          batchError instanceof BatchInsufficientCreditsError
            ? batchError.message
            : mapCreationError(
                batchError instanceof Error ? batchError.message : undefined,
              ) || "Algo salió mal con el lote. Intenta de nuevo.",
        );
        if (batchError instanceof BatchInsufficientCreditsError) {
          setAutoSaveStatus("requires-package");
          setAdvertisingCreditsRemaining(batchError.remaining);
        }
        setPhase("intent");
      } finally {
        generatingImageRef.current = false;
      }
    },
    [
      applyBatchProgress,
      isAuthenticated,
      onLibraryUpdated,
      requestAuthenticationForGenerate,
    ],
  );

  const runCreation = useCallback(async () => {
    if (generatingImageRef.current) return;

    const mode = creationModeRef.current;
    if (!mode) {
      setPhase("creation_mode");
      return;
    }

    // Commercial Multi-Photo remains blocked.
    if (sourceFilesRef.current.length > 1 && mode === "commercial") {
      setError(COMMERCIAL_BATCH_BLOCKED_MESSAGE);
      setPhase("intent");
      return;
    }

    // Batch Advertising Image — orchestrator path (never sourceFiles[0] alone).
    if (
      sourceFilesRef.current.length > 1 &&
      mode === "advertising_image"
    ) {
      await runBatchCreation();
      return;
    }

    const file = sourceFilesRef.current[0] ?? null;
    if (!file) {
      setError("Sube una foto para continuar.");
      setPhase("upload");
      return;
    }

    const isAdvertising = mode === "advertising_image";
    if (!isAdvertising && !destinationRef.current) {
      setPhase("destination");
      return;
    }

    const analyticsRunIdForCreate = crypto.randomUUID();
    setAnalyticsRunId(analyticsRunIdForCreate);

    // Advertising Image: auth gate BEFORE provider. Director/prompt stay free.
    if (isAdvertising && !isAuthenticated) {
      await requestAuthenticationForGenerate();
      return;
    }

    generatingImageRef.current = true;

    if (!isAdvertising) {
      primeCinematicFullscreen();
    }

    setPhase("creating");
    setDirectorPanelOpen(false);
    setCreationStep("image");
    setCreationPreparing(true);
    setCommercialPersisting(false);
    setCreationProgressComplete(false);
    setCreationProgressRunId((current) => current + 1);
    setCreationMessage(
      isAdvertising
        ? "Preparando tu imagen publicitaria..."
        : "Preparando tu escena comercial...",
    );
    setError(null);
    setPremiumImage(null);
    setVideoUrl(null);
    setAutoSaveStatus("idle");
    setShareSlug(null);
    // New generation attempt: clear ids so a successful generate bills once
    // for the new finished asset (idempotent per asset_id).
    savedProjectIdRef.current = null;
    savedAssetIdRef.current = null;
    persistenceRecoveryRef.current = null;
    setCheckoutAssetId(null);

    if (videoUrlRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(videoUrlRef.current);
    }
    videoUrlRef.current = null;
    teaserVideoBlobStore.current = null;

    try {
      const product = matchedProductRef.current;
      const customerIntent = customerIntentRef.current.trim();

      // Brief client prep band so progress starts above 0 with a real stage label
      // before the long provider wait begins.
      await sleep(700);

      if (isAdvertising) {
        const result = await createAdvertisingImage({
          file,
          customerIntent,
          productMode: product.mode,
          imageIntent: imageIntentRef.current ?? undefined,
          creationRunId: analyticsRunIdForCreate,
          onStep: (step, message) => {
            setCreationPreparing(false);
            setCreationStep(step);
            setCreationMessage(message);
          },
        });

        imageIntentRef.current = result.imageIntent;
        imagePromptRef.current = result.imagePrompt;
        videoPromptRef.current = "";
        setPremiumImage(result.premiumImage);
        setCreationPreparing(false);
        setCreationProgressComplete(true);
        await sleep(650);

        // Billable event: successful provider-backed generation persist.
        // Finalizar Imagen must not charge again (idempotent per asset_id).
        const persistResult = await persistToLibrary({
          originalFile: file,
          enhancedDataUrl: result.premiumImage,
          imagePrompt: result.imagePrompt,
          videoPrompt: "",
          billAdvertisingAsset: true,
        });

        if (persistResult.status === "requires-package") {
          setAdvertisingCreditsRemaining(0);
          setAutoSaveStatus("requires-package");
          setError(
            persistResult.message ?? ADVERTISING_IMAGE_PACKAGE_REQUIRED_MESSAGE,
          );
          setPhase("intent");
          return;
        }

        if (persistResult.status === "saved") {
          setAdvertisingCreditsRemaining((current) =>
            typeof current === "number" ? Math.max(0, current - 1) : 0,
          );
          setAdvertisingCreditMessage(null);
          clearAdvertisingGenerateContinuity();
        }

        setPhase("image_result");
        return;
      }

      const result = await createCommercialAssets({
        file,
        customerIntent,
        visualGenerationIntent: videoVisualIntentRef.current ?? undefined,
        promotionalOverlays: promotionalOverlaysRef.current,
        productionProfile: productionProfileRef.current,
        overlayStyle: overlayStyleRef.current,
        requiredNarrativeBeats: requiredNarrativeBeatsRef.current,
        productMode: product.mode,
        destination: destinationRef.current,
        creationRunId: analyticsRunIdForCreate,
        onStep: (step, message) => {
          setCreationPreparing(false);
          setCreationStep(step);
          setCreationMessage(message);
        },
      });

      imagePromptRef.current = result.imagePrompt;
      videoPromptRef.current = result.videoPrompt;
      generationMetadataRef.current = result.generationMetadata;
      setPremiumImage(result.premiumImage);
      teaserVideoBlobStore.current = result.videoBlob;
      videoUrlRef.current = result.videoUrl;
      setVideoUrl(result.videoUrl);

      setCreationPreparing(false);
      setCommercialPersisting(true);
      const persistResult = await persistToLibrary({
        originalFile: file,
        enhancedDataUrl: result.premiumImage,
        teaserVideoBlob: result.videoBlob,
        imagePrompt: result.imagePrompt,
        videoPrompt: result.videoPrompt,
        generationMetadata: result.generationMetadata,
        billAdvertisingAsset: false,
      });

      if (persistResult.status !== "saved" || !persistResult.assetId) {
        setCommercialPersisting(false);
        setCreationProgressComplete(false);
        return;
      }

      setCreationProgressComplete(true);
      await sleep(650);
      // Presence-only: do not auto-speak after generation. User opens Director if needed.
      setPhase("preview");
    } catch (createError) {
      console.error(createError);
      setCreationPreparing(false);
      setCommercialPersisting(false);
      setCreationProgressComplete(false);

      if (createError instanceof AdvertisingImageAuthRequiredError) {
        await requestAuthenticationForGenerate();
        return;
      }

      if (createError instanceof AdvertisingImagePackageRequiredError) {
        setAdvertisingCreditsRemaining(0);
        setAutoSaveStatus("requires-package");
        setError(createError.message);
        setPhase("intent");
        return;
      }

      setError(
        mapCreationError(
          createError instanceof Error ? createError.message : undefined,
        ) || "Algo salió mal. Intenta de nuevo.",
      );
      // Advertising: back to intent. Commercial: preserve prior upload recovery.
      // Provider failure does not consume an Advertising Image credit.
      setPhase(isAdvertising ? "intent" : "upload");
    } finally {
      generatingImageRef.current = false;
    }
  }, [
    isAuthenticated,
    persistToLibrary,
    requestAuthenticationForGenerate,
    runBatchCreation,
  ]);

  const handleIntentSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      const trimmed = input.trim();
      const hasPhoto = sourceFilesRef.current.length > 0;

      if (!trimmed) return;

      if (!hasPhoto) {
        setPhase("upload");
        return;
      }

      if (
        creationModeRef.current === "commercial" &&
        !destinationRef.current
      ) {
        setPhase("destination");
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
      if (trimmed !== customerIntentRef.current) {
        videoVisualIntentRef.current = null;
        productionProfileRef.current = null;
        promotionalOverlaysRef.current = null;
        overlayStyleRef.current = null;
        requiredNarrativeBeatsRef.current = null;
      }
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
      setDirectorProposalApplied(false);

      // Advertising Image: route output type before generation. Ask once if ambiguous.
      if (creationModeRef.current === "advertising_image") {
        const intentResolution = resolveImageIntent(trimmed, {
          productMode: resolution.product.mode,
        });
        if (intentResolution.status === "needs_clarification") {
          imageIntentRef.current = null;
          setImageIntentQuestion(intentResolution.question);
          setPhase("image_intent");
          return;
        }
        imageIntentRef.current = intentResolution.intent;
      } else {
        imageIntentRef.current = null;
      }

      await runCreation();
    },
    [input, runCreation],
  );

  const selectImageIntent = useCallback(
    async (intent: ImageIntent) => {
      imageIntentRef.current = intent;
      setError(null);
      await runCreation();
    },
    [runCreation],
  );

  const routeAfterCreationMode = useCallback((mode: CreationMode) => {
    if (mode === "commercial") {
      setPhase("destination");
      return;
    }
    setPhase("intent");
  }, []);

  const selectCreationMode = useCallback(
    (mode: CreationMode) => {
      setCreationMode(mode);
      creationModeRef.current = mode;
      setError(null);
      // Manual path enters the normal workflow — Director returns to compact presence.
      setDirectorPanelOpen(false);
      // Manual choice may happen before or after photo; only route when ready.
      if (sourceFilesRef.current.length === 0) {
        setPhase("upload");
        return;
      }
      routeAfterCreationMode(mode);
    },
    [routeAfterCreationMode],
  );

  const continueAfterPhoto = useCallback(() => {
    const knownMode = creationModeRef.current;
    if (knownMode) {
      routeAfterCreationMode(knownMode);
      return;
    }
    setPhase("creation_mode");
  }, [routeAfterCreationMode]);

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

  const appendSourceFiles = useCallback(
    (incoming: File[], options?: { autoContinue?: boolean }) => {
      if (incoming.length === 0) return;

      let baseFiles = sourceFilesRef.current;
      let baseUrls = sourcePreviewUrlsRef.current;

      // Repair URL parity after draft restore (HTTP preview, no blob list).
      if (baseFiles.length > 0 && baseUrls.length !== baseFiles.length) {
        baseUrls = baseFiles.map((file, index) => {
          if (baseUrls[index]) return baseUrls[index];
          if (index === 0 && previewUrlRef.current) return previewUrlRef.current;
          return URL.createObjectURL(file);
        });
      }

      const { accepted, rejected } = validateSourceImageFiles(
        incoming,
        baseFiles,
      );
      const statusMessage = formatSourceFileSelectionMessage(
        accepted.length,
        rejected,
      );

      if (accepted.length === 0) {
        setError(statusMessage);
        return;
      }

      const newUrls = accepted.map((file) => URL.createObjectURL(file));
      const nextFiles = [...baseFiles, ...accepted];
      const nextUrls = [...baseUrls, ...newUrls];

      setSourceSelection(nextFiles, nextUrls);
      setPremiumImage(null);
      setVideoUrl(null);
      setError(statusMessage);

      // Single-image path: keep existing auto-continue. Batch stays on upload.
      if (
        options?.autoContinue &&
        phase === "upload" &&
        nextFiles.length === 1 &&
        rejected.length === 0
      ) {
        continueAfterPhoto();
      }
    },
    [continueAfterPhoto, phase, setSourceSelection],
  );

  const removeSourceFileAt = useCallback(
    (index: number) => {
      const files = sourceFilesRef.current;
      const urls = sourcePreviewUrlsRef.current;
      if (index < 0 || index >= files.length) return;

      revokeBlobUrl(urls[index]);
      setSourceSelection(
        files.filter((_, i) => i !== index),
        urls.filter((_, i) => i !== index),
      );
      setError(null);
    },
    [revokeBlobUrl, setSourceSelection],
  );

  const clearSourceFiles = useCallback(() => {
    revokeSourcePreviewUrls(sourcePreviewUrlsRef.current);
    setSourceSelection([], []);
    setPremiumImage(null);
    setVideoUrl(null);
    setError(null);
  }, [revokeSourcePreviewUrls, setSourceSelection]);

  /** @deprecated path name kept for InstantCapture single-file camera capture. */
  const applySelectedFile = useCallback(
    (file: File, options?: { autoContinue?: boolean }) => {
      appendSourceFiles([file], options);
    },
    [appendSourceFiles],
  );

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    appendSourceFiles(files, {
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
    continueAfterPhoto();
  };

  const handleFinalizeAdvertisingImage = useCallback(async () => {
    const file = sourceFilesRef.current[0] ?? null;
    if (!file || !premiumImage) {
      setError("Genera tu imagen publicitaria para continuar.");
      return;
    }

    if (finalizingImageRef.current) return;
    finalizingImageRef.current = true;
    setError(null);
    setFinalizeProgressComplete(false);
    setFinalizeProgressRunId((current) => current + 1);

    try {
      if (!isAuthenticated) {
        await requestAuthentication("save");
        return;
      }

      // Generation already consumed the Advertising Image credit.
      // Finalizar only persists / completes Biblioteca — no second charge.
      const result = await persistToLibrary({
        originalFile: file,
        enhancedDataUrl: premiumImage,
        // Standalone image: no teaser / no video.
        imagePrompt: imagePromptRef.current,
        videoPrompt: "",
        billAdvertisingAsset: false,
      });

      if (result.status === "local-only") {
        setFinalizeProgressComplete(false);
        setPhase("image_result");
        return;
      }

      if (result.status === "saved") {
        setFinalizeProgressComplete(true);
        await sleep(500);
        setPhase("image_ready");
        onOpenLibrary?.({
          projectId: result.projectId ?? undefined,
          assetId: result.assetId ?? undefined,
        });
      }
    } catch (finalizeError) {
      console.error(finalizeError);
      setFinalizeProgressComplete(false);
      setError(
        mapCreationError(
          finalizeError instanceof Error ? finalizeError.message : undefined,
        ) || "No pudimos finalizar tu imagen. Intenta de nuevo.",
      );
    } finally {
      finalizingImageRef.current = false;
    }
  }, [
    isAuthenticated,
    onOpenLibrary,
    persistToLibrary,
    premiumImage,
    requestAuthentication,
  ]);

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
    setPremiumProgressComplete(false);
    setPremiumProgressRunId((current) => current + 1);
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
      setPremiumProgressComplete(false);
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
      setPremiumProgressComplete(true);
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

  useEffect(() => {
    if (
      !premiumUnlockRequest ||
      premiumUnlockRequestHandledRef.current === premiumUnlockRequest.id
    ) {
      return;
    }

    premiumUnlockRequestHandledRef.current = premiumUnlockRequest.id;
    savedAssetIdRef.current = premiumUnlockRequest.assetId;
    setCheckoutAssetId(premiumUnlockRequest.assetId);
    setCreationMode("commercial");
    creationModeRef.current = "commercial";
    setDirectorPanelOpen(false);

    void startCheckoutPurchase(premiumUnlockRequest.paymentMethod, () => undefined)
      .then(handleCheckoutSuccess)
      .catch(() => undefined);
  }, [premiumUnlockRequest]);

  const resetFlow = () => {
    setPhase("welcome");
    setInput("");
    setMatchedProduct(null);
    matchedProductRef.current = PRODUCT_CATALOG["premium-image"];
    customerIntentRef.current = "";
    videoVisualIntentRef.current = null;
    productionProfileRef.current = null;
    promotionalOverlaysRef.current = null;
    overlayStyleRef.current = null;
    requiredNarrativeBeatsRef.current = null;
    imageIntentRef.current = null;
    setPrimarySourceFile(null);
    setPremiumImage(null);
    setVideoUrl(null);
    setCreationPreparing(false);
    setCommercialPersisting(false);
    setCreationProgressComplete(false);
    setFinalizeProgressComplete(false);
    setPremiumProgressComplete(false);
    setError(null);
    setPremiumReady(false);
    setDestination(null);
    destinationRef.current = null;
    setCreationMode(null);
    creationModeRef.current = null;
    // New creation session — Director introduces Studio again.
    setDirectorPanelOpen(true);
    setPendingCompanionMoment(null);
    setDirectorSessionKey(`${Date.now()}`);
    setDirectorProposalApplied(false);
    setCheckoutMessage(null);
    setResumeToken(null);
    setShowRegistrationInvite(false);
    setDirectorMessages([]);
    setDraftRecoveryError(null);
    teaserVideoBlobStore.current = null;
    authRedirectToRef.current = "/studio";
    resumeHandledRef.current = false;
    finalizingImageRef.current = false;
    directorIntroHandledRef.current = true;
    savedProjectIdRef.current = null;
    savedAssetIdRef.current = null;
    setCheckoutAssetId(null);
    setShareSlug(null);
    setRevealStage(null);
    setDirectorReviewFocus("invite");
    setReviewVisualMock(false);
    setBatchItems([]);
    batchItemsRef.current = [];
    setBatchProjectId(null);
    batchProjectIdRef.current = null;
    setBatchProgressMessage("");
    imagePromptRef.current = "";
    videoPromptRef.current = "";
    projectMetadataRef.current = {};
    setAutoSaveStatus("idle");

    if (videoUrlRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(videoUrlRef.current);
    }
    videoUrlRef.current = null;

    const previousPreviewUrls = sourcePreviewUrlsRef.current;
    revokeSourcePreviewUrls(previousPreviewUrls);
    sourcePreviewUrlsRef.current = [];
    setSourcePreviewUrls([]);
    if (
      previewUrlRef.current?.startsWith("blob:") &&
      !previousPreviewUrls.includes(previewUrlRef.current)
    ) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    previewUrlRef.current = null;
    setPreviewUrl(null);
  };

  const handleOpenLibrary = useCallback(() => {
    if (!isAuthenticated || autoSaveStatus === "local-only") {
      void requestAuthentication("save");
      return;
    }

    onOpenLibrary?.({
      projectId:
        batchProjectIdRef.current ??
        savedProjectIdRef.current ??
        undefined,
      assetId: savedAssetIdRef.current ?? undefined,
    });
  }, [autoSaveStatus, isAuthenticated, onOpenLibrary, requestAuthentication]);

  const batchStatusLabel = useCallback((status: BatchAdvertisingItem["status"]) => {
    switch (status) {
      case "queued":
        return "En cola";
      case "processing":
        return "Procesando";
      case "completed":
        return "Lista";
      case "failed":
        return "Falló";
      default:
        return "";
    }
  }, []);

  const handleUnlock = useCallback(() => {
    if (!isAuthenticated) {
      void requestAuthentication("unlock");
      return;
    }

    if (!savedAssetIdRef.current) {
      setError("Termina de guardar tu comercial antes de desbloquearlo.");
      return;
    }

    setPhase("checkout");
  }, [isAuthenticated, requestAuthentication]);

  const contextualUploadMessage =
    creationMode === "advertising_image"
      ? "Sube la foto que quieres transformar."
      : matchedProduct
        ? getUploadMessage(matchedProduct)
        : "Sube una foto de lo que vendes.";

  const creativeDirectorProjectContext: ProjectContext = {
    currentImage: previewUrl ? { url: previewUrl } : undefined,
    ...(sourceFiles.length > 0
      ? { sourcePhotoCount: sourceFiles.length }
      : {}),
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
    if (phase === "preview" && revealStage === "offer") {
      setDirectorReviewFocus("conversation");
      setPendingCompanionMoment("preview");
    }
    if (phase === "image_result") {
      setDirectorReviewFocus("conversation");
      setPendingCompanionMoment("preview");
    }
    setDirectorPanelOpen(true);
  }, [phase, revealStage]);

  const handleReviewAdjust = useCallback(() => {
    setDirectorReviewFocus("conversation");
    setPendingCompanionMoment("preview");
    setDirectorPanelOpen(true);
  }, []);

  const handleReviewContinue = useCallback(() => {
    setDirectorReviewFocus("continue");
    setDirectorPanelOpen(false);
  }, []);

  const handleCloseDirectorPanel = useCallback(() => {
    setDirectorPanelOpen(false);
    if (phase === "preview" && revealStage === "offer") {
      setDirectorReviewFocus((current) =>
        current === "conversation" ? "invite" : current,
      );
    }
    if (phase === "image_result") {
      setDirectorReviewFocus((current) =>
        current === "conversation" ? "invite" : current,
      );
    }
  }, [phase, revealStage]);

  /**
   * After Director proposal when creationMode was unset: customer picks mode.
   * Preserves full proposal + conversation; does not auto-generate.
   * Commercial reuses the existing destination selector before Generar.
   */
  const selectCreationModeAfterProposal = useCallback((mode: CreationMode) => {
    setCreationMode(mode);
    creationModeRef.current = mode;
    setError(null);
    if (mode === "commercial") {
      setDirectorPanelOpen(false);
    }
    routeAfterCreationMode(mode);
  }, [routeAfterCreationMode]);

  const handleUseDirectorProposal = useCallback((proposal: CommercialProposal) => {
    const trimmed = proposal.narrative.trim();
    if (!trimmed) return;

    // Full string transfer — no truncation. Customer still presses Generar.
    setInput(trimmed);
    customerIntentRef.current = trimmed;
    videoVisualIntentRef.current = proposal.visualGenerationIntent.trim() || null;
    productionProfileRef.current = proposal.productionProfile;
    promotionalOverlaysRef.current = proposal.promotionalOverlays;
    overlayStyleRef.current = proposal.overlayStyle;
    requiredNarrativeBeatsRef.current = proposal.requiredNarrativeBeats;
    setError(null);
    setDirectorProposalApplied(true);

    // Do NOT default unset creationMode to commercial. Creative Director is the
    // primary Studio entry; mode may be unknown until the customer confirms.
    const knownMode = creationModeRef.current;

    // Stay on /studio. Closing the talking panel must NOT fall through to
    // StudioHero. Do not rotate sessionKey or clear directorMessages.
    setPhase((current) => {
      if (
        current === "creating" ||
        current === "processing_payment" ||
        current === "processing_premium"
      ) {
        return current;
      }
      // Unknown mode: smallest existing-style choice before intent feed.
      if (!knownMode) {
        return "creation_mode";
      }
      if (knownMode === "commercial" && !destinationRef.current) {
        return "destination";
      }
      return "intent";
    });
    if (knownMode === "commercial" && !destinationRef.current) {
      setDirectorPanelOpen(false);
    }
  }, []);

  useLayoutEffect(() => {
    if (phase !== "intent") return;
    const el = intentTextareaRef.current;
    if (!el) return;

    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, INTENT_PROMPT_MAX_HEIGHT_PX);
    el.style.height = `${next}px`;
    el.style.overflowY =
      el.scrollHeight > INTENT_PROMPT_MAX_HEIGHT_PX ? "auto" : "hidden";
  }, [input, phase, directorProposalApplied]);

  const checkoutProvider = {
    id: paymentProviderDisplay.id,
    label: paymentProviderDisplay.label,
    paymentMethods: CHECKOUT_PAYMENT_METHODS,
    startPurchase: startCheckoutPurchase,
  };

  const directorStageActive =
    phase === "creating" || premiumPhaseActive;

  const commercialReviewActive =
    phase === "preview" &&
    creationMode !== "advertising_image" &&
    Boolean(videoUrl) &&
    (revealStage === "offer" || reviewVisualMock);

  const advertisingReviewActive =
    phase === "image_result" && Boolean(premiumImage);

  const directorReviewActive =
    commercialReviewActive || advertisingReviewActive;

  // WORKING stage owns the cinematic Director — close talking presentation.
  useEffect(() => {
    if (!directorStageActive) return;
    setDirectorPanelOpen(false);
  }, [directorStageActive]);

  // Leaving result phases resets REVIEW focus; conversation messages stay in session.
  // Do not clear the local UX4A mock while ?ux4aReview=1 remains (local inspection).
  useEffect(() => {
    if (phase === "preview" || phase === "image_result") return;
    if (isUx4aReviewMockRequest()) return;
    setRevealStage(null);
    setDirectorReviewFocus("invite");
    setReviewVisualMock(false);
  }, [phase]);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        multiple
        onChange={handleFileChange}
        className="sr-only"
      />

      {/* Director cinematic intro is the fresh Studio host; hero/chooser are fallback when closed. */}
      {phase === "welcome" && !directorPanelOpen && <StudioHero />}

      {phase === "welcome" && !directorPanelOpen ? (
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
                    ¿Qué quieres crear?
                  </h2>
                  <p className="text-sm text-neutral-500 sm:text-base">
                    Elige y Metaprom hace el resto con tu foto.
                  </p>
                </div>

                <div className="mt-8 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => selectCreationMode("commercial")}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 py-4 text-base font-semibold text-white transition hover:from-violet-600 hover:to-purple-700"
                  >
                    Un Comercial
                  </button>
                  <button
                    type="button"
                    onClick={() => selectCreationMode("advertising_image")}
                    className="inline-flex w-full items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50 py-4 text-base font-semibold text-neutral-900 transition hover:border-violet-200 hover:bg-violet-50/50"
                  >
                    Una Imagen Publicitaria
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
      ) : phase === "welcome" ? null : phase === "creating" ? (
        <motion.div
          key="creating-director-stage"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="overflow-x-hidden bg-[#07070c] pb-28"
        >
          <DirectorStage mode="working">
            <StudioProgress
              tone="director"
              label={
                creationProgressComplete
                  ? isBatchCreating
                    ? "Procesando tus imágenes"
                    : creationMode === "advertising_image"
                      ? "Imagen lista"
                      : "Comercial listo"
                  : creationBand.label
              }
              stage={
                creationProgressComplete
                  ? isBatchCreating
                    ? batchProgressMessage || creationBand.stage
                    : creationMode === "advertising_image"
                      ? "Tu imagen publicitaria está lista."
                      : "Tu comercial está listo."
                  : creationBand.stage || creationMessage
              }
              progress={creationProgress.progress}
              status={creationProgress.status}
              longWait={creationProgress.longWait}
            />
          </DirectorStage>
          {autoSaveStatus === "persistence-error" ? (
            <div className="mx-auto mt-6 max-w-md rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-center text-sm text-amber-100">
              <p>{error ?? "Falta terminar de guardar tu comercial."}</p>
              <button
                type="button"
                onClick={() => void retryCommercialPersistence()}
                className="mt-3 rounded-xl bg-white px-4 py-2 font-semibold text-neutral-950 transition hover:bg-neutral-100"
              >
                Reintentar guardado
              </button>
            </div>
          ) : null}
          {isBatchCreating && batchItems.length > 0 ? (
            <ul className="mx-auto mt-6 grid max-w-2xl grid-cols-4 gap-2 px-6 sm:grid-cols-5 md:grid-cols-6">
              {batchItems.map((item, index) => (
                <li
                  key={item.id}
                  className="relative overflow-hidden rounded-lg border border-white/10 bg-white/5"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      item.premiumImage ||
                      sourcePreviewUrls[index] ||
                      previewUrl ||
                      ""
                    }
                    alt={item.originalFilename}
                    className="aspect-square w-full object-cover opacity-90"
                  />
                  <span
                    className={`absolute inset-x-0 bottom-0 px-1 py-0.5 text-center text-[9px] font-semibold uppercase tracking-wide ${
                      item.status === "completed"
                        ? "bg-emerald-500/90 text-white"
                        : item.status === "failed"
                          ? "bg-red-500/90 text-white"
                          : item.status === "processing"
                            ? "bg-violet-500/90 text-white"
                            : "bg-black/70 text-white/80"
                    }`}
                  >
                    {batchStatusLabel(item.status)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </motion.div>
      ) : premiumPhaseActive ? (
        <motion.div
          key="premium-director-stage"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="space-y-6 overflow-x-hidden bg-[#07070c] pb-28"
        >
          <DirectorStage mode="working">
            <StudioProgress
              tone="director"
              label={
                premiumProgressComplete
                  ? "Comercial listo"
                  : premiumBand.label
              }
              stage={
                premiumProgressComplete
                  ? "Tu comercial HD está listo."
                  : premiumBand.stage
              }
              progress={premiumProgress.progress}
              status={premiumProgress.status}
              longWait={premiumProgress.longWait}
            />
          </DirectorStage>
          <div className="mx-auto max-w-2xl space-y-4 px-6">
            <Checkout
              purchaseId={checkoutAssetId}
              price={HD_COMMERCIAL_PRICE}
              currency="MXN"
              provider={checkoutProvider}
              previewVideoUrl={videoUrl}
              error={null}
              onSuccess={handleCheckoutSuccess}
              onCancel={() => setPhase("preview")}
            />
            {!checkoutAssetId && showRegistrationInvite && (
              <GoogleSignInButton
                redirectTo={authRedirectToRef.current}
                label="Crear cuenta gratuita para continuar"
              />
            )}
          </div>
        </motion.div>
      ) : (
        <div className="mx-auto max-w-2xl bg-[#ececec] px-6 pb-36 pt-8">
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

        {phase === "batch_result" && (
          <motion.div
            key="batch_result"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-6 rounded-3xl border border-neutral-200 bg-white p-6 shadow-lg sm:p-8"
          >
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
                {batchItems.filter((item) => item.status === "completed").length}{" "}
                de {batchItems.length || sourceFiles.length} imágenes listas
              </h2>
              <p className="text-sm text-neutral-500">
                {batchItems.some((item) => item.status === "failed")
                  ? "Algunas fotos no se pudieron procesar. Puedes reintentar solo las fallidas."
                  : "Tu lote está en Biblioteca."}
              </p>
            </div>

            {batchItems.length > 0 ? (
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {batchItems.map((item, index) => (
                  <li
                    key={item.id}
                    className="relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        item.premiumImage ||
                        sourcePreviewUrls[index] ||
                        previewUrl ||
                        ""
                      }
                      alt={item.originalFilename}
                      className="aspect-square w-full object-cover"
                    />
                    <span
                      className={`absolute inset-x-0 bottom-0 px-1 py-0.5 text-center text-[10px] font-semibold ${
                        item.status === "completed"
                          ? "bg-emerald-600 text-white"
                          : item.status === "failed"
                            ? "bg-red-600 text-white"
                            : "bg-neutral-800 text-white"
                      }`}
                    >
                      {batchStatusLabel(item.status)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            {error ? (
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
            ) : null}

            <div className="flex flex-col gap-3">
              {batchItems.some((item) => item.status === "failed") ? (
                <button
                  type="button"
                  onClick={() =>
                    void runBatchCreation({ retryFailedOnly: true })
                  }
                  className="rounded-2xl border border-neutral-200 bg-neutral-50 py-3.5 text-sm font-semibold text-neutral-900 transition hover:border-violet-300 hover:bg-violet-50/40"
                >
                  Reintentar fallidas
                </button>
              ) : null}
              {batchProjectId ||
              batchItems.some((item) => item.status === "completed") ? (
                <button
                  type="button"
                  onClick={handleOpenLibrary}
                  className="rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 py-4 text-base font-semibold text-white transition hover:from-violet-600 hover:to-purple-700"
                >
                  Ver en Biblioteca
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setPhase("intent")}
                className="rounded-2xl py-3 text-sm font-semibold text-neutral-500 transition hover:text-neutral-800"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={resetFlow}
                className="rounded-2xl py-3 text-sm font-semibold text-neutral-400 transition hover:text-neutral-700"
              >
                Crear otra pieza
              </button>
            </div>
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
              multiple
              onFileSelected={(file) =>
                applySelectedFile(file, { autoContinue: true })
              }
              onFilesSelected={(files) =>
                appendSourceFiles(files, { autoContinue: true })
              }
            />

            {isBatchSelection ? (
              <div className="space-y-4 rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-neutral-900">
                    {sourceFiles.length} fotos seleccionadas
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 transition hover:border-violet-300 hover:bg-violet-50/40"
                    >
                      Agregar más fotos
                    </button>
                    <button
                      type="button"
                      onClick={clearSourceFiles}
                      className="rounded-xl px-3 py-1.5 text-xs font-semibold text-neutral-500 transition hover:text-neutral-800"
                    >
                      Limpiar todo
                    </button>
                  </div>
                </div>

                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                  {sourceFiles.map((file, index) => (
                    <li
                      key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                      className="relative overflow-hidden rounded-xl border border-neutral-200 bg-white"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={sourcePreviewUrls[index] ?? previewUrl ?? ""}
                        alt={file.name}
                        className="aspect-square w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeSourceFileAt(index)}
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900/80 text-xs font-bold text-white transition hover:bg-neutral-900"
                        aria-label={`Quitar ${file.name}`}
                      >
                        ×
                      </button>
                      <p className="truncate px-1.5 py-1 text-[10px] text-neutral-500">
                        {file.name}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
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
            )}

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
                onClick={() => {
                  setCreationMode(null);
                  creationModeRef.current = null;
                  resetFlow();
                }}
                className="rounded-2xl px-6 py-4 text-sm font-semibold text-neutral-500 transition hover:text-neutral-800"
              >
                Cambiar idea
              </button>
            </div>
          </motion.div>
        )}

        {phase === "creation_mode" && (
          <motion.div
            key="creation_mode"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="space-y-8 rounded-3xl border border-neutral-200 bg-white p-8 shadow-lg"
          >
            {previewUrl && !directorProposalApplied && (
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Vista previa"
                  className="max-h-28 rounded-xl border border-neutral-200 object-contain"
                />
              </div>
            )}
            <div className="space-y-3 text-center">
              <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
                {directorProposalApplied
                  ? "¿Qué quieres crear con esta propuesta?"
                  : "¿Qué quieres crear?"}
              </h2>
              {!directorProposalApplied && (
                <p className="text-sm text-neutral-500 sm:text-base">
                  Elige el tipo de pieza. Puedes cambiar después.
                </p>
              )}
            </div>
            <div className="flex flex-col gap-3">
              {directorProposalApplied ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      selectCreationModeAfterProposal("advertising_image")
                    }
                    className="rounded-2xl border border-neutral-200 bg-neutral-50 px-6 py-4 text-base font-semibold text-neutral-900 transition hover:border-violet-200 hover:bg-violet-50/50"
                  >
                    Una Imagen Publicitaria
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      selectCreationModeAfterProposal("commercial")
                    }
                    className="rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-4 text-base font-semibold text-white transition hover:from-violet-600 hover:to-purple-700"
                  >
                    Un Comercial
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => selectCreationMode("commercial")}
                    className="rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-4 text-base font-semibold text-white transition hover:from-violet-600 hover:to-purple-700"
                  >
                    Un Comercial
                  </button>
                  <button
                    type="button"
                    onClick={() => selectCreationMode("advertising_image")}
                    className="rounded-2xl border border-neutral-200 bg-neutral-50 px-6 py-4 text-base font-semibold text-neutral-900 transition hover:border-violet-200 hover:bg-violet-50/50"
                  >
                    Una Imagen Publicitaria
                  </button>
                </>
              )}
            </div>
            {!directorProposalApplied && (
              <button
                type="button"
                onClick={() => {
                  setCreationMode(null);
                  creationModeRef.current = null;
                  setPhase(
                    sourceFilesRef.current.length > 0 ? "upload" : "welcome",
                  );
                }}
                className="w-full rounded-2xl py-3 text-sm font-semibold text-neutral-500 transition hover:text-neutral-800"
              >
                Volver
              </button>
            )}
          </motion.div>
        )}

        {phase === "destination" && creationMode === "commercial" && (
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
              onBack={() => setPhase("creation_mode")}
            />
          </motion.div>
        )}

        {phase === "image_intent" && (
          <motion.div
            key="image_intent"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="-mx-6 space-y-8 rounded-3xl bg-black px-6 py-8 sm:-mx-0"
          >
            <div className="space-y-3 text-center">
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {imageIntentQuestion}
              </h2>
              <p className="text-base text-white/55">
                Elige una opción para preparar el resultado correcto.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {IMAGE_INTENT_CHOICES.map((choice) => (
                <button
                  key={choice.intent}
                  type="button"
                  onClick={() => void selectImageIntent(choice.intent)}
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] px-5 py-4 text-base font-semibold text-white transition hover:border-white/30 hover:bg-white/[0.08]"
                >
                  {choice.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setPhase("intent")}
              className="w-full rounded-2xl py-3 text-sm font-semibold text-white/50 transition hover:text-white/80"
            >
              Volver
            </button>
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
              {creationMode === "commercial" && destination && (
                <p className="text-sm text-white/45">
                  {destination.platform} · {destination.aspectRatio}
                </p>
              )}
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {creationMode === "advertising_image"
                  ? "¿Qué imagen necesitas?"
                  : "¿Qué te gustaría crear hoy?"}
              </h2>
              <p className="text-base text-white/55">
                {creationMode === "advertising_image"
                  ? "Descríbelo con tus palabras. Metaprom interpreta el uso."
                  : "Describe tu comercial. Metaprom interpreta tu intención."}
              </p>
              {creationMode === "advertising_image" &&
              advertisingCreditMessage ? (
                <p
                  className="text-sm font-medium text-emerald-300/90"
                  role="status"
                >
                  {advertisingCreditMessage}
                </p>
              ) : null}
              {creationMode === "advertising_image" &&
              typeof advertisingCreditsRemaining === "number" ? (
                <p className="text-sm text-white/50" role="status">
                  {advertisingCreditsRemaining === 1
                    ? "1 imagen disponible"
                    : `${advertisingCreditsRemaining} imágenes disponibles`}
                </p>
              ) : null}
              {isBatchSelection ? (
                <p className="text-sm text-white/55" role="status">
                  {sourceFiles.length} fotos seleccionadas
                  {creationMode === "commercial"
                    ? ` · ${COMMERCIAL_BATCH_BLOCKED_MESSAGE}`
                    : " · Se aplicará la misma instrucción a cada foto"}
                </p>
              ) : null}
            </div>

            <form onSubmit={handleIntentSubmit} className="space-y-5">
              <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 sm:px-5">
                {directorProposalApplied ? (
                  <p
                    className="text-sm font-medium text-emerald-300/90"
                    role="status"
                  >
                    ✓ Prompt preparado por tu Director Creativo
                  </p>
                ) : null}
                <label htmlFor="studio-intent-prompt" className="sr-only">
                  {creationMode === "advertising_image"
                    ? "Descripción de tu imagen"
                    : "Descripción de tu comercial"}
                </label>
                <textarea
                  id="studio-intent-prompt"
                  ref={intentTextareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  rows={3}
                  placeholder={
                    creationMode === "advertising_image"
                      ? "Ej: fotos de una casa, optimízalas premium para venderla..."
                      : "Describe tu comercial. Ej: hamburguesa artesanal en cámara lenta..."
                  }
                  className="max-h-[min(50vh,24rem)] min-h-[5.5rem] w-full resize-none overflow-x-hidden bg-transparent text-base leading-relaxed text-white placeholder:text-white/35 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={
                  !input.trim() ||
                  (isBatchSelection && creationMode !== "advertising_image") ||
                  (creationMode === "commercial" && !destination)
                }
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-violet-500 via-purple-500 to-cyan-400 px-5 py-3.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span aria-hidden="true">✨</span>
                {premiumImage || videoUrl
                  ? "Generar nueva versión"
                  : "Generar"}
              </button>

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

              {creationMode === "commercial" && (
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
              )}

              <button
                type="button"
                onClick={() =>
                  setPhase(
                    creationMode === "advertising_image"
                      ? "creation_mode"
                      : "destination",
                  )
                }
                className="w-full rounded-2xl py-3 text-sm font-semibold text-white/50 transition hover:text-white/80"
              >
                Volver
              </button>
            </form>
          </motion.div>
        )}

        {phase === "image_result" && premiumImage && (
          <motion.div
            key="image_result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] overflow-y-auto"
          >
            <DirectorResultReview
              media={
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={premiumImage}
                  alt="Imagen publicitaria premium"
                  className="mx-auto max-h-[42vh] w-full object-contain sm:max-h-[48vh] lg:max-h-[min(62vh,36rem)]"
                />
              }
              mediaFooter={
                directorReviewFocus === "continue" ? (
                  <div className="space-y-3">
                    {error && (
                      <div className="space-y-2 rounded-xl border border-red-400/40 bg-red-950/40 px-4 py-3 text-sm text-red-100">
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
                    {(autoSaveStatus === "saving" ||
                      finalizeProgressComplete) && (
                      <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-left">
                        <StudioProgress
                          compact
                          label={
                            finalizeProgressComplete
                              ? "Imagen lista"
                              : finalizeBand.label
                          }
                          stage={
                            finalizeProgressComplete
                              ? "Guardada en tu Biblioteca."
                              : finalizeBand.stage
                          }
                          progress={finalizeProgress.progress}
                          status={finalizeProgress.status}
                          longWait={finalizeProgress.longWait}
                        />
                      </div>
                    )}
                    {autoSaveMessage &&
                      autoSaveStatus !== "requires-package" &&
                      autoSaveStatus !== "saving" && (
                        <p className="text-center text-sm text-white/55">
                          {autoSaveMessage}
                        </p>
                      )}
                    <button
                      type="button"
                      onClick={() => void handleFinalizeAdvertisingImage()}
                      disabled={autoSaveStatus === "saving"}
                      className="w-full rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 py-4 text-base font-semibold text-white transition hover:from-violet-600 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {autoSaveStatus === "saving"
                        ? "Finalizando..."
                        : "Finalizar Imagen"}
                    </button>
                    {/* Explicit regeneration only — never from Director advice alone. */}
                    <button
                      type="button"
                      onClick={() => void runCreation()}
                      disabled={autoSaveStatus === "saving"}
                      className="w-full rounded-2xl border border-white/20 bg-white/5 py-3 text-sm font-semibold text-white/85 transition hover:border-white/35 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Generar de nuevo
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhase("intent")}
                      className="w-full text-sm text-white/35 transition hover:text-white/55"
                    >
                      Cambiar descripción
                    </button>
                    {showRegistrationInvite && (
                      <div className="space-y-3 text-center">
                        <p className="text-sm text-white/65">
                          Inicia sesión para guardar tu imagen en Biblioteca.
                        </p>
                        <GoogleSignInButton
                          redirectTo={authRedirectToRef.current}
                          label="Crear cuenta gratuita para continuar"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-center text-xs text-white/40">
                    Revisa el resultado con el Director antes de finalizar.
                  </p>
                )
              }
              director={
                <DirectorReviewInvite
                  focus={directorReviewFocus}
                  onAdjust={handleReviewAdjust}
                  onContinue={handleReviewContinue}
                  conversationHostRef={reviewDirectorHostRef}
                  shareSlug={shareSlug}
                  publicPreviewUrl={
                    shareSlug ? buildPublicPreviewUrl(shareSlug) : null
                  }
                  shareAssetType="advertising_image"
                />
              }
            />
          </motion.div>
        )}

        {phase === "image_ready" && premiumImage && (
          <motion.div
            key="image_ready"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-6 rounded-3xl border border-neutral-200 bg-white p-6 text-center shadow-lg sm:p-8"
          >
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
                Imagen guardada
              </h2>
              <p className="text-sm text-neutral-500">
                Tu imagen publicitaria está en Biblioteca.
              </p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={premiumImage}
              alt="Imagen publicitaria finalizada"
              className="mx-auto max-h-64 w-full rounded-2xl border border-neutral-200 object-contain"
            />
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleOpenLibrary}
                className="rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 py-4 text-base font-semibold text-white transition hover:from-violet-600 hover:to-purple-700"
              >
                Ver en Biblioteca
              </button>
              <button
                type="button"
                onClick={resetFlow}
                className="rounded-2xl py-3 text-sm font-semibold text-neutral-500 transition hover:text-neutral-800"
              >
                Crear otra pieza
              </button>
            </div>
          </motion.div>
        )}

        {phase === "preview" &&
          creationMode !== "advertising_image" &&
          videoUrl && (
            <CinematicReveal
              videoUrl={videoUrl}
              priceMxn={HD_COMMERCIAL_PRICE}
              autoSaveMessage={autoSaveMessage}
              onAutoSaveClick={handleOpenLibrary}
              initialStage={reviewVisualMock ? "offer" : "fade"}
              onUnlock={handleUnlock}
              onCreateNew={resetFlow}
              shareSlug={shareSlug}
              publicPreviewUrl={
                shareSlug ? buildPublicPreviewUrl(shareSlug) : null
              }
              reviewMode
              reviewShowPurchase={directorReviewFocus === "continue"}
              onStageChange={setRevealStage}
              reviewDirector={
                <DirectorReviewInvite
                  focus={directorReviewFocus}
                  onAdjust={handleReviewAdjust}
                  onContinue={handleReviewContinue}
                  conversationHostRef={reviewDirectorHostRef}
                  shareSlug={shareSlug}
                  publicPreviewUrl={
                    shareSlug ? buildPublicPreviewUrl(shareSlug) : null
                  }
                />
              }
            />
          )}

        {draftRecoveryError && (
          <div className="mx-auto mb-4 max-w-md rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            {draftRecoveryError}
          </div>
        )}

        {(phase === "checkout" || phase === "error") && (
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

      {!directorPanelOpen &&
        !directorStageActive &&
        !directorReviewActive &&
        !(phase === "preview" && Boolean(videoUrl)) &&
        phase !== "unavailable" && (
        <CreativeDirectorPresence
          onOpen={handleOpenDirectorPanel}
          libraryOpen={libraryOpen}
        />
      )}

      <CreativeDirectorPanel
        open={
          directorReviewActive
            ? directorReviewFocus === "conversation"
            : directorPanelOpen && !directorStageActive
        }
        presentation={directorReviewActive ? "embedded" : "overlay"}
        embeddedHostRef={reviewDirectorHostRef}
        stackLayer={
          phase === "preview" || phase === "image_result"
            ? "elevated"
            : "default"
        }
        libraryOpen={libraryOpen}
        onClose={handleCloseDirectorPanel}
        projectContext={creativeDirectorProjectContext}
        onUseProposal={handleUseDirectorProposal}
        pendingCompanionMoment={pendingCompanionMoment}
        onCompanionMomentHandled={handleCompanionMomentHandled}
        sessionKey={directorSessionKey}
        initialMessages={directorMessages}
        onMessagesChange={setDirectorMessages}
        authRedirectTo={authRedirectToRef.current}
        showRegistrationInvite={showRegistrationInvite}
        photoActions={
          <div className="space-y-2">
            <InstantCaptureButtons
              multiple
              variant="dark"
              size="compact"
              order="gallery-first"
              galleryLabel="Subir foto(s)"
              cameraLabel="Tomar foto"
              onFileSelected={(file) => {
                applySelectedFile(file);
                // Enter existing upload surface so single/batch Phase A UI can show.
                setPhase((current) =>
                  current === "welcome" ? "upload" : current,
                );
              }}
              onFilesSelected={(files) => {
                appendSourceFiles(files);
                setPhase((current) =>
                  current === "welcome" ? "upload" : current,
                );
              }}
            />
            {sourceFiles.length > 0 ? (
              <p
                className="text-center text-[11px] font-medium tracking-wide text-white/45"
                role="status"
                aria-live="polite"
              >
                ✓{" "}
                {sourceFiles.length === 1
                  ? "1 foto cargada"
                  : `${sourceFiles.length} fotos cargadas`}
              </p>
            ) : null}
          </div>
        }
        accountActions={
          !isAuthenticated ? (
            <>
              <Link
                href="/login?redirect=%2Fstudio"
                className="rounded-full px-2.5 py-1.5 text-xs font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
              >
                {chrome?.signIn ?? "Iniciar sesión"}
              </Link>
              <Link
                href="/login?redirect=%2Fstudio"
                className="rounded-full px-2.5 py-1.5 text-xs font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
              >
                {chrome?.signUp ?? "Crear cuenta"}
              </Link>
            </>
          ) : null
        }
        secondaryActions={
          phase === "welcome" ? (
            <div className="space-y-2">
              <p className="text-xs text-white/45">O empieza manualmente</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => selectCreationMode("commercial")}
                  className="inline-flex flex-1 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm font-medium text-white/85 transition hover:border-white/30 hover:bg-white/10"
                >
                  Un Comercial
                </button>
                <button
                  type="button"
                  onClick={() => selectCreationMode("advertising_image")}
                  className="inline-flex flex-1 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm font-medium text-white/85 transition hover:border-white/30 hover:bg-white/10"
                >
                  Una Imagen Publicitaria
                </button>
              </div>
            </div>
          ) : null
        }
      />
    </>
  );
}

/**
 * Compact persistent entry point while the Director panel is closed.
 * One shared conversation remains owned by CreativeDirectorPanel + sessionKey.
 * Anchored bottom-right above primary CTA stacks (see flow pb-36 / mobile offset).
 * When Biblioteca is open: desktop sits just left of the panel (max-w-md);
 * mobile keeps compact placement (no desktop panel-offset).
 * Visual presence only — same onOpen handler; canonical Director artwork.
 */
function CreativeDirectorPresence({
  onOpen,
  libraryOpen = false,
}: {
  onOpen: () => void;
  libraryOpen?: boolean;
}) {
  // Biblioteca aside uses max-w-md (28rem). Desktop: sit just left of that boundary.
  // Mobile Biblioteca is full-width — keep compact closed-state placement; hide while open.
  const positionClass = libraryOpen
    ? "pointer-events-none fixed bottom-24 right-3 z-[105] max-sm:hidden sm:bottom-8 sm:right-[calc(28rem+1.5rem)]"
    : "pointer-events-none fixed bottom-24 right-3 z-[105] sm:bottom-8 sm:right-6";

  return (
    <div className={positionClass}>
      <button
        type="button"
        onClick={onOpen}
        className="pointer-events-auto group flex w-[11.5rem] flex-col overflow-hidden rounded-2xl border border-white/12 bg-[#0c0c14]/96 text-left shadow-[0_18px_48px_rgba(0,0,0,0.45)] backdrop-blur-md transition hover:border-fuchsia-300/35 hover:shadow-[0_22px_56px_rgba(0,0,0,0.5)] sm:w-[12.25rem]"
        aria-label="Abrir Director Creativo"
      >
        <span className="relative flex h-[5.75rem] w-full items-end justify-center overflow-hidden sm:h-[6.5rem]">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(217,70,239,0.28)_0%,rgba(12,12,20,0.2)_55%,rgba(12,12,20,0.95)_100%)]"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-[28%] h-[55%] w-[55%] -translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-2xl"
          />
          {/* eslint-disable-next-line @next/next/no-img-element -- approved transparent PNG; match DirectorStage slot */}
          <img
            src={DIRECTOR_ARTWORK_SRC}
            alt=""
            className="relative z-[1] h-[5.5rem] w-auto max-w-[7.5rem] object-contain object-bottom drop-shadow-[0_12px_24px_rgba(0,0,0,0.55)] transition duration-300 group-hover:scale-[1.03] sm:h-[6.25rem] sm:max-w-[8.25rem]"
          />
        </span>
        <span className="flex flex-col px-3 pb-3 pt-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fuchsia-300/90">
            Director Creativo
          </span>
          <span className="mt-1 text-[12px] leading-snug text-white/75">
            ¿Qué hacemos ahora?
          </span>
          <span className="mt-2 inline-flex w-fit items-center rounded-full bg-gradient-to-r from-violet-500 to-purple-600 px-2.5 py-1 text-[11px] font-semibold text-white">
            Pregúntame
          </span>
        </span>
      </button>
    </div>
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
