"use client";

import { motion } from "framer-motion";

export default function PhotoEnhancement() {
return ( <section className="relative overflow-hidden px-6 py-32">

```
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
        border-purple-500/20
        bg-purple-500/10
        px-4
        py-2
        text-sm
        text-purple-300
      ">
        Fotografía para Ecommerce
      </div>

      <h2 className="
        text-6xl
        font-bold
        tracking-tight
        text-white
      ">
        Las malas fotos
        <br />

        <span className="
          bg-gradient-to-r
          from-purple-300
          to-cyan-400
          bg-clip-text
          text-transparent
        ">
          reducen ventas.
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
        Mejora fotografías de productos para Mercado Libre,
        Amazon y ecommerce sin fotógrafos, estudios ni
        software complicado.
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
            ANTES
          </div>

        </div>

        <div className="relative aspect-[4/3] bg-black">

          <img
            src="/before-room.jpg"
            alt="Antes"
            className="
              h-full
              w-full
              object-cover
            "
          />

        </div>

        <div className="p-6 text-white/50 leading-7">
          Imagen original sin optimización visual ni
          preparación para marketplaces o ecommerce.
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
            DESPUÉS
          </div>

        </div>

        <div className="relative aspect-[4/3] bg-black">

          <img
            src="/after-room.png"
            alt="Después"
            className="
              h-full
              w-full
              object-cover
            "
          />

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
            Mejorado con Metaprom AI
          </div>

        </div>

        <div className="p-6 text-white/70 leading-7">
          Imagen optimizada con IA para una presentación
          más profesional y orientada a generar confianza
          y conversiones.
        </div>

      </motion.div>

    </div>

  </div>

</section>
```

);
}
