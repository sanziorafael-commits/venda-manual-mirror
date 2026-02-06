import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  images: {
    remotePatterns: [
      // Fundo de páginas públicas
      // { protocol: "https", hostname: "picsum.photos" },
    ],
  },
};

export default nextConfig;
