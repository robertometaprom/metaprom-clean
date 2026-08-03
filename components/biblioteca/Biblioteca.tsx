"use client";



import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";

import {

  assetHasTeaser,

  fetchBibliotecaAssets,

  fetchBibliotecaProjects,

  ensureBibliotecaAuthReady,

  getCommercialStatusLabel,

  getPublicPreviewUrl,

  isAssetPremiumOwned,

  type BibliotecaAsset,

  type BibliotecaProject,

  BibliotecaAuthError,

} from "@/lib/biblioteca";

import { buildBibliotecaStudioUrl } from "@/lib/biblioteca-routing";

import { downloadFromUrl } from "@/lib/library-storage";

import GoogleSignInButton from "@/components/GoogleSignInButton";

import { ShareCommercialActions } from "@/components/share";



export type BibliotecaProps = {

  open: boolean;

  onClose: () => void;

  focusProjectId?: string | null;

  focusAssetId?: string | null;

  refreshToken?: number;

  resetToListToken?: number;

  onClearFocus?: () => void;

  authUser: User | null;

  authReady: boolean;

};



const FOCUS_PROJECT_RETRY_MS = 1500;

const FOCUS_PROJECT_MAX_RETRIES = 4;

const FOCUS_PROJECT_PLACEHOLDER_NAME = "Tu comercial";



function isFocusProjectMissing(

  projectList: BibliotecaProject[],

  focusProjectId?: string | null,

): boolean {

  return Boolean(

    focusProjectId && !projectList.some((project) => project.id === focusProjectId),

  );

}



function getProjectThumbnail(assets: BibliotecaAsset[]): string | null {

  const asset = assets[0];

  if (!asset) return null;

  return asset.image_url || asset.original_url || null;

}



function getProjectOriginalThumbnail(assets: BibliotecaAsset[]): string | null {

  const asset = assets[0];

  if (!asset) return null;

  return asset.original_url || null;

}



function TransformationPipeline({

  originalUrl,

  premiumUrl,

  hasTeaser,

  compact = false,

}: {

  originalUrl: string | null;

  premiumUrl: string | null;

  hasTeaser: boolean;

  compact?: boolean;

}) {

  const thumbSize = compact ? "h-10 w-10" : "h-11 w-11";

  const arrowSize = compact ? "h-3 w-3" : "h-3.5 w-3.5";



  return (

    <div className="flex items-center gap-1.5" aria-hidden="true">

      <div

        className={`${thumbSize} shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100`}

      >

        {originalUrl ? (

          // eslint-disable-next-line @next/next/no-img-element

          <img src={originalUrl} alt="" className="h-full w-full object-cover" />

        ) : (

          <div className="h-full w-full bg-neutral-200" />

        )}

      </div>



      <svg

        className={`${arrowSize} shrink-0 text-violet-300`}

        fill="none"

        viewBox="0 0 24 24"

        stroke="currentColor"

        strokeWidth={2}

      >

        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />

      </svg>



      <div

        className={`${thumbSize} shrink-0 overflow-hidden rounded-lg border border-violet-200 bg-violet-50`}

      >

        {premiumUrl ? (

          // eslint-disable-next-line @next/next/no-img-element

          <img src={premiumUrl} alt="" className="h-full w-full object-cover" />

        ) : (

          <div className="h-full w-full bg-violet-100" />

        )}

      </div>



      <svg

        className={`${arrowSize} shrink-0 text-violet-300`}

        fill="none"

        viewBox="0 0 24 24"

        stroke="currentColor"

        strokeWidth={2}

      >

        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />

      </svg>



      <div

        className={`${thumbSize} flex shrink-0 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-white`}

      >

        {hasTeaser ? (

          <span className="text-[10px] font-bold">▶</span>

        ) : (

          <span className="text-[9px] text-white/40">▶</span>

        )}

      </div>

    </div>

  );

}



function buildFocusKey(

  focusProjectId?: string | null,

  focusAssetId?: string | null,

): string | null {

  if (!focusProjectId) return null;

  return `${focusProjectId}:${focusAssetId ?? ""}`;

}



function TimelineArrow() {

  return (

    <div className="flex justify-center py-1" aria-hidden="true">

      <svg

        className="h-5 w-5 text-violet-300"

        fill="none"

        viewBox="0 0 24 24"

        stroke="currentColor"

        strokeWidth={2}

      >

        <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7-7-7" />

      </svg>

    </div>

  );

}



export default function Biblioteca({

  open,

  onClose,

  focusProjectId,

  focusAssetId,

  refreshToken = 0,

  resetToListToken = 0,

  onClearFocus,

  authUser,

  authReady,

}: BibliotecaProps) {

  const [projects, setProjects] = useState<BibliotecaProject[]>([]);

  const [assetsByProject, setAssetsByProject] = useState<

    Record<string, BibliotecaAsset[]>

  >({});

  const [loadingProjects, setLoadingProjects] = useState(false);

  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const [loadingAssetsFor, setLoadingAssetsFor] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(

    null,

  );

  const [highlightAssetId, setHighlightAssetId] = useState<string | null>(null);



  const appliedFocusKeyRef = useRef<string | null>(null);

  const userBrowsingRef = useRef(false);

  const focusProjectIdRef = useRef(focusProjectId);

  const assetsByProjectRef = useRef(assetsByProject);

  const selectedProjectIdRef = useRef(selectedProjectId);

  focusProjectIdRef.current = focusProjectId;

  assetsByProjectRef.current = assetsByProject;

  selectedProjectIdRef.current = selectedProjectId;



  const authUserId = authUser?.id;



  const loadAssetsForProject = useCallback(

    async (projectId: string, { force = false } = {}) => {

      const userId = authUserId;

      if (!userId) {

        return [];

      }



      if (!force && assetsByProjectRef.current[projectId]?.length) {

        return assetsByProjectRef.current[projectId];

      }



      setLoadingAssetsFor(projectId);

      try {

        const assets = await fetchBibliotecaAssets(projectId, userId);

        setAssetsByProject((current) => ({ ...current, [projectId]: assets }));

        return assets;

      } finally {

        setLoadingAssetsFor((current) =>

          current === projectId ? null : current,

        );

      }

    },

    [authUserId],

  );



  const loadLibrary = useCallback(

    async (options?: { awaitFocusProject?: boolean }) => {

      const userId = authUserId;

      if (!userId) {

        return;

      }



      setLoadingProjects(true);

      setError(null);



      try {

        await ensureBibliotecaAuthReady();

        let projectList = await fetchBibliotecaProjects(userId);

        const awaitedFocusProjectId = focusProjectIdRef.current;



        if (

          options?.awaitFocusProject &&

          isFocusProjectMissing(projectList, awaitedFocusProjectId)

        ) {

          for (let attempt = 0; attempt < FOCUS_PROJECT_MAX_RETRIES; attempt++) {

            await new Promise((resolve) =>

              window.setTimeout(resolve, FOCUS_PROJECT_RETRY_MS),

            );

            projectList = await fetchBibliotecaProjects(userId);

            if (!isFocusProjectMissing(projectList, awaitedFocusProjectId)) {

              break;

            }

          }

        }



        setProjects(projectList);



        void Promise.all(

          projectList.slice(0, 6).map(async (project) => {

            try {

              const assets = await fetchBibliotecaAssets(project.id, userId);

              setAssetsByProject((current) => ({

                ...current,

                [project.id]: assets,

              }));

            } catch {

              // Thumbnails load on demand when a project is opened.

            }

          }),

        );

      } catch (loadError) {

        if (loadError instanceof BibliotecaAuthError) {

          setError("Inicia sesión para ver tu biblioteca.");

        } else {

          setError("No pudimos cargar tu biblioteca.");

        }

      } finally {

        setLoadingProjects(false);

        setHasLoadedOnce(true);

      }

    },

    [authUserId],

  );



  useEffect(() => {

    if (!open) {

      appliedFocusKeyRef.current = null;

      userBrowsingRef.current = false;

      setSelectedProjectId(null);

      setHighlightAssetId(null);

      return;

    }



    if (!authReady) {

      return;

    }



    setError(null);

    setAssetsByProject({});



    if (!authUser) {

      setProjects([]);

      setLoadingProjects(false);

      setHasLoadedOnce(true);

      setError("Inicia sesión para ver tu biblioteca.");

      return;

    }



    void loadLibrary({ awaitFocusProject: Boolean(focusProjectId) });

  }, [open, refreshToken, loadLibrary, focusProjectId, authReady, authUserId]);



  useEffect(() => {

    if (!open || resetToListToken === 0) return;



    userBrowsingRef.current = true;

    appliedFocusKeyRef.current = null;

    setSelectedProjectId(null);

    setHighlightAssetId(null);

  }, [open, resetToListToken]);



  useEffect(() => {

    if (!open || !focusProjectId) return;



    const focusKey = buildFocusKey(focusProjectId, focusAssetId);

    if (!focusKey || appliedFocusKeyRef.current === focusKey) return;



    appliedFocusKeyRef.current = focusKey;

    userBrowsingRef.current = false;

    setSelectedProjectId(focusProjectId);

    if (focusAssetId) setHighlightAssetId(focusAssetId);

    void loadAssetsForProject(focusProjectId);

  }, [open, focusProjectId, focusAssetId, loadAssetsForProject]);



  useEffect(() => {

    if (!open || refreshToken === 0) return;



    if (focusProjectId) {

      appliedFocusKeyRef.current = null;

    }



    const projectId = selectedProjectIdRef.current;

    if (projectId) {

      void loadAssetsForProject(projectId, { force: true });

    }

  }, [open, refreshToken, focusProjectId, loadAssetsForProject]);



  const openProject = useCallback(

    (projectId: string) => {

      onClearFocus?.();

      userBrowsingRef.current = true;

      appliedFocusKeyRef.current = null;

      setSelectedProjectId(projectId);

      setHighlightAssetId(null);

      void loadAssetsForProject(projectId);

    },

    [loadAssetsForProject, onClearFocus],

  );



  const closeProject = useCallback(() => {

    onClearFocus?.();

    userBrowsingRef.current = true;

    appliedFocusKeyRef.current = null;

    setSelectedProjectId(null);

    setHighlightAssetId(null);

  }, [onClearFocus]);



  if (!open) return null;



  const selectedProjectFromList = selectedProjectId

    ? projects.find((project) => project.id === selectedProjectId)

    : undefined;

  const selectedProject =

    selectedProjectFromList ??

    (selectedProjectId

      ? ({

          id: selectedProjectId,

          name: FOCUS_PROJECT_PLACEHOLDER_NAME,

        } satisfies BibliotecaProject)

      : undefined);

  const selectedAssets = selectedProjectId

    ? (assetsByProject[selectedProjectId] ?? [])

    : [];

  const showingFocusedProject = Boolean(selectedProjectId);

  const awaitingAuth = open && !authReady;

  const showInitialSkeleton = (loadingProjects || awaitingAuth) && !hasLoadedOnce;

  const loginRedirectUrl = buildBibliotecaStudioUrl({

    projectId: focusProjectId ?? undefined,

    assetId: focusAssetId ?? undefined,

  });



  return (

    <>

      <button

        type="button"

        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"

        aria-label="Cerrar biblioteca"

        onClick={onClose}

      />

      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-neutral-200 bg-white shadow-2xl">

        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">

          <div>

            {selectedProject ? (

              <button

                type="button"

                onClick={closeProject}

                className="mb-1 flex items-center gap-1 text-sm text-neutral-500 transition hover:text-neutral-800"

              >

                <svg

                  className="h-4 w-4"

                  fill="none"

                  viewBox="0 0 24 24"

                  stroke="currentColor"

                  strokeWidth={2}

                >

                  <path

                    strokeLinecap="round"

                    strokeLinejoin="round"

                    d="M15 19l-7-7 7-7"

                  />

                </svg>

                Volver

              </button>

            ) : null}

            <h2 className="text-lg font-bold text-neutral-900">Mi biblioteca</h2>

            <p className="text-sm text-neutral-500">

              Todo lo que has creado se guarda aquí automáticamente.

            </p>

          </div>

          <button

            type="button"

            onClick={onClose}

            className="rounded-full p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800"

            aria-label="Cerrar"

          >

            <svg

              className="h-5 w-5"

              fill="none"

              viewBox="0 0 24 24"

              stroke="currentColor"

              strokeWidth={2}

            >

              <path

                strokeLinecap="round"

                strokeLinejoin="round"

                d="M6 18L18 6M6 6l12 12"

              />

            </svg>

          </button>

        </div>



        <div className="flex-1 overflow-y-auto px-6 py-4">

          {showInitialSkeleton && (

            <div className="space-y-3">

              {[0, 1, 2].map((key) => (

                <div

                  key={key}

                  className="h-24 animate-pulse rounded-2xl bg-neutral-100"

                />

              ))}

            </div>

          )}



          {error && (

            <div className="space-y-3">

              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">

                {error}

              </p>

              {authReady && !authUser ? (

                <GoogleSignInButton

                  redirectTo={loginRedirectUrl}

                  label="Iniciar sesión"

                />

              ) : null}

            </div>

          )}



          {!showingFocusedProject &&

            !showInitialSkeleton &&

            !error &&

            projects.length === 0 && (

              <p className="text-sm text-neutral-500">

                Aún no tienes creaciones guardadas. Todo lo que generes en el

                estudio aparecerá aquí automáticamente.

              </p>

            )}



          {!showingFocusedProject && !showInitialSkeleton && !error && (

            <div className="space-y-3">

              {loadingProjects && hasLoadedOnce ? (

                <p className="text-xs text-neutral-400">Actualizando...</p>

              ) : null}

              {projects.map((project) => {

                const assets = assetsByProject[project.id] ?? [];

                const premiumThumb = getProjectThumbnail(assets);

                const originalThumb = getProjectOriginalThumbnail(assets);

                const hasTeaser = assets.some(assetHasTeaser);



                return (

                  <button

                    key={project.id}

                    type="button"

                    onClick={() => openProject(project.id)}

                    className="group flex w-full cursor-pointer items-center gap-4 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-3 text-left transition hover:border-violet-200 hover:bg-violet-50/40 hover:shadow-md active:scale-[0.99]"

                  >

                    <TransformationPipeline

                      originalUrl={originalThumb}

                      premiumUrl={premiumThumb}

                      hasTeaser={hasTeaser}

                    />

                    <div className="min-w-0 flex-1">

                      <p className="truncate font-semibold text-neutral-900">

                        {project.name}

                      </p>

                    </div>

                    <svg

                      className="h-4 w-4 shrink-0 text-neutral-300 transition group-hover:text-violet-400"

                      fill="none"

                      viewBox="0 0 24 24"

                      stroke="currentColor"

                      strokeWidth={2}

                    >

                      <path

                        strokeLinecap="round"

                        strokeLinejoin="round"

                        d="M9 5l7 7-7 7"

                      />

                    </svg>

                  </button>

                );

              })}

            </div>

          )}



          {selectedProject && (

            <div className="space-y-4">

              <div>

                <h3 className="text-base font-bold text-neutral-900">

                  {selectedProject.name}

                </h3>

                <p className="text-xs text-neutral-400">

                  {selectedAssets.length}{" "}

                  {selectedAssets.length === 1 ? "comercial" : "comerciales"}

                </p>

              </div>



              {loadingAssetsFor === selectedProject.id &&

                selectedAssets.length === 0 && (

                  <div className="space-y-3">

                    <div className="h-48 animate-pulse rounded-2xl bg-neutral-100" />

                    <div className="h-8 w-2/3 animate-pulse rounded-lg bg-neutral-100" />

                  </div>

                )}



              {selectedAssets.map((asset) => (

                <AssetDetailCard

                  key={asset.id}

                  asset={asset}

                  highlighted={highlightAssetId === asset.id}

                  onHighlightSeen={() => setHighlightAssetId(null)}

                />

              ))}



              {loadingAssetsFor !== selectedProject.id &&

                selectedAssets.length === 0 && (

                  <p className="text-sm text-neutral-500">

                    No hay creaciones en este proyecto todavía.

                  </p>

                )}

            </div>

          )}

        </div>

      </aside>

    </>

  );

}



function AssetDetailCard({

  asset,

  highlighted,

  onHighlightSeen,

}: {

  asset: BibliotecaAsset;

  highlighted?: boolean;

  onHighlightSeen?: () => void;

}) {

  const cardRef = useRef<HTMLDivElement>(null);

  const teaserRetryCountRef = useRef(0);

  const premiumRetryCountRef = useRef(0);

  const [teaserRetryKey, setTeaserRetryKey] = useState(0);

  const [premiumRetryKey, setPremiumRetryKey] = useState(0);

  const [teaserError, setTeaserError] = useState(false);

  const [premiumError, setPremiumError] = useState(false);

  const [downloading, setDownloading] = useState<string | null>(null);



  const status = getCommercialStatusLabel(asset);

  const originalUrl = asset.original_url ?? null;

  const enhancedUrl = asset.image_url ?? null;

  const hasOriginal = Boolean(originalUrl || asset.original_path);

  const hasEnhanced = Boolean(enhancedUrl || asset.image_path);

  const hasTeaser = assetHasTeaser(asset);

  const publicPreviewUrl = getPublicPreviewUrl(asset);

  const premiumOwned = isAssetPremiumOwned(asset);

  const teaserUrl = asset.teaser_video_path
    ? `/api/biblioteca/media?assetId=${asset.id}&type=teaser`
    : null;

  const premiumUrl = premiumOwned ? (asset.premium_video_url ?? null) : null;

  const hasPremium = Boolean(premiumUrl || asset.premium_video_path);

  const premiumLocked = !hasPremium && !premiumOwned;

  const showPremiumSection =
    hasPremium || premiumLocked || Boolean(asset.premium_video_path) || premiumOwned;



  useEffect(() => {

    teaserRetryCountRef.current = 0;

    premiumRetryCountRef.current = 0;

    setTeaserError(false);

    setPremiumError(false);

  }, [asset.id]);



  useEffect(() => {

    if (!highlighted || !cardRef.current) return;

    cardRef.current.scrollIntoView({ behavior: "smooth", block: "start" });

    onHighlightSeen?.();

  }, [highlighted, onHighlightSeen]);



  const handleTeaserError = useCallback(() => {

    if (teaserRetryCountRef.current >= 2) {

      setTeaserError(true);

      return;

    }

    teaserRetryCountRef.current += 1;

    setTeaserRetryKey((previous) => previous + 1);

  }, []);



  const handlePremiumError = useCallback(() => {

    if (premiumRetryCountRef.current >= 2) {

      setPremiumError(true);

      return;

    }

    premiumRetryCountRef.current += 1;

    setPremiumRetryKey((previous) => previous + 1);

  }, []);



  const retryTeaser = useCallback(() => {

    setTeaserError(false);

    teaserRetryCountRef.current = 0;

    setTeaserRetryKey((previous) => previous + 1);

  }, []);



  const retryPremium = useCallback(() => {

    setPremiumError(false);

    premiumRetryCountRef.current = 0;

    setPremiumRetryKey((previous) => previous + 1);

  }, []);



  const handleDownload = async (

    url: string | null,

    filename: string,

    key: string,

  ) => {

    if (!url) return;

    setDownloading(key);

    try {

      await downloadFromUrl(url, filename);

    } catch {

      window.open(url, "_blank", "noopener,noreferrer");

    } finally {

      setDownloading(null);

    }

  };



  return (

    <div

      ref={cardRef}

      className={`overflow-hidden rounded-2xl border bg-white transition ${

        highlighted

          ? "border-violet-300 ring-2 ring-violet-100"

          : "border-neutral-200"

      }`}

    >

      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-2.5">

        <span

          className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${

            status.tone === "paid"

              ? "bg-violet-100 text-violet-800"

              : status.tone === "pending"

                ? "bg-amber-100 text-amber-800"

                : "bg-neutral-100 text-neutral-600"

          }`}

        >

          {status.label}

        </span>

        {asset.created_at && (

          <span className="text-[10px] text-neutral-400">

            {new Intl.DateTimeFormat("es-MX", {

              day: "numeric",

              month: "short",

            }).format(new Date(asset.created_at))}

          </span>

        )}

      </div>



      <div className="space-y-0 bg-neutral-50 px-3 py-4">

        {hasOriginal && (

          <TimelineStage label="Foto original">

            {originalUrl ? (

              // eslint-disable-next-line @next/next/no-img-element

              <img

                src={originalUrl}

                alt="Foto original"

                className="aspect-square w-full rounded-xl border border-neutral-200 object-cover shadow-sm"

              />

            ) : (

              <StagePlaceholder message="Cargando foto original..." />

            )}

          </TimelineStage>

        )}



        {hasOriginal && hasEnhanced && <TimelineArrow />}



        {hasEnhanced && (

          <TimelineStage label="Escena premium" featured>

            {enhancedUrl ? (

              // eslint-disable-next-line @next/next/no-img-element

              <img

                src={enhancedUrl}

                alt="Escena comercial premium"

                className="aspect-square w-full rounded-xl border border-violet-100 object-cover shadow-md"

              />

            ) : (

              <StagePlaceholder message="Cargando escena..." />

            )}

          </TimelineStage>

        )}



        {(hasEnhanced || hasOriginal) && (hasTeaser || asset.teaser_video_path) && (

          <TimelineArrow />

        )}



        {(hasTeaser || asset.teaser_video_path) && (

          <TimelineStage label="Avance gratis" featured>

            <div className="relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-neutral-900 shadow-md">

              {teaserUrl && !teaserError ? (

                <video

                  key={`${teaserUrl}-${teaserRetryKey}`}

                  src={teaserUrl}

                  controls

                  playsInline

                  preload="metadata"

                  className="h-full w-full object-cover"

                  onError={handleTeaserError}

                />

              ) : (

                <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">

                  {teaserError ? (

                    <>

                      <p className="text-sm text-white/70">

                        No pudimos cargar el avance.

                      </p>

                      {asset.teaser_video_path && (

                        <button

                          type="button"

                          onClick={() => retryTeaser()}

                          className="cursor-pointer rounded-lg bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20"

                        >

                          Reintentar

                        </button>

                      )}

                    </>

                  ) : teaserUrl ? (

                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />

                  ) : (

                    <p className="text-sm text-white/50">

                      El avance se generará al crear tu comercial.

                    </p>

                  )}

                </div>

              )}

            </div>

          </TimelineStage>

        )}



        {hasTeaser && showPremiumSection && (

          <TimelineArrow />

        )}



        {showPremiumSection && (

          <TimelineStage

            label="Comercial HD"

            featured={hasPremium}

          >

            <div className="relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-neutral-900 shadow-md">

              {premiumUrl && !premiumError ? (

                <video

                  key={`${premiumUrl}-${premiumRetryKey}`}

                  src={premiumUrl}

                  controls

                  playsInline

                  preload="metadata"

                  className="h-full w-full object-cover"

                  onError={handlePremiumError}

                />

              ) : (

                <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">

                  {premiumError ? (

                    <>

                      <p className="text-sm text-white/70">

                        No pudimos cargar el comercial HD.

                      </p>

                      {asset.premium_video_path && premiumOwned && (

                        <button

                          type="button"

                          onClick={() => retryPremium()}

                          className="cursor-pointer rounded-lg bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20"

                        >

                          Reintentar

                        </button>

                      )}

                    </>

                  ) : premiumUrl ? (

                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />

                  ) : (

                    <p className="text-sm text-white/50">

                      {premiumOwned

                        ? "Tu comercial HD estará disponible pronto."

                        : "Compra HD en el estudio para desbloquear."}

                    </p>

                  )}

                </div>

              )}

            </div>

          </TimelineStage>

        )}

      </div>



      <div className="flex flex-wrap gap-2 px-3 py-3">

        {publicPreviewUrl && asset.share_slug && hasTeaser && (

          <ShareCommercialActions

            publicPreviewUrl={publicPreviewUrl}

            shareSlug={asset.share_slug}

            variant="compact"

          />

        )}

        {premiumUrl && (

          <button

            type="button"

            disabled={downloading === "premium"}

            onClick={() =>

              void handleDownload(

                premiumUrl,

                `metaprom-${asset.id}-comercial-hd.mp4`,

                "premium",

              )

            }

            className="flex-1 cursor-pointer rounded-lg bg-violet-600 py-2 text-center text-xs font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"

          >

            {downloading === "premium" ? "Descargando..." : "Comercial HD"}

          </button>

        )}

        {(enhancedUrl || originalUrl) && (

          <button

            type="button"

            disabled={downloading === "image"}

            onClick={() =>

              void handleDownload(

                enhancedUrl ?? originalUrl,

                `metaprom-${asset.id}-imagen.jpg`,

                "image",

              )

            }

            className="flex-1 cursor-pointer rounded-lg border border-neutral-200 py-2 text-center text-xs font-semibold text-neutral-600 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"

          >

            {downloading === "image" ? "Descargando..." : "Imagen"}

          </button>

        )}

      </div>

    </div>

  );

}



function TimelineStage({

  label,

  featured = false,

  children,

}: {

  label: string;

  featured?: boolean;

  children: ReactNode;

}) {

  return (

    <div className={featured ? "px-1" : "px-2"}>

      <p

        className={`mb-2 font-semibold ${featured ? "text-sm text-neutral-900" : "text-xs text-neutral-700"}`}

      >

        {label}

      </p>

      {children}

    </div>

  );

}



function StagePlaceholder({ message }: { message: string }) {

  return (

    <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-white px-3 text-center text-xs text-neutral-400">

      {message}

    </div>

  );

}


