// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: process.env.NEXT_PUBLIC_IGNORE_BUILD_ERROR === "true",
  },
  serverExternalPackages: ["@x402/core", "@x402/evm", "@x402/svm", "@coinbase/cdp-sdk"],
  turbopack: {},
};

module.exports = nextConfig;
