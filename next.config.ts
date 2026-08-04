import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp", "ffmpeg-static"],
};

export default nextConfig;
