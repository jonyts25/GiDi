import type { NextConfig } from "next";
import { PUBLIC_API_FALLBACK } from "./lib/get-api-base-url";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? PUBLIC_API_FALLBACK,
    NEXT_PUBLIC_API_BASE_URL:
      process.env.NEXT_PUBLIC_API_BASE_URL ?? PUBLIC_API_FALLBACK,
  },
};

export default nextConfig;
