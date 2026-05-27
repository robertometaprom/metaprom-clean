"use client";

import { motion } from "framer-motion";

export default function Pricing() {
  return (
    <section
      id="pricing"
      className="relative py-32 px-6 overflow-hidden"
    >

      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden">

        <div className="
          absolute
          left-1/2
          top-1/2
          h-[700px]
          w-[700px]
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
            border-purple-500/20
            bg-purple-500/10
            px-4
            py-2
            text-sm
            text-purple-300
          ">
            Pricing
          </div>

          <h2 className="
            text-6xl
            font-bold
            tracking-tight
            text-white
          ">
            Simple pricing.
            <br />

            <span className="
              bg-gradient-to-r
              from-purple-300
              to-cyan-400
              bg-clip-text
              text-transparent
            ">
              Built to scale.
            </span>

          </h2>

          <p className="
            mx-auto
            mt-8
            max-w-2xl
            text-xl
            leading-8
            text-white/60
          ">
            Start free and upgrade when your campaigns
            start generating serious results.
          </p>

        </motion.div>

        {/* Cards */}
        <div className="
          mt-24
          grid
          gap-8
          lg:grid-cols-3
        ">

          {/* STARTER */}
          <motion.div
            whileHover={{ y: -10 }}
            className="
              rounded-3xl
              border
              border-white/10
              bg-white/5
              p-10
              backdrop-blur-xl
            "
          >

            <div className="text-white/60 text-lg">
              Starter
            </div>

            <div className="mt-6 text-6xl font-bold text-white">
              Free
            </div>

            <p className="mt-6 text-white/60 leading-8">
              Perfect for testing AI campaigns and exploring the platform.
            </p>

            <div className="mt-10 space-y-4 text-white/70">

              <div>✓ 20 AI generations</div>
              <div>✓ Basic templates</div>
              <div>✓ Social captions</div>

            </div>

            <button className="
              mt-12
              w-full
              rounded-2xl
              border
              border-white/10
              bg-white/5
              py-4
              text-white
              transition
              hover:bg-white/10
            ">
              Start Free
            </button>

          </motion.div>

          {/* PRO */}
          <motion.div
            whileHover={{ y: -10 }}
            className="
              relative
              scale-105
              rounded-3xl
              border
              border-purple-500/30
              bg-gradient-to-b
              from-purple-500/20
              to-white/5
              p-10
              backdrop-blur-xl
              shadow-[0_0_50px_rgba(168,85,247,0.2)]
            "
          >

            {/* Badge */}
            <div className="
              absolute
              right-6
              top-6
              rounded-full
              bg-purple-500
              px-4
              py-1
              text-sm
              font-medium
              text-white
            ">
              MOST POPULAR
            </div>

            <div className="text-purple-300 text-lg">
              Pro
            </div>

            <div className="mt-6 flex items-end gap-2">

              <div className="text-7xl font-bold text-white">
                $29
              </div>

              <div className="pb-3 text-white/50">
                /month
              </div>

            </div>

            <p className="mt-6 text-white/70 leading-8">
              For brands and creators scaling high-performing campaigns.
            </p>

            <div className="mt-10 space-y-4 text-white/80">

              <div>✓ Unlimited AI generations</div>
              <div>✓ AI image creation</div>
              <div>✓ Viral video scripts</div>
              <div>✓ Export tools</div>
              <div>✓ Advanced analytics</div>

            </div>

            <button className="
              mt-12
              w-full
              rounded-2xl
              bg-gradient-to-r
              from-cyan-500
              to-blue-600
              py-4
              font-medium
              text-white
              shadow-[0_0_30px_rgba(59,130,246,0.35)]
              transition
              hover:scale-[1.02]
            ">
              Upgrade Now
            </button>

          </motion.div>

          {/* ENTERPRISE */}
          <motion.div
            whileHover={{ y: -10 }}
            className="
              rounded-3xl
              border
              border-white/10
              bg-white/5
              p-10
              backdrop-blur-xl
            "
          >

            <div className="text-white/60 text-lg">
              Enterprise
            </div>

            <div className="mt-6 text-6xl font-bold text-white">
              Custom
            </div>

            <p className="mt-6 text-white/60 leading-8">
              Advanced workflows, integrations and automation at scale.
            </p>

            <div className="mt-10 space-y-4 text-white/70">

              <div>✓ Dedicated onboarding</div>
              <div>✓ API access</div>
              <div>✓ Custom automation</div>
              <div>✓ Team collaboration</div>
              <div>✓ Priority support</div>

            </div>

            <button className="
              mt-12
              w-full
              rounded-2xl
              border
              border-white/10
              bg-white/5
              py-4
              text-white
              transition
              hover:bg-white/10
            ">
              Contact Sales
            </button>

          </motion.div>

        </div>

      </div>

    </section>
  );
}