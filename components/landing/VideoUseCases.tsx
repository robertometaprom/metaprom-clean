import { GTM5_VIDEO_PLATFORM_IDS } from "@/lib/gtm5";
import type { LandingContent } from "@/lib/i18n";
import { VIDEO_PLATFORM_MARKS } from "@/lib/platform-marks";
import PlatformMark from "@/components/landing/PlatformMark";

type VideoUseCasesProps = {
  copy: LandingContent["videoUseCases"];
};

export default function VideoUseCases({ copy }: VideoUseCasesProps) {
  return (
    <section
      id="commercials"
      className="border-t border-white/5"
      aria-labelledby="commercials-heading"
    >
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-36">
        <div className="rounded-sm border border-white/10 bg-[linear-gradient(180deg,rgba(245,245,240,0.04),rgba(245,245,240,0.01))] px-5 py-12 md:px-12 md:py-16">
          <h2
            id="commercials-heading"
            className="max-w-3xl text-3xl font-bold tracking-tight text-[#F5F5F0] md:text-5xl"
          >
            {copy.headline}
          </h2>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-white/60 md:text-xl">
            {copy.copy}
          </p>

          <ul className="mt-12 grid grid-cols-2 gap-3 md:mt-16 md:grid-cols-4 md:gap-5">
            {GTM5_VIDEO_PLATFORM_IDS.map((id) => {
              const mark = VIDEO_PLATFORM_MARKS[id];
              const name = copy.platforms[id];
              return (
                <li
                  key={id}
                  className="flex min-h-28 min-w-0 flex-col items-center justify-center rounded-sm border border-white/10 bg-black/40 px-4 py-5 md:min-h-40 md:px-6 md:py-6"
                >
                  <PlatformMark
                    mark={mark}
                    name={name}
                    className="h-10 w-auto max-w-full md:h-12"
                  />
                </li>
              );
            })}
          </ul>

          <p className="mt-10 text-sm text-white/40 md:text-base">
            {copy.publishNote}
          </p>
        </div>
      </div>
    </section>
  );
}
