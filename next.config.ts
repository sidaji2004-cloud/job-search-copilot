import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "@react-pdf/renderer"],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
