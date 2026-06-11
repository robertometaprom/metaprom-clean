"use client";

import { motion } from "framer-motion";

export default function PhotoEnhancement() {
  return (
  <section className="relative overflow-hidden px-6 pt-52 pb-24">

      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="
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
          "
        />
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

          <div
            className="
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
            "
          >
            Optimizado para Amazon, Mercado Libre y Shopify
          </div>

          <h1
            className="
              text-5xl
              font-bold
              tracking-tight
              text-white
              md:text-7xl
            "
          >
            Convierte fotos normales
            <br />

            <span
              className="
                bg-gradient-to-r
                from-purple-300
                to-cyan-400
                bg-clip-text
                text-transparent
              "
            >
              en imágenes profesionales para vender.
            </span>

          </h1>

          <p
            className="
              mx-auto
              mt-8
              max-w-4xl
              text-lg
              leading-8
              text-white/60
              md:text-xl
            "
          >
            Transforma fotografías tomadas con celular en imágenes listas para
            Amazon, Mercado Libre, Shopify y cualquier tienda online en segundos.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-white/50 text-sm md:text-base">

            <span>Amazon</span>

            <span>•</span>

            <span>Mercado Libre</span>

            <span>•</span>

            <span>Shopify</span>

          </div>

        </motion.div>

        {/* BEFORE AFTER */}
        <div
          className="
            mt-24
            grid
            gap-10
            lg:grid-cols-2
          "
        >

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

            <div
              className="
                border-b
                border-white/10
                px-6
                py-5
              "
            >

              <div
                className="
                  inline-flex
                  rounded-full
                  bg-white/10
                  px-4
                  py-2
                  text-sm
                  text-white/70
                "
              >
                ANTES
              </div>

            </div>

            <div className="relative aspect-[4/3] bg-black">

              <img
                src="/chocolate-before.jpeg"
                alt="Antes"
                className="h-full w-full object-contain"
              />

            </div>

            <div className="p-6 leading-7 text-white/50">
              Fotografía tomada con celular, sin edición y sin preparación para ecommerce.
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

            <div
              className="
                border-b
                border-white/10
                px-6
                py-5
              "
            >

              <div
                className="
                  inline-flex
                  rounded-full
                  bg-cyan-500
                  px-4
                  py-2
                  text-sm
                  font-medium
                  text-white
                "
              >
                DESPUÉS
              </div>

            </div>

            <div className="relative aspect-[4/3] bg-black">

              <img
                src="/chocolate-after.png"
                alt="Después"
                className="h-full w-full object-cover"
              />

              <div
                className="
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
                "
              >
                Mejorado con Metaprom AI
              </div>

            </div>

            <div className="p-6 leading-7 text-white/70">
              Imagen optimizada con Metaprom AI. Fondo blanco profesional,
              iluminación de estudio, sombras suaves y apariencia premium lista
              para ecommerce.
            </div>

          </motion.div>

        </div>

      </div>

    </section>
  );
}