import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.prestocks.com",
        pathname: "/logos/**",
      },
    ],
  },
};

export default nextConfig;
