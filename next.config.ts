import type { NextConfig } from "next";

const r2PublicUrl = process.env.R2_PUBLIC_URL ?? process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
const r2Host = r2PublicUrl ? new URL(r2PublicUrl).hostname : null;

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      { pathname: "/icon-main.png" },
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      ...(r2Host
        ? [{ protocol: "https" as const, hostname: r2Host, pathname: "/**" as const }]
        : []),
    ],
  },
};

export default nextConfig;
