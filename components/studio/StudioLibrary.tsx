"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchBibliotecaAssets,
  fetchBibliotecaProjects,
  type BibliotecaAsset,
  type BibliotecaProject,
  BibliotecaAuthError,
} from "@/lib/biblioteca";

type StudioLibraryProps = {
  open: boolean;
  onClose: () => void;
};

export default function StudioLibrary({ open, onClose }: StudioLibraryProps) {
  const [projects, setProjects] = useState<BibliotecaProject[]>([]);
  const [assetsByProject, setAssetsByProject] = useState<
    Record<string, BibliotecaAsset[]>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(
    null,
  );

  const loadLibrary = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const projectList = await fetchBibliotecaProjects();
      setProjects(projectList);

      const assetEntries = await Promise.all(
        projectList.map(async (project) => {
          const assets = await fetchBibliotecaAssets(project.id);
          return [project.id, assets] as const;
        }),
      );

      setAssetsByProject(Object.fromEntries(assetEntries));
    } catch (loadError) {
      if (loadError instanceof BibliotecaAuthError) {
        setError("Inicia sesión para ver tu biblioteca.");
      } else {
        setError("No pudimos cargar tu biblioteca.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void loadLibrary();
    }
  }, [open, loadLibrary]);

  if (!open) return null;

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
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <p className="text-sm text-neutral-500">Cargando...</p>
          )}

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          )}

          {!loading && !error && projects.length === 0 && (
            <p className="text-sm text-neutral-500">
              Aún no tienes creaciones guardadas. Todo lo que generes en el
              estudio aparecerá aquí automáticamente.
            </p>
          )}

          <div className="space-y-4">
            {projects.map((project) => {
              const assets = assetsByProject[project.id] ?? [];
              const isExpanded = expandedProjectId === project.id;

              return (
                <div
                  key={project.id}
                  className="overflow-hidden rounded-2xl border border-neutral-200"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedProjectId(isExpanded ? null : project.id)
                    }
                    className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-neutral-50"
                  >
                    <div>
                      <p className="font-semibold text-neutral-900">
                        {project.name}
                      </p>
                      <p className="text-xs text-neutral-400">
                        {assets.length}{" "}
                        {assets.length === 1 ? "creación" : "creaciones"}
                      </p>
                    </div>
                    <svg
                      className={`h-4 w-4 text-neutral-400 transition ${isExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="space-y-3 border-t border-neutral-100 bg-neutral-50/50 p-4">
                      {assets.map((asset) => (
                        <div
                          key={asset.id}
                          className="overflow-hidden rounded-xl border border-neutral-200 bg-white"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={asset.image_url}
                            alt={asset.original_name ?? "Creación"}
                            className="aspect-square w-full object-cover"
                          />
                          {asset.video_url && (
                            <video
                              src={asset.video_url}
                              controls
                              playsInline
                              className="aspect-[9/16] w-full object-cover"
                            />
                          )}
                          <div className="flex gap-2 px-3 py-2">
                            <a
                              href={asset.image_url}
                              download={`metaprom-${asset.id}.jpg`}
                              className="flex-1 rounded-lg bg-neutral-900 py-2 text-center text-xs font-semibold text-white transition hover:bg-neutral-800"
                            >
                              Descargar imagen
                            </a>
                            {asset.video_url && (
                              <a
                                href={asset.video_url}
                                download={`metaprom-${asset.id}.mp4`}
                                className="flex-1 rounded-lg border border-neutral-200 py-2 text-center text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
                              >
                                Descargar video
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
}
