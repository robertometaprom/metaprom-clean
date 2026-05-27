export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 w-full z-50 px-6 py-6">

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
            py-5
            backdrop-blur-2xl
            shadow-[0_0_40px_rgba(168,85,247,0.08)]
          "
        >

          {/* Glow */}
          <div className="
            absolute
            inset-0
            rounded-3xl
            bg-gradient-to-r
            from-purple-500/5
            via-cyan-500/5
            to-purple-500/5
            pointer-events-none
          " />

          {/* LEFT */}
          <div className="relative z-10 flex items-center gap-4">

            <img
              src="/logo.png"
              alt="Metaprom AI"
              className="
                w-20
                h-20
                object-contain
                drop-shadow-[0_0_25px_rgba(168,85,247,0.45)]
              "
            />

            <span className="
              text-3xl
              font-semibold
              tracking-tight
              text-white
            ">
              Metaprom AI
            </span>

          </div>

          {/* CENTER */}
          <div className="
            hidden
            md:flex
            items-center
            gap-10
            text-white/70
            text-lg
          ">

            <a
              href="#features"
              className="transition hover:text-white"
            >
              Features
            </a>

            <a
              href="#pricing"
              className="transition hover:text-white"
            >
              Pricing
            </a>

            <a
              href="#dashboard"
              className="transition hover:text-white"
            >
              Dashboard
            </a>

          </div>

          {/* RIGHT */}
          <div className="relative z-10 flex items-center gap-5">

            <button className="
              text-lg
              text-white/70
              transition
              hover:text-white
            ">
              Login
            </button>

            <button
              className="
                rounded-2xl
                bg-gradient-to-r
                from-cyan-500
                to-blue-600
                px-7
                py-3
                text-lg
                font-medium
                text-white
                shadow-[0_0_30px_rgba(59,130,246,0.35)]
                transition
                hover:scale-105
              "
            >
              Get Started
            </button>

          </div>

        </div>

      </div>

    </nav>
  );
}