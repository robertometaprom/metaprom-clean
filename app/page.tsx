"use client";

import { useState } from "react";

import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Pricing from "@/components/Pricing";
import DashboardPreview from "@/components/DashboardPreview";
import Transformation from "@/components/Transformation";
import PhotoEnhancement from "@/components/PhotoEnhancement";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) {
      alert("Select an image first");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/enhancement", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.image) {
        setResult(data.image);
      } else {
        alert(data.error || "No image returned");
      }

    } catch (error) {
      console.error(error);
      alert("Enhancement failed");
    }

    setLoading(false);
  };

  return (
    <>
      <Navbar />

      <main className="relative min-h-screen overflow-hidden bg-black text-white">

        {/* BACKGROUND GLOW */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-[-220px] h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-purple-600/20 blur-3xl" />
        </div>

        <Hero />

        <Pricing />

        <DashboardPreview />

        <Transformation />

        <PhotoEnhancement />

        {/* LIVE AI DEMO */}

        <section className="relative z-10 mx-auto flex max-w-6xl flex-col items-center gap-10 px-6 py-32 text-center">

          <div className="space-y-6">
            <p className="text-sm uppercase tracking-[0.35em] text-purple-400">
              LIVE AI PROPERTY ENHANCEMENT
            </p>

            <h2 className="text-5xl font-bold md:text-7xl">
              Try Metaprom AI
            </h2>

            <p className="mx-auto max-w-3xl text-lg text-white/70 md:text-xl">
              Upload a real property photo and instantly transform it into a premium marketing-ready visual powered by AI.
            </p>
          </div>

          <div className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-white/5 p-10 backdrop-blur-xl">

            <div className="flex flex-col items-center gap-6">

              <label className="cursor-pointer rounded-2xl border border-white/20 bg-white/10 px-8 py-5 text-lg transition hover:bg-white/20">
                Select Property Photo

                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setFile(e.target.files[0]);
                    }
                  }}
                />
              </label>

              {file && (
                <p className="text-sm text-white/60">
                  {file.name}
                </p>
              )}

              <button
                onClick={handleUpload}
                disabled={loading}
                className="rounded-2xl bg-white px-10 py-5 text-lg font-semibold text-black transition hover:scale-105 disabled:opacity-50"
              >
                {loading ? "Enhancing with AI..." : "Enhance with AI"}
              </button>

            </div>
          </div>

          {result && (
            <div className="grid w-full max-w-6xl gap-10 md:grid-cols-2">

              {/* BEFORE */}

              <div className="space-y-4">
                <p className="text-sm uppercase tracking-[0.3em] text-white/40">
                  Before
                </p>

                <div className="overflow-hidden rounded-[28px] border border-white/10">
                  <img
                    src={URL.createObjectURL(file!)}
                    alt="Original"
                    className="w-full"
                  />
                </div>
              </div>

              {/* AFTER */}

              <div className="space-y-4">
                <p className="text-sm uppercase tracking-[0.3em] text-purple-400">
                  AI Enhanced
                </p>

                <div className="overflow-hidden rounded-[28px] border border-purple-500/20">
                  <img
                    src={result}
                    alt="Enhanced"
                    className="w-full"
                  />
                </div>
              </div>

            </div>
          )}

        </section>

      </main>
    </>
  );
}