import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@aws-sdk/client-s3"],
};

export default nextConfig;
