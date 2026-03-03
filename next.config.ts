import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Providing a webpack config forces Next.js to use Webpack instead of Turbopack
  webpack: (config) => config,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.fbcdn.net",
      },
      {
        protocol: "https",
        hostname: "**.cdninstagram.com",
      },
    ],
  },
};

export default nextConfig;
