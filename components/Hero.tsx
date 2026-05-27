"use client";

import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-16 px-6 pt-32 lg:grid-cols-2">

      {/* LEFT */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >

        <div className="mb-6 inline-flex rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-2 text-sm text-purple-300">
          Your AI copilot for campaigns
        </div>

        <h1 className="text-7xl font-bold leading-none tracking-tight">

          Create ads
          <br />
          that sell.
          <br />

          <span className="bg-gradient-to-r from-purple-300 to-purple-600 bg-clip-text text-transparent">
            10x faster.
          </span>

        </h1>

        <p className="mt-8 max-w-2xl text-xl leading-9 text-white/70">
          Generate ad copies, AI images and viral videos
          ready for Instagram, TikTok and Facebook.
        </p>

        {/* INPUT */}
        <div className="mt-10 rounded-3xl border border-purple-500/20 bg-white/5 p-3 backdrop-blur-xl">

          <div className="flex flex-col gap-3 md:flex-row">

            <input
              placeholder="Describe your product..."
              className="flex-1 bg-transparent px-4 py-4 text-white outline-none placeholder:text-white/30"
            />

            <button className="rounded-2xl bg-purple-600 px-8 py-4 font-medium transition hover:bg-purple-500">
              Generate ✨
            </button>

          </div>

        </div>

        <div className="mt-6 flex gap-6 text-sm text-white/50">
          <span>No credit card</span>
          <span>Results in seconds</span>
          <span>AI-powered</span>
        </div>

      </motion.div>

      {/* RIGHT SIDE */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="relative flex items-center justify-center"
      >

        {/* Main Glow */}
        <div className="
          absolute
          h-[700px]
          w-[700px]
          rounded-full
          bg-purple-600/20
          blur-3xl
        " />

        {/* Secondary Glow */}
        <div className="
          absolute
          h-[500px]
          w-[500px]
          rounded-full
          bg-cyan-500/10
          blur-3xl
        " />

        {/* Background Logo Atmosphere */}
        <img
          src="/logo.png"
          alt="Metaprom AI"
          className="
            absolute
            w-[900px]
            max-w-none
            opacity-[0.08]
            blur-[2px]
            object-contain
          "
        />

        {/* Main Foreground Logo */}
        <img
          src="/logo.png"
          alt="Metaprom AI"
          className="
            relative
            z-10
            w-[520px]
            object-contain
            drop-shadow-[0_0_90px_rgba(168,85,247,0.55)]
          "
        />

      </motion.div>

    </section>
  );
}