// @ts-check
const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: process.env.NEXT_PUBLIC_IGNORE_BUILD_ERROR === "true",
  },
  serverExternalPackages: ["@x402/core", "@x402/evm", "@x402/svm", "@coinbase/cdp-sdk"],
  turbopack: {
    // En un monorepo, Turbopack detecta la raíz buscando el lockfile más cercano.
    // Como next.config.js está en packages/nextjs, apuntamos explícitamente
    // a la raíz del monorepo donde vive pnpm-lock.yaml.
    root: path.join(__dirname, "../.."),
  },
};

module.exports = nextConfig;
