export default function DashboardPage() {
return ( <main className="min-h-screen bg-black text-white p-10"> <div className="mx-auto max-w-6xl">


    <h1 className="text-5xl font-bold">
      Metaprom AI Dashboard
    </h1>

    <p className="mt-4 text-white/60">
      Convierte fotos normales en imágenes profesionales para vender.
    </p>

    {/* Créditos */}
    <div className="mt-10 rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-6">
      <div className="text-sm text-white/50">
        CRÉDITOS BETA
      </div>

      <div className="mt-2 text-4xl font-bold text-cyan-300">
        20
      </div>
    </div>

    {/* Destino */}
    <div className="mt-12">
      <h2 className="text-3xl font-semibold">
        ¿Dónde vas a vender?
      </h2>

      <div className="mt-6 grid gap-4 md:grid-cols-5">

        <button className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:bg-white/10">
          Amazon
        </button>

        <button className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:bg-white/10">
          Mercado Libre
        </button>

        <button className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:bg-white/10">
          Shopify
        </button>

        <button className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:bg-white/10">
          Instagram
        </button>

        <button className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:bg-white/10">
          Personalizado
        </button>

      </div>
    </div>

    {/* Upload */}
    <div className="mt-12 rounded-3xl border border-white/10 bg-white/5 p-8">

      <h2 className="text-3xl font-semibold">
        Subir Imagen
      </h2>

      <p className="mt-3 text-white/50">
        Selecciona una fotografía para mejorar con Metaprom AI.
      </p>

      <button className="mt-6 rounded-2xl border border-white/10 bg-white/10 px-6 py-4 transition hover:bg-white/20">
        Seleccionar Imagen
      </button>

    </div>

    {/* Historial */}
    <div className="mt-12 rounded-3xl border border-white/10 bg-white/5 p-8">

      <h2 className="text-3xl font-semibold">
        Mis Trabajos
      </h2>

      <p className="mt-4 text-white/50">
        Aún no tienes proyectos generados.
      </p>

    </div>

  </div>
</main>


);
}
