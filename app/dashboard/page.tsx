"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import type { Mode } from "../../lib/prompts";
import {
  fetchBibliotecaProjects,
  createBibliotecaProject,
  fetchBibliotecaAssets,
  saveBibliotecaAssets,
  type BibliotecaAsset,
  type BibliotecaProject,
} from "../../lib/biblioteca";

export default function Page() {
  const [selectedMode, setSelectedMode] = useState<Mode>("amazon");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [enhancedImages, setEnhancedImages] = useState<string[]>([]);
  const [aiInstructions, setAiInstructions] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [projects, setProjects] = useState<BibliotecaProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectAssets, setProjectAssets] = useState<BibliotecaAsset[]>([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [savingAssets, setSavingAssets] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [projectLoading, setProjectLoading] = useState(false);
  const previewUrlsRef = useRef<string[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    previewUrlsRef.current = previewUrls;
  }, [previewUrls]);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    loadProjects();
  }, []);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(event.target.files ?? []);
    if (newFiles.length === 0) return;

    const newPreviewUrls = newFiles.map((file) => URL.createObjectURL(file));
    setSelectedFiles((prev) => [...prev, ...newFiles]);
    setEnhancedImages([]);
    setPreviewUrls((prev) => [...prev, ...newPreviewUrls]);
    event.target.value = "";
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== index));
    setPreviewUrls((prev) => {
      const removedUrl = prev[index];
      if (removedUrl) {
        URL.revokeObjectURL(removedUrl);
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const clearAll = () => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    setSelectedFiles([]);
    setPreviewUrls([]);
    setCompletedCount(0);
    setElapsedTime(0);
    setCurrentFileName(null);
  };

  const loadProjects = async () => {
    try {
      setProjectLoading(true);
      const projects = await fetchBibliotecaProjects();
      setProjects(projects);
      if (projects.length > 0) {
        const projectId = projects[0].id;
        setSelectedProjectId(projectId);
        await loadProjectAssets(projectId);
      }
    } catch (error) {
      console.error(error);
      setProjectError("Unable to load Biblioteca projects.");
    } finally {
      setProjectLoading(false);
    }
  };

  const loadProjectAssets = async (projectId: string) => {
    try {
      setProjectLoading(true);
      const assets = await fetchBibliotecaAssets(projectId);
      setProjectAssets(assets);
    } catch (error) {
      console.error(error);
      setProjectError("Unable to load assets for the selected project.");
    } finally {
      setProjectLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      setProjectError("Project name cannot be empty.");
      return;
    }

    try {
      setProjectLoading(true);
      const project = await createBibliotecaProject(newProjectName.trim(), newProjectDescription.trim());
      setProjects((prev) => [project, ...prev]);
      setSelectedProjectId(project.id);
      setNewProjectName("");
      setNewProjectDescription("");
      setProjectError(null);
      setProjectAssets([]);
    } catch (error) {
      console.error(error);
      setProjectError("Unable to create project.");
    } finally {
      setProjectLoading(false);
    }
  };

  const handleProjectChange = async (projectId: string) => {
    setSelectedProjectId(projectId);
    await loadProjectAssets(projectId);
  };

  const handleGenerate = async () => {
    if (selectedFiles.length === 0) return;

    try {
      setLoading(true);
      setEnhancedImages([]);
      setCompletedCount(0);
      setElapsedTime(0);
      setCurrentFileName(null);

      const startTime = Date.now();
      timerRef.current = window.setInterval(() => {
        setElapsedTime(Math.round((Date.now() - startTime) / 1000));
      }, 1000);

      const generatedImages: { file: File; image: string }[] = [];

      for (const file of selectedFiles) {
        setCurrentFileName(file.name);
        const formData = new FormData();
        formData.append("image", file);
        formData.append("mode", selectedMode);
        formData.append("aiInstructions", aiInstructions);

        const response = await fetch("/api/enhancement", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (data.image) {
          generatedImages.push({ file, image: data.image });
          setEnhancedImages((prev) => [...prev, data.image]);
        } else {
          alert(data.error || "Enhancement failed");
        }

        setCompletedCount((prev) => prev + 1);
      }

      if (selectedProjectId && generatedImages.length > 0) {
        const savePayload = generatedImages.map(({ file, image }) => ({
          project_id: selectedProjectId,
          original_name: file.name,
          image_url: image,
          mode: selectedMode,
          ai_instructions: aiInstructions,
        }));

        try {
          setSavingAssets(true);
          await saveBibliotecaAssets(savePayload);
          if (selectedProjectId) {
            const refreshedAssets = await fetchBibliotecaAssets(selectedProjectId);
            setProjectAssets(refreshedAssets);
          }
        } catch (saveError) {
          console.error(saveError);
          alert("Unable to save assets to Biblioteca.");
        } finally {
          setSavingAssets(false);
        }
      }

      setCurrentFileName(null);
    } catch (error) {
      console.error(error);
      alert("Error enhancing image");
    } finally {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const platforms = [
    {
      id: "amazon",
      name: "Amazon",
      icon: (
        <img
          src="/logos/amazon-white.svg"
          alt="Amazon logo"
          className="h-16 w-16 object-contain"
        />
      ),
    },
    {
      id: "mercado-libre",
      name: "Mercado Libre",
      icon: (
        <svg className="h-16 w-16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          {/* Mercado Libre sun with smile */}
          <circle cx="12" cy="10" r="6" fill="currentColor"/>
          <circle cx="8" cy="8" r="1.2" fill="white"/>
          <circle cx="16" cy="8" r="1.2" fill="white"/>
          <path d="M9 12C9.5 13 10.5 13.5 12 13.5C13.5 13.5 14.5 13 15 12" stroke="white" strokeWidth="1" strokeLinecap="round"/>
          <path d="M12 3V1M12 19V21M21 10H23M1 10H3M19.5 3.5L21 2M5 18L3.5 19.5M19.5 16.5L21 18M5 2L3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      id: "premium",
      name: "Shopify",
      icon: (
        <svg className="h-16 w-16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          {/* Shopify bag */}
          <path d="M8 3C8 2.45 8.45 2 9 2H15C15.55 2 16 2.45 16 3V5H8V3Z" fill="currentColor"/>
          <path d="M7 5H17C17.55 5 18 5.45 18 6V19C18 20.1 17.1 21 16 21H8C6.9 21 6 20.1 6 19V6C6 5.45 6.45 5 7 5Z" fill="currentColor" opacity="0.9"/>
          <line x1="10" y1="9" x2="10" y2="17" stroke="white" strokeWidth="1.2" opacity="0.6"/>
          <line x1="12" y1="9" x2="12" y2="17" stroke="white" strokeWidth="1.2" opacity="0.6"/>
          <line x1="14" y1="9" x2="14" y2="17" stroke="white" strokeWidth="1.2" opacity="0.6"/>
        </svg>
      ),
    },
    {
      id: "social",
      name: "Instagram",
      icon: (
        <svg className="h-16 w-16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Instagram rounded square */}
          <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="2"/>
          <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="2"/>
          <circle cx="17" cy="7" r="1.5" fill="currentColor"/>
        </svg>
      ),
    },
    {
      id: "custom",
      name: "Custom",
      icon: (
        <svg className="h-16 w-16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Globe */}
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M2 12H22" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M12 2C14.5 5 16 8 16 12C16 16 14.5 19 12 22" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M12 2C9.5 5 8 8 8 12C8 16 9.5 19 12 22" stroke="currentColor" strokeWidth="1.5"/>
          <ellipse cx="12" cy="12" rx="10" ry="3" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-220px] h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-purple-600/20 blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="mx-auto max-w-6xl px-6 pt-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl font-bold tracking-tight">
              Metaprom AI Dashboard
            </h1>
            <p className="mt-2 text-white/60">Manage your photo enhancement credits</p>
          </motion.div>
        </div>

        {/* Credits Card */}
        <div className="mx-auto max-w-6xl px-6 py-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/10 to-cyan-500/10 p-8 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-widest text-purple-400">
                  Beta Credits
                </p>
                <p className="mt-2 text-5xl font-bold">20</p>
                <p className="mt-1 text-white/60">Credits remaining</p>
              </div>
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-cyan-500">
                <span className="text-4xl font-bold">✨</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Biblioteca */}
        <div className="mx-auto max-w-6xl px-6 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl"
          >
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-widest text-purple-400">
                  Biblioteca V1
                </p>
                <h2 className="mt-2 text-3xl font-bold text-white">Manage your projects and saved assets</h2>
              </div>
              <div className="space-y-2 text-right text-sm text-white/70 md:text-right">
                <p>{projects.length} projects loaded</p>
                <p>{projectAssets.length} assets in selected project</p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[0.9fr_0.7fr]">
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-white">Select project</label>
                    <select
                      value={selectedProjectId ?? ""}
                      onChange={(event) => handleProjectChange(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white"
                    >
                      <option value="" disabled>
                        {projectLoading ? "Loading projects..." : "Choose a project"}
                      </option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-white">New project</label>
                    <div className="grid gap-3">
                      <input
                        value={newProjectName}
                        onChange={(event) => setNewProjectName(event.target.value)}
                        placeholder="Project name"
                        className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white"
                      />
                      <input
                        value={newProjectDescription}
                        onChange={(event) => setNewProjectDescription(event.target.value)}
                        placeholder="Description (optional)"
                        className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white"
                      />
                      <button
                        type="button"
                        onClick={handleCreateProject}
                        disabled={projectLoading || !newProjectName.trim()}
                        className="rounded-2xl bg-purple-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {projectLoading ? "Creating..." : "Create project"}
                      </button>
                    </div>
                  </div>
                </div>

                {projectError && (
                  <p className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {projectError}
                  </p>
                )}

                <div className="rounded-3xl border border-white/10 bg-black/40 p-4">
                  {selectedProjectId ? (
                    <div>
                      <p className="mb-3 text-sm font-semibold text-white">Project preview</p>
                      {projectAssets.length > 0 ? (
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {projectAssets.map((asset) => (
                            <div key={asset.id} className="overflow-hidden rounded-3xl border border-white/10 bg-black/50">
                              <img
                                src={asset.image_url}
                                alt={asset.original_name ?? "Saved asset"}
                                className="h-48 w-full object-cover"
                              />
                              <div className="space-y-1 p-3 text-sm text-white/70">
                                <p className="font-semibold text-white">{asset.original_name ?? "Asset"}</p>
                                <p>{asset.mode}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-white/50">
                          No saved assets yet. Generate images and they will be saved to the selected project.
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-white/50">Create or select a project to start saving assets to Biblioteca.</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Platform Selector */}
        <div className="mx-auto max-w-6xl px-6 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <h2 className="mb-6 text-3xl font-bold">Where will you sell?</h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {platforms.map((platform) => (
                <motion.button
                  key={platform.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedMode(platform.id as Mode)}
                  className={`group relative overflow-hidden rounded-2xl border px-6 py-8 text-center transition-all duration-300 ${
                    selectedMode === platform.id
                      ? "border-purple-500 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 shadow-lg shadow-purple-500/20"
                      : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                  }`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className={`text-white transition-colors ${selectedMode === platform.id ? "text-purple-400" : "group-hover:text-cyan-400"}`}>
                      {platform.icon}
                    </div>
                    <p className="text-sm font-semibold">{platform.name}</p>
                  </div>

                  {/* Selection Indicator */}
                  {selectedMode === platform.id && (
                    <motion.div
                      layoutId="selectedMode"
                      className="absolute inset-0 rounded-2xl border-2 border-purple-400"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Upload Section */}
        <div className="mx-auto max-w-6xl px-6 py-8 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <h2 className="mb-2 text-3xl font-bold">Upload Product Photo</h2>
            <p className="mb-6 text-white/60">Upload functionality will be connected in the next step.</p>

            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/10 to-cyan-500/10 p-12 backdrop-blur-xl">
              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="flex flex-col justify-between gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label
                        htmlFor="file-upload"
                        className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
                      >
                        Add Images
                      </label>
                      <input
                        id="file-upload"
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileChange}
                        className="sr-only"
                      />
                    </div>

                    <div className="space-y-2">
                      <p className="text-lg font-semibold text-white">Upload Product Photo</p>
                      <p className="text-sm text-white/60">
                        Pick a photo from your computer and preview it before generating.
                      </p>
                      {selectedFiles.length > 0 ? (
                        <p className="truncate text-sm text-white/80">
                          Selected images: <span className="font-medium text-white">{selectedFiles.length}</span>
                        </p>
                      ) : (
                        <p className="text-sm text-white/50">No file selected yet.</p>
                      )}
                    <div className="mt-3">
                      <p className="mb-2 text-sm font-semibold text-white">Selected Mode</p>
                      <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white">
                        Selected Mode: <span className="font-semibold text-white">
                          {platforms.find((option) => option.id === selectedMode)?.name ?? "Amazon"}
                        </span>
                      </p>

                      <label className="mt-4 mb-2 block text-sm font-semibold text-white">AI Instructions</label>
                      <textarea
                        value={aiInstructions}
                        onChange={(e) => setAiInstructions(e.target.value)}
                        placeholder={
                          selectedMode === "custom"
                            ? `Describe exactly what you want...\n\nExamples:\n* Create a luxury product advertisement\n* Place the product in a modern kitchen\n* Create a Christmas campaign image\n* Create a Black Friday promotion\n* Create a 3D product render\n* Create a cinematic commercial image`
                            : "Additional instructions (optional)"
                        }
                        className="mt-1 h-24 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40"
                      />
                    </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      disabled={
                        selectedFiles.length === 0 ||
                        loading ||
                        (selectedMode === "custom" && aiInstructions.trim().length === 0)
                      }
                      onClick={handleGenerate}
                      className={`rounded-2xl px-6 py-3 text-sm font-semibold transition ${
                        selectedFiles.length > 0 && !loading
                          ? "bg-purple-500 text-white hover:bg-purple-400"
                          : "cursor-not-allowed bg-white/10 text-white/40"
                      }`}
                    >
                      {loading ? "Generating..." : "Generate"}
                    </button>
                    <button
                      type="button"
                      disabled={selectedFiles.length === 0 || loading}
                      onClick={clearAll}
                      className={`rounded-2xl border px-6 py-3 text-sm font-semibold transition ${
                        selectedFiles.length > 0 && !loading
                          ? "border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10"
                          : "cursor-not-allowed border-white/10 bg-white/5 text-white/40"
                      }`}
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm text-white/70">
                      <span>
                        {completedCount}/{selectedFiles.length} completed
                      </span>
                      <span>
                        {currentFileName
                          ? `Processing: ${currentFileName}`
                          : loading
                          ? "Finalizing..."
                          : "Ready"}
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-purple-500 transition-all"
                        style={{
                          width: `${selectedFiles.length ? (completedCount / selectedFiles.length) * 100 : 0}%`,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-white/50">
                      <span>Elapsed: {formatTime(elapsedTime)}</span>
                      <span>
                        Remaining: {completedCount === 0
                          ? "--"
                          : formatTime(
                              Math.max(
                                0,
                                Math.round(
                                  (elapsedTime / completedCount) *
                                    (selectedFiles.length - completedCount),
                                ),
                              ),
                            )}
                      </span>
                    </div>
                  </div>
                )}

                <div className="rounded-3xl border border-white/10 bg-white/5 p-3">
                  {previewUrls.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {previewUrls.map((url, index) => (
                        <div key={index} className="relative overflow-hidden rounded-3xl">
                          <img
                            src={url}
                            alt={`Selected preview ${index + 1}`}
                            className="h-40 w-full rounded-3xl object-cover bg-black/30"
                          />
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-sm text-white transition hover:bg-black/80"
                          >
                            <span className="sr-only">Remove image {index + 1}</span>
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-64 items-center justify-center rounded-3xl border border-dashed border-white/10 bg-black/20 px-4 text-center text-sm text-white/50">
                      Image preview will appear here once you select a file.
                    </div>
                  )}
                </div>
              </div>
              {enhancedImages.length > 0 && (
                <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
                  <p className="mb-4 text-sm uppercase tracking-[0.2em] text-purple-400">
                    Enhanced results
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {enhancedImages.map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Enhanced result ${index + 1}`}
                        className="w-full rounded-3xl object-contain bg-black/20"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}