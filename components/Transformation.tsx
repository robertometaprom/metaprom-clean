"use client";

import { motion } from "framer-motion";

export default function Transformation() {
  return (
    <section className="relative overflow-hidden px-6 py-32">

      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden">

        <div className="
          absolute
          left-1/2
          top-1/2
          h-[800px]
          w-[800px]
          -translate-x-1/2
          -translate-y-1/2
          rounded-full
          bg-purple-600/10
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
            Before / After Reels
          </div>

          <h2 className="
            text-6xl
            font-bold
            tracking-tight
            text-white
          ">
            Turn average footage
            <br />

            <span className="
              bg-gradient-to-r
              from-cyan-300
              to-purple-400
              bg-clip-text
              text-transparent
            ">
              into premium campaigns.
            </span>

          </h2>

          <p className="
            mx-auto
            mt-8
            max-w-3xl
            text-xl
            leading-8
            text-white/60
          ">
            Shoot with your phone.
            Metaprom AI enhances your existing reels into
            cinematic marketing content optimized for social media.
          </p>

        </motion.div>

        {/* BEFORE AFTER */}
        <div className="
          mt-24
          grid
          gap-10
          lg:grid-cols-2
        ">

          {/* BEFORE */}
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

            <div className="
              border-b
              border-white/10
              px-6
              py-5
            ">

              <div className="
                inline-flex
                rounded-full
                bg-white/10
                px-4
                py-2
                text-sm
                text-white/70
              ">
                BEFORE
              </div>

            </div>

            <div className="relative aspect-[9/16] bg-black">

              <video
                autoPlay
                muted
                loop
                playsInline
                className="
                  h-full
                  w-full
                  object-cover
                  grayscale
                  brightness-50
                  contrast-75
                  blur-[1px]
                "
              >
                <source src="/demo-reel.mp4" type="video/mp4" />
              </video>

              {/* Overlay */}
              <div className="
                absolute
                inset-0
                bg-black/30
              " />

              {/* Label */}
              <div className="
                absolute
                bottom-4
                left-4
                rounded-full
                bg-black/60
                px-4
                py-2
                text-sm
                text-white/70
              ">
                Raw mobile reel
              </div>

            </div>

            <div className="p-6 text-white/50 leading-7">
              Low lighting, weak pacing and unoptimized
              visuals reduce engagement and perceived value.
            </div>

          </motion.div>

          {/* AFTER */}
          <motion.div
            whileHover={{ y: -8 }}
            className="
              overflow-hidden
              rounded-3xl
              border
              border-cyan-500/20
              bg-gradient-to-b
              from-cyan-500/10
              to-white/5
              backdrop-blur-2xl
              shadow-[0_0_50px_rgba(34,211,238,0.12)]
            "
          >

            <div className="
              border-b
              border-white/10
              px-6
              py-5
            ">

              <div className="
                inline-flex
                rounded-full
                bg-cyan-500
                px-4
                py-2
                text-sm
                font-medium
                text-white
              ">
                AFTER
              </div>

            </div>

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
                bg-cyan-500
                px-4
                py-2
                text-sm
                font-medium
                text-white
              ">
                Enhanced by Metaprom AI
              </div>

            </div>

            <div className="p-6 text-white/70 leading-7">
              AI-enhanced cinematic reel optimized for
              branding, engagement and premium presentation.
            </div>

          </motion.div>

        </div>

      </div>

    </section>
  );
}