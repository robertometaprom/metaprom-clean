import AuthButton from "@/components/AuthButton";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 w-full z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto">
        <div
          className="
            relative
            flex
            items-center
            justify-between
            rounded-3xl
            border
            border-white/10
            bg-black/40
            px-8
            py-4
            backdrop-blur-2xl
            shadow-[0_0_40px_rgba(168,85,247,0.08)]
          "
        >
          <div
            className="
              absolute
              inset-0
              rounded-3xl
              bg-gradient-to-r
              from-purple-500/5
              via-cyan-500/5
              to-purple-500/5
              pointer-events-none
            "
          />

          <div className="relative z-10 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-cyan-500" />

            <div className="flex flex-col">
              <span
                className="
                  text-2xl
                  font-semibold
                  tracking-tight
                  text-white
                "
              >
                Metaprom AI
              </span>

              <span className="text-xs text-white/50">For Ecommerce</span>
            </div>
          </div>

          <div
            className="
              hidden
              md:flex
              items-center
              gap-8
              text-white/70
              text-base
            "
          >
            <a href="#features" className="transition hover:text-white">
              Funciones
            </a>

            <a href="#examples" className="transition hover:text-white">
              Ejemplos
            </a>

            <a href="#projects" className="transition hover:text-white">
              Mis proyectos
            </a>
          </div>

          <div className="relative z-10">
            <AuthButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
