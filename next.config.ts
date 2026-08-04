import type { NextConfig } from "next";

// Force a build-time string so Turbopack inlines the client flag.
// Runtime-only `vercel deploy -e` is NOT enough for the browser bundle.
const revealVideoProbeFlag =
  process.env.NEXT_PUBLIC_REVEAL_VIDEO_PROBE === "1" ||
  process.env.NEXT_PUBLIC_REVEAL_VIDEO_PROBE === "true"
    ? "1"
    : process.env.NEXT_PUBLIC_REVEAL_VIDEO_PROBE === "0" ||
        process.env.NEXT_PUBLIC_REVEAL_VIDEO_PROBE === "false"
      ? "0"
      : (process.env.NEXT_PUBLIC_REVEAL_VIDEO_PROBE ?? "1");

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp", "ffmpeg-static"],
  env: {
    NEXT_PUBLIC_REVEAL_VIDEO_PROBE: revealVideoProbeFlag,
    // Surface the serving deployment on the debug page (build-time).
    NEXT_PUBLIC_VERCEL_DEPLOYMENT_ID: process.env.VERCEL_DEPLOYMENT_ID ?? "",
  },
};

export default nextConfig;
