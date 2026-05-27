"use client";

import { motion } from "framer-motion";

export default function DashboardPreview() {
  return (
    <section
      id="dashboard"
      className="relative overflow-hidden px-6 py-32"
    >

      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden">

        <div className="
          absolute
          left-1/2
          top-1/2
          h-[900px]
          w-[900px]
          -translate-x-1/2
          -translate-y-1/2
          rounded-full
          bg-cyan-500/10
          blur-3xl
        " />

      </div>

      <div className="relative z-10 mx-auto max-w-7xl">

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="text-center"
        >

          <div className="
            mb-6
            inline-flex
            rounded-full
            border
            border-cyan-500/20
            bg-cyan-500/10
            px-4
            py-2
            text-sm
            text-cyan-300
          ">
            AI Dashboard
          </div>

          <h2 className="
            text-6xl
            font-bold
            tracking-tight
            text-white
          ">
            Your campaigns.
            <br />

            <span className="
              bg-gradient-to-r
              from-cyan-300
              to-purple-400
              bg-clip-text
              text-transparent
            ">
              Supercharged by AI.
            </span>

          </h2>

        </motion.div>

        {/* GRID */}
        <div className="
          mt-24
          grid
          gap-8
          lg:grid-cols-3
        ">

          {/* LEFT LARGE PANEL */}
          <motion.div
            whileHover={{ y: -8 }}
            className="
              lg:col-span-2
              rounded-3xl
              border
              border-white/10
              bg-white/5
              p-8
              backdrop-blur-2xl
            "
          >

            <div className="flex items-center justify-between">

              <div>
                <div className="text-white text-2xl font-semibold">
                  AI Campaign Generator
                </div>

                <div className="mt-2 text-white/50">
                  Generating high-converting ad campaigns
                </div>

              </div>

              <div className="
                rounded-full
                bg-green-500/20
                px-4
                py-2
                text-sm
                text-green-300
              ">
                LIVE
              </div>

            </div>

            {/* Fake AI Output */}
            <div className="
              mt-10
              rounded-3xl
              border
              border-white/10
              bg-black/40
              p-6
            ">

              <div className="text-white/40 text-sm">
                GENERATED COPY
              </div>

              <div className="
                mt-4
                text-2xl
                leading-10
                text-white/90
              ">
                “Transform your brand into a viral machine
                with AI-powered campaigns that convert faster
                and scale effortlessly.”
              </div>

            </div>

            {/* Stats */}
            <div className="
              mt-8
              grid
              gap-6
              md:grid-cols-3
            ">

              <div className="
                rounded-2xl
                border
                border-white/10
                bg-white/5
                p-6
              ">

                <div className="text-white/40 text-sm">
                  Conversion Rate
                </div>

                <div className="mt-3 text-4xl font-bold text-white">
                  +48%
                </div>

              </div>

              <div className="
                rounded-2xl
                border
                border-white/10
                bg-white/5
                p-6
              ">

                <div className="text-white/40 text-sm">
                  Viral Score
                </div>

                <div className="mt-3 text-4xl font-bold text-cyan-300">
                  92
                </div>

              </div>

              <div className="
                rounded-2xl
                border
                border-white/10
                bg-white/5
                p-6
              ">

                <div className="text-white/40 text-sm">
                  AI Optimization
                </div>

                <div className="mt-3 text-4xl font-bold text-purple-300">
                  ON
                </div>

              </div>

            </div>

          </motion.div>

          {/* VIDEO CARD */}
          <motion.div
            whileHover={{ y: -8 }}
            className="
              overflow-hidden
              rounded-3xl
              border
              border-white/10
              bg-white/5
              backdrop-blur-2xl
            "
          >

            {/* Video */}
            <div className="relative aspect-[9/16] bg-black">

              <video
                autoPlay
                muted
                loop
                playsInline
                className="h-full w-full object-cover"
              >
                <source src="/demo-reel.mp4" type="video/mp4" />
              </video>

              {/* Overlay */}
              <div className="
                absolute
                inset-0
                bg-gradient-to-t
                from-black
                via-black/10
                to-transparent
              " />

              {/* Badge */}
              <div className="
                absolute
                left-4
                top-4
                rounded-full
                bg-red-500
                px-3
                py-1
                text-xs
                font-medium
                text-white
              ">
                AI REEL
              </div>

            </div>

            {/* Bottom Info */}
            <div className="p-6">

              <div className="text-white text-xl font-semibold">
                Viral TikTok Campaign
              </div>

              <div className="mt-3 text-white/50 leading-7">
                AI-generated vertical video optimized for
                TikTok, Instagram Reels and Shorts.
              </div>

            </div>

          </motion.div>

        </div>

      </div>

    </section>
  );
}