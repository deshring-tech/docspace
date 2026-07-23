import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // All document processing happens in the browser — no server runtime config
  // is needed. Kept minimal on purpose.
  reactStrictMode: true,
  // Dev and prod use separate build dirs so a `next dev` session can never
  // corrupt the production build that Start-DocSpace.bat serves.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
};

export default nextConfig;
