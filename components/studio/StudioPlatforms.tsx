import PlatformLogo from "@/components/studio/PlatformLogo";
import { PLATFORM_CARDS } from "@/lib/studio-atmosphere";

export default function StudioPlatforms() {
  return (
    <section className="mx-auto mt-16 max-w-4xl px-6 pb-8 text-center">
      <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
        Publica en{" "}
        <span className="bg-gradient-to-r from-violet-600 to-purple-500 bg-clip-text text-transparent">
          cualquier
        </span>{" "}
        plataforma
      </h2>

      <div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-6 sm:gap-4">
        {PLATFORM_CARDS.map((platform) => (
          <div
            key={platform.id}
            className="flex flex-col items-center gap-2 rounded-2xl border border-neutral-200/80 bg-white px-2 py-4 shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center text-neutral-700">
              <PlatformLogo platform={platform.id} />
            </div>
            <span className="text-[11px] font-medium leading-tight text-neutral-500">
              {platform.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
