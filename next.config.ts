import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/CourierIQ",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
