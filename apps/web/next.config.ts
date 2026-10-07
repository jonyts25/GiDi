import type { NextConfig } from "next";
import { PUBLIC_API_FALLBACK } from "./lib/get-api-base-url";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? PUBLIC_API_FALLBACK,
    NEXT_PUBLIC_API_BASE_URL:
      process.env.NEXT_PUBLIC_API_BASE_URL ?? PUBLIC_API_FALLBACK,
  },
  async headers() {
    return [
      {
        source: "/((?!_next/static).*)",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
    ];
  },
};

export default nextConfig;
